-- Restore the intended hardening without rewriting migrations that may already
-- have been applied to linked environments.

create or replace function public.claim_notification_emails(p_limit int default 20)
returns table(
  outbox_id uuid,
  claim_token uuid,
  recipient_email text,
  title_ar text,
  title_en text,
  body_ar text,
  body_en text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- EXECUTE is granted only to service_role below. This SECURITY DEFINER
  -- function must read auth.users and claim private outbox rows atomically.
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
end
$$;

create or replace function public.finish_notification_email(
  p_outbox uuid,p_token uuid,p_success boolean,
  p_provider_message_id text default null,p_error text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.email_outbox%rowtype;
begin
  -- EXECUTE is granted only to service_role below. Definer rights are needed
  -- for the locked, atomic status transition on the private outbox.
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
end
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; remove inherited and direct
-- access before granting the exact worker role.
revoke all on function public.claim_notification_emails(int)
  from public, anon, authenticated, service_role;
revoke all on function public.finish_notification_email(uuid,uuid,boolean,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_notification_emails(int) to service_role;
grant execute on function public.finish_notification_email(uuid,uuid,boolean,text,text) to service_role;

create or replace function public.record_search_term(p_term text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_term text;v_rows int;
begin
  if auth.uid() is null then return;end if;
  v_term:=lower(regexp_replace(trim(coalesce(p_term,'')),'[[:space:]]+',' ','g'));
  if length(v_term) not between 2 and 80 then return;end if;
  -- Preserve the existing POSIX alphanumeric set and additionally allow only
  -- Arabic letters U+0621..U+063A/U+0641..U+064A and Arabic-Indic digits
  -- U+0660..U+0669. Checking code points avoids locale-dependent ranges.
  if exists (
    select 1
    from regexp_split_to_table(v_term, '') as chars(character_text)
    where chars.character_text !~ '^[[:alnum:] -]$'
      and pg_catalog.ascii(chars.character_text) not between 1569 and 1594
      and pg_catalog.ascii(chars.character_text) not between 1601 and 1610
      and pg_catalog.ascii(chars.character_text) not between 1632 and 1641
  ) then return;end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(auth.uid()::text,0)
  );
  if (select count(*) from public.search_term_daily
      where user_id=auth.uid() and searched_on=current_date)>=30 then
    return;
  end if;
  insert into public.search_terms(term) values(v_term) on conflict(term) do nothing;
  insert into public.search_term_daily(user_id,term)
    values(auth.uid(),v_term) on conflict do nothing;
  get diagnostics v_rows=row_count;
  if v_rows>0 then
    update public.search_terms
      set searches=searches+1,last_searched_at=now() where term=v_term;
  end if;
end
$$;

revoke all on function public.record_search_term(text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_search_term(text) to authenticated;
