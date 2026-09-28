-- Claim and acknowledge notification email without exposing addresses to clients.
alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check
  check(status in ('queued','processing','failed','sent','dead'));
alter table public.email_outbox
  add column available_at timestamptz not null default now(),
  add column locked_until timestamptz,
  add column processing_token uuid,
  add column provider_message_id text,
  add column updated_at timestamptz not null default now();
create index email_outbox_ready_idx on public.email_outbox(available_at,created_at)
  where status in ('queued','failed','processing');

create function public.claim_notification_emails(p_limit int default 20)
returns table(
  outbox_id uuid,
  claim_token uuid,
  recipient_email text,
  title_ar text,
  title_en text,
  body_ar text,
  body_en text
) language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception 'Invalid batch size';
  end if;
  return query
  with ready as (
    select e.id
    from public.email_outbox e
    join auth.users u on u.id=e.user_id
    where e.attempts<5
      and nullif(trim(u.email),'') is not null
      and (
        (e.status in ('queued','failed') and e.available_at<=now())
        or (e.status='processing' and e.locked_until<now())
      )
    order by e.available_at,e.created_at
    for update of e skip locked
    limit p_limit
  ), claimed as (
    update public.email_outbox e
       set status='processing',attempts=e.attempts+1,
           processing_token=gen_random_uuid(),
           locked_until=now()+interval '5 minutes',updated_at=now()
      from ready r where e.id=r.id
    returning e.id,e.processing_token,e.notification_id,e.user_id
  )
  select c.id,c.processing_token,u.email::text,n.title_ar,n.title_en,
         coalesce(n.body_ar,''),coalesce(n.body_en,'')
    from claimed c
    join auth.users u on u.id=c.user_id
    join public.notifications n on n.id=c.notification_id;
end$$;

create function public.finish_notification_email(
  p_outbox uuid,p_token uuid,p_success boolean,
  p_provider_message_id text default null,p_error text default null
) returns void language plpgsql security definer set search_path='' as $$
declare v_row public.email_outbox%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'Forbidden'; end if;
  if p_outbox is null or p_token is null or p_success is null then
    raise exception 'Invalid acknowledgement';
  end if;
  select * into v_row from public.email_outbox where id=p_outbox for update;
  if not found or v_row.status<>'processing'
     or v_row.processing_token is distinct from p_token then
    raise exception 'Stale email claim';
  end if;
  if p_success then
    if length(trim(coalesce(p_provider_message_id,'')))<1
       or length(p_provider_message_id)>200 then
      raise exception 'Provider message ID required';
    end if;
    update public.email_outbox
      set status='sent',sent_at=now(),provider_message_id=p_provider_message_id,
          last_error=null,processing_token=null,locked_until=null,updated_at=now()
      where id=p_outbox;
  else
    update public.email_outbox
      set status=case when attempts>=5 then 'dead' else 'failed' end,
          available_at=now()+make_interval(mins=>least(power(2,attempts)::int,60)),
          last_error=left(coalesce(p_error,'Delivery failed'),500),
          processing_token=null,locked_until=null,updated_at=now()
      where id=p_outbox;
  end if;
end$$;

revoke all on function public.claim_notification_emails(int) from public,anon,authenticated;
revoke all on function public.finish_notification_email(uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_notification_emails(int) to service_role;
grant execute on function public.finish_notification_email(uuid,uuid,boolean,text,text) to service_role;
