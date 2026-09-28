create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  status text not null default 'queued' check(status in ('queued','sent','failed')),
  attempts int not null default 0 check(attempts>=0),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_outbox_queue_idx on public.email_outbox(status,created_at);
alter table public.email_outbox enable row level security;
create policy email_outbox_staff_read on public.email_outbox for select to authenticated
  using(public.has_permission('content.write'));
revoke all on public.email_outbox from anon,authenticated;
grant select on public.email_outbox to authenticated;
grant select,update on public.email_outbox to service_role;

create function public.enqueue_notification_email() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.email_outbox(notification_id,user_id) values(new.id,new.user_id);
  return new;
end$$;
create trigger enqueue_notification_email after insert on public.notifications
for each row execute function public.enqueue_notification_email();

create function public.notify_order_created() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
  values(new.user_id,'تم إنشاء الطلب','Order created',
    'طلبك مسجل وينتظر تأكيد الدفع.','Your order is recorded and awaits payment confirmation.');
  return new;
end$$;
create trigger order_created_notification after insert on public.orders
for each row execute function public.notify_order_created();

create function public.notify_service_case() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_title_ar text;v_title_en text;v_status text;
begin
  if tg_op='UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
  end if;
  if tg_table_name='return_requests' then
    v_title_ar:='تحديث المرتجع';v_title_en:='Return update';
  else
    v_title_ar:='تحديث الضمان';v_title_en:='Warranty update';
  end if;
  v_status:=new.status;
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(new.user_id,v_title_ar,v_title_en,v_status,v_status);
  return new;
end$$;
create trigger return_case_notification after insert or update of status on public.return_requests
for each row execute function public.notify_service_case();
create trigger warranty_claim_notification after insert or update of status on public.warranty_claims
for each row execute function public.notify_service_case();
