-- All money is settled in EGP. Event identity and settlement transitions are
-- enforced in the database, including retries from a provider.
alter table public.payments add column currency_code text not null default 'EGP'
  check (currency_code = 'EGP');
alter table public.payments add column checkout_url text
  check (checkout_url is null or checkout_url ~ '^https://[^[:space:]]+$');
alter table public.refund_requests add column currency_code text not null default 'EGP'
  check (currency_code = 'EGP');
alter table public.refund_requests alter column return_id drop not null;
alter table public.refund_requests add column reservation_id uuid references public.motorcycle_reservations;
alter table public.refund_requests add constraint refund_one_source
  check (num_nonnulls(return_id,reservation_id)=1);
create unique index refund_one_reservation on public.refund_requests(reservation_id)
  where reservation_id is not null;
create policy refund_reservation_read on public.refund_requests for select to authenticated
  using (reservation_id is not null and exists (
    select 1 from public.motorcycle_reservations r where r.id=reservation_id
    and (r.user_id=auth.uid() or public.has_permission('payments.read'))
  ));

create table public.refund_events (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.refund_requests,
  provider_event_id text not null unique check (length(provider_event_id) between 5 and 255),
  provider_reference text not null check (length(provider_reference) between 1 and 255),
  event_type text not null check (event_type in ('pending','succeeded','failed')),
  amount_egp numeric(12,2) not null check (amount_egp>0),
  currency_code text not null check (currency_code='EGP'),
  created_at timestamptz not null default now()
);
create index refund_events_refund_idx on public.refund_events(refund_id,created_at);
alter table public.refund_events enable row level security;
create policy refund_events_read on public.refund_events for select to authenticated
  using (exists (
    select 1 from public.refund_requests rr join public.payments p on p.id=rr.payment_id
    where rr.id=refund_id and (p.user_id=auth.uid() or public.has_permission('payments.read'))
  ));
revoke insert,update,delete on public.refund_events from anon,authenticated;

create function public.prevent_financial_event_mutation() returns trigger
language plpgsql set search_path=public as $$
begin
  raise exception 'Financial events are immutable';
end$$;
create trigger payment_events_immutable before update or delete on public.payment_events
  for each row execute function public.prevent_financial_event_mutation();
create trigger refund_events_immutable before update or delete on public.refund_events
  for each row execute function public.prevent_financial_event_mutation();

drop function public.record_payment_event(uuid,text,text,numeric,text);
create function public.record_payment_event(
  p_payment uuid,p_event_id text,p_reference text,p_amount numeric,p_status text,
  p_currency text default 'EGP'
) returns void language plpgsql security definer set search_path=public as $$
declare v_payment public.payments%rowtype;v_existing public.payment_events%rowtype;
begin
  if p_status not in ('authorized','captured','failed','cancelled') then raise exception 'Invalid payment status';end if;
  if p_event_id is null or length(p_event_id) not between 5 and 255 then raise exception 'Invalid event ID';end if;
  if p_reference is null or length(p_reference) not between 1 and 255 then raise exception 'Invalid reference';end if;
  select * into v_payment from public.payments where id=p_payment for update;
  if not found then raise exception 'Payment not found';end if;
  if p_currency is distinct from v_payment.currency_code then raise exception 'Currency mismatch';end if;
  if p_amount is distinct from v_payment.amount_egp then raise exception 'Amount mismatch';end if;
  if v_payment.provider_reference is not null and v_payment.provider_reference<>p_reference then raise exception 'Reference mismatch';end if;
  select * into v_existing from public.payment_events where provider_event_id=p_event_id;
  if found then
    if v_existing.payment_id=p_payment and v_existing.event_type=p_status
      and v_existing.payload->>'reference'=p_reference
      and (v_existing.payload->>'amount_egp')::numeric=p_amount then return;end if;
    raise exception 'Event ID conflict';
  end if;
  if v_payment.status='captured' then raise exception 'Captured payment cannot regress';end if;
  if v_payment.status in ('failed','cancelled','refunded','partially_refunded') then raise exception 'Payment is closed';end if;
  if p_status='authorized' and v_payment.order_id is not null and not exists(
    select 1 from public.orders where id=v_payment.order_id and status='pending_payment'
  ) then raise exception 'Order is not awaiting payment';end if;
  if p_status='authorized' and v_payment.reservation_id is not null and not exists(
    select 1 from public.motorcycle_reservations where id=v_payment.reservation_id and status='awaiting_payment'
  ) then raise exception 'Reservation is not awaiting payment';end if;
  if p_status='captured' and v_payment.order_id is not null and not exists(
    select 1 from public.orders where id=v_payment.order_id and status='pending_payment'
  ) then raise exception 'Order is not awaiting payment';end if;
  if p_status='captured' and v_payment.reservation_id is not null and not exists(
    select 1 from public.motorcycle_reservations where id=v_payment.reservation_id and status='awaiting_payment'
  ) then raise exception 'Reservation is not awaiting payment';end if;
  insert into public.payment_events(payment_id,event_type,provider_event_id,payload)
    values(p_payment,p_status,p_event_id,jsonb_build_object('reference',p_reference,'amount_egp',p_amount,'currency',p_currency));
  update public.payments set status=p_status,provider_reference=coalesce(provider_reference,p_reference)
    where id=p_payment;
  if p_status='captured' then
    if v_payment.order_id is not null then
      update public.orders set status='paid' where id=v_payment.order_id;
      insert into public.order_history(order_id,status) values(v_payment.order_id,'paid');
      insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
        values(v_payment.user_id,'تم تأكيد الدفع','Payment confirmed','تم تأكيد دفع طلبك.','Your order payment was confirmed.');
    else
      update public.motorcycle_reservations set status='deposit_paid' where id=v_payment.reservation_id;
      insert into public.reservation_history(reservation_id,status) values(v_payment.reservation_id,'deposit_paid');
      insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
        values(v_payment.user_id,'تم استلام العربون','Deposit received','تم تأكيد عربون الحجز.','Your reservation deposit was confirmed.');
    end if;
  elsif p_status in ('failed','cancelled') then
    if v_payment.order_id is not null then
      perform public.cancel_unpaid_order(v_payment.order_id);
    else
      update public.motorcycle_reservations set status='cancelled'
        where id=v_payment.reservation_id and status='awaiting_payment';
      if found then
        update public.motorcycles set availability='available'
          where id=(select motorcycle_id from public.motorcycle_reservations where id=v_payment.reservation_id);
        insert into public.reservation_history(reservation_id,status)
          values(v_payment.reservation_id,'cancelled');
        insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
          values(v_payment.user_id,'تعذر دفع العربون','Deposit payment failed','تعذر إتمام الدفع وأُلغي الحجز.','Payment failed and your reservation was cancelled.');
      end if;
    end if;
  end if;
end$$;
revoke all on function public.record_payment_event(uuid,text,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.record_payment_event(uuid,text,text,numeric,text,text) to service_role;

create function public.record_refund_event(
  p_refund uuid,p_event_id text,p_reference text,p_amount numeric,p_currency text,p_status text
) returns void language plpgsql security definer set search_path=public as $$
declare v_refund public.refund_requests%rowtype;v_payment public.payments%rowtype;
  v_existing public.refund_events%rowtype;v_settled numeric;
begin
  if p_status not in ('pending','succeeded','failed') then raise exception 'Invalid refund status';end if;
  if p_event_id is null or length(p_event_id) not between 5 and 255 then raise exception 'Invalid event ID';end if;
  if p_reference is null or length(p_reference) not between 1 and 255 then raise exception 'Invalid reference';end if;
  select * into v_refund from public.refund_requests where id=p_refund for update;
  if not found then raise exception 'Refund not found';end if;
  select * into v_payment from public.payments where id=v_refund.payment_id for update;
  if p_currency is distinct from v_refund.currency_code or p_currency is distinct from v_payment.currency_code then raise exception 'Currency mismatch';end if;
  if p_amount is distinct from v_refund.amount_egp then raise exception 'Amount mismatch';end if;
  if v_payment.status not in ('captured','partially_refunded','refunded') then raise exception 'Captured payment required';end if;
  if v_refund.provider_reference is not null and v_refund.provider_reference<>p_reference then raise exception 'Reference mismatch';end if;
  select * into v_existing from public.refund_events where provider_event_id=p_event_id;
  if found then
    if v_existing.refund_id=p_refund and v_existing.event_type=p_status
      and v_existing.provider_reference=p_reference and v_existing.amount_egp=p_amount
      and v_existing.currency_code=p_currency then return;end if;
    raise exception 'Event ID conflict';
  end if;
  if v_refund.status in ('succeeded','failed') then raise exception 'Refund is closed';end if;
  if p_status='succeeded' then
    select coalesce(sum(amount_egp),0) into v_settled from public.refund_requests
      where payment_id=v_payment.id and status='succeeded';
    if v_settled+p_amount>v_payment.amount_egp then raise exception 'Refund exceeds captured amount';end if;
  end if;
  insert into public.refund_events(refund_id,provider_event_id,provider_reference,event_type,amount_egp,currency_code)
    values(p_refund,p_event_id,p_reference,p_status,p_amount,p_currency);
  update public.refund_requests set status=p_status,provider_reference=coalesce(provider_reference,p_reference),updated_at=now()
    where id=p_refund;
  if p_status='succeeded' then
    update public.payments set status=case when v_settled+p_amount=v_payment.amount_egp
      then 'refunded' else 'partially_refunded' end where id=v_payment.id;
    if v_refund.return_id is not null then
      update public.return_requests set status='refunded',updated_at=now() where id=v_refund.return_id and status='refund_pending';
      if not found then raise exception 'Return is not awaiting refund';end if;
      insert into public.return_history(return_id,from_status,to_status,note)
        values(v_refund.return_id,'refund_pending','refunded','Provider refund verified');
    else
      update public.motorcycle_reservations set status='refunded' where id=v_refund.reservation_id and status='cancelled';
      if not found then raise exception 'Reservation is not awaiting refund';end if;
      insert into public.reservation_history(reservation_id,status) values(v_refund.reservation_id,'refunded');
    end if;
    insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
      values(v_payment.user_id,'تم رد المبلغ','Refund completed','تم تأكيد رد المبلغ.','Your refund was confirmed.');
  end if;
  insert into public.audit_logs(action,entity,entity_id,detail) values
    ('refund.event','refund_requests',p_refund,jsonb_build_object('status',p_status,'event_id',p_event_id,'amount_egp',p_amount));
end$$;
revoke all on function public.record_refund_event(uuid,text,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.record_refund_event(uuid,text,text,numeric,text,text) to service_role;

create function public.retry_failed_refund(p_refund uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_refund public.refund_requests%rowtype;
begin
  if not public.has_permission('payments.read') then raise exception 'Forbidden';end if;
  select * into v_refund from public.refund_requests where id=p_refund for update;
  if not found then raise exception 'Refund not found';end if;
  if (v_refund.return_id is not null and not public.has_permission('orders.write'))
    or (v_refund.reservation_id is not null and not public.has_permission('reservations.write'))
    then raise exception 'Forbidden';end if;
  if v_refund.status<>'failed' then raise exception 'Only failed refunds may be retried';end if;
  if (select count(*) from public.refund_events where refund_id=p_refund and event_type='failed')>=5
    then raise exception 'Refund retry limit reached';end if;
  update public.refund_requests set status='provider_required',provider_reference=null,updated_at=now()
    where id=p_refund;
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'refund.retry','refund_requests',p_refund,'{}'::jsonb);
end$$;
revoke all on function public.retry_failed_refund(uuid) from public,anon;
grant execute on function public.retry_failed_refund(uuid) to authenticated;

create or replace function public.advance_return(
  p_return uuid,p_status text,p_admin_notes text default null,p_inspection_notes text default null
) returns void language plpgsql security definer set search_path=public as $$
declare v_case public.return_requests%rowtype;v_payment uuid;v_paid numeric;v_previously_requested numeric;
begin
  if not public.has_permission('orders.write') then raise exception 'Forbidden';end if;
  select * into v_case from public.return_requests where id=p_return for update;
  if not found then raise exception 'Return not found';end if;
  if not ((v_case.status='requested' and p_status='under_review') or
          (v_case.status='under_review' and p_status in ('approved','rejected')) or
          (v_case.status='approved' and p_status='received') or
          (v_case.status='received' and p_status='inspected') or
          (v_case.status='inspected' and p_status='refund_pending') or
          (v_case.status='refunded' and p_status='completed')) then raise exception 'Invalid return transition';end if;
  if length(coalesce(p_admin_notes,''))>2000 or length(coalesce(p_inspection_notes,''))>2000 then raise exception 'Notes too long';end if;
  if p_status='refund_pending' then
    if length(trim(coalesce(p_inspection_notes,v_case.inspection_notes,'')))<5 then raise exception 'Inspection notes required';end if;
    if coalesce(v_case.refund_amount_egp,0)<=0 then raise exception 'Refund amount must be positive';end if;
    select id,amount_egp into v_payment,v_paid from public.payments
      where order_id=v_case.order_id and status in ('captured','partially_refunded')
      order by created_at limit 1 for update;
    if v_payment is null then raise exception 'Captured payment required';end if;
    select coalesce(sum(amount_egp),0) into v_previously_requested from public.refund_requests
      where payment_id=v_payment and status<>'failed';
    if v_previously_requested+v_case.refund_amount_egp>v_paid then raise exception 'Refund would exceed captured payment';end if;
    insert into public.refund_requests(return_id,payment_id,amount_egp)
      values(v_case.id,v_payment,v_case.refund_amount_egp);
  end if;
  update public.return_requests set status=p_status,
    admin_notes=coalesce(nullif(trim(p_admin_notes),''),admin_notes),
    inspection_notes=coalesce(nullif(trim(p_inspection_notes),''),inspection_notes),updated_at=now()
    where id=p_return;
  insert into public.return_history(return_id,from_status,to_status,actor_id,note)
    values(p_return,v_case.status,p_status,auth.uid(),coalesce(p_inspection_notes,p_admin_notes));
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'return.transition','return_requests',p_return,
      jsonb_build_object('from',v_case.status,'to',p_status));
end$$;

create function public.request_reservation_refund(p_reservation uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_res public.motorcycle_reservations%rowtype;v_payment public.payments%rowtype;v_id uuid;
begin
  if not (public.has_permission('reservations.write') and public.has_permission('payments.read')) then raise exception 'Forbidden';end if;
  if length(trim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'Reason required';end if;
  select * into v_res from public.motorcycle_reservations where id=p_reservation for update;
  if not found then raise exception 'Reservation not found';end if;
  if v_res.status not in ('deposit_paid','contacted','appointment_scheduled') then raise exception 'Reservation is not refundable';end if;
  select * into v_payment from public.payments where reservation_id=p_reservation and status='captured' for update;
  if not found then raise exception 'Captured deposit required';end if;
  insert into public.refund_requests(reservation_id,payment_id,amount_egp)
    values(p_reservation,v_payment.id,v_payment.amount_egp) returning id into v_id;
  update public.motorcycle_reservations set status='cancelled' where id=p_reservation;
  update public.motorcycles set availability='available' where id=v_res.motorcycle_id;
  insert into public.reservation_history(reservation_id,status,actor_id)
    values(p_reservation,'cancelled',auth.uid());
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'reservation.refund.request','motorcycle_reservations',p_reservation,
      jsonb_build_object('reason',trim(p_reason),'refund_id',v_id));
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(v_res.user_id,'طلب رد العربون','Deposit refund requested','طلب رد العربون قيد المعالجة.','Your deposit refund is being processed.');
  return v_id;
end$$;
revoke all on function public.request_reservation_refund(uuid,text) from public,anon;
grant execute on function public.request_reservation_refund(uuid,text) to authenticated;

create function public.cancel_unpaid_reservation(p_reservation uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_res public.motorcycle_reservations%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select * into v_res from public.motorcycle_reservations where id=p_reservation and user_id=auth.uid() for update;
  if not found then raise exception 'Reservation not owned';end if;
  if v_res.status not in ('pending','awaiting_payment') then raise exception 'Reservation cannot be cancelled';end if;
  if exists(select 1 from public.payments where reservation_id=p_reservation and status not in ('pending','failed','cancelled'))
    then raise exception 'Payment must be resolved first';end if;
  update public.motorcycle_reservations set status='cancelled' where id=p_reservation;
  update public.motorcycles set availability='available' where id=v_res.motorcycle_id;
  update public.payments set status='cancelled' where reservation_id=p_reservation and status='pending';
  insert into public.reservation_history(reservation_id,status,actor_id) values(p_reservation,'cancelled',auth.uid());
end$$;
revoke all on function public.cancel_unpaid_reservation(uuid) from public,anon;
grant execute on function public.cancel_unpaid_reservation(uuid) to authenticated;

create function public.guard_unpaid_reservation_close() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status in ('cancelled','expired') and old.status in ('pending','awaiting_payment')
    and exists(select 1 from public.payments where reservation_id=old.id and status='authorized')
    then raise exception 'Authorized payment must be resolved first';end if;
  return new;
end$$;
create trigger guard_unpaid_reservation_close before update of status on public.motorcycle_reservations
  for each row execute function public.guard_unpaid_reservation_close();

alter table public.motorcycle_reservations add column expires_at timestamptz;
update public.motorcycle_reservations set expires_at=created_at+interval '48 hours'
  where status in ('pending','awaiting_payment');
alter table public.motorcycle_reservations alter column expires_at set default now()+interval '48 hours';
create index reservation_expiration_idx on public.motorcycle_reservations(expires_at)
  where status in ('pending','awaiting_payment');

create function public.expire_unpaid_reservations(p_limit int default 100)
returns int language plpgsql security definer set search_path=public as $$
declare v_res record;v_count int:=0;
begin
  if p_limit not between 1 and 1000 then raise exception 'Invalid limit';end if;
  for v_res in select id,motorcycle_id,user_id from public.motorcycle_reservations
    where status in ('pending','awaiting_payment') and expires_at<=now()
    order by expires_at,id for update skip locked limit p_limit loop
    if exists(select 1 from public.payments where reservation_id=v_res.id and status='authorized') then continue;end if;
    update public.motorcycle_reservations set status='expired' where id=v_res.id;
    update public.motorcycles set availability='available' where id=v_res.motorcycle_id;
    update public.payments set status='cancelled' where reservation_id=v_res.id and status='pending';
    insert into public.reservation_history(reservation_id,status) values(v_res.id,'expired');
    insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
      values(v_res.user_id,'انتهى الحجز','Reservation expired','انتهت مهلة دفع العربون.','The deposit payment window has ended.');
    v_count:=v_count+1;
  end loop;
  return v_count;
end$$;
revoke all on function public.expire_unpaid_reservations(int) from public,anon,authenticated;
grant execute on function public.expire_unpaid_reservations(int) to service_role;

-- Customers may only change the read marker, never notification content.
drop policy if exists notification_read_update on public.notifications;
revoke update on public.notifications from anon,authenticated;
create function public.set_notification_read(p_notification uuid,p_read boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  update public.notifications set read_at=case when p_read then now() else null end
    where id=p_notification and user_id=auth.uid();
  if not found then raise exception 'Notification not owned';end if;
end$$;
revoke all on function public.set_notification_read(uuid,boolean) from public,anon;
grant execute on function public.set_notification_read(uuid,boolean) to authenticated;

-- Staff managers cannot grant a role or permission that they do not hold.
-- The two platform-wide roles are assignable only by an existing owner.
create or replace function public.admin_assign_staff_role(p_user uuid,p_role text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('staff.write') then raise exception 'Forbidden';end if;
  if p_role in ('owner','super_admin') and not exists(
    select 1 from public.staff_roles where user_id=auth.uid() and role_id='owner'
  ) then raise exception 'Owner authorization required';end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'User not found';end if;
  if not exists(select 1 from public.roles where id=p_role) then raise exception 'Role not found';end if;
  if exists(select 1 from public.role_permissions rp where rp.role_id=p_role
    and not public.has_permission(rp.permission_id)) then raise exception 'Cannot grant permissions beyond your own';end if;
  insert into public.staff_roles(user_id,role_id) values(p_user,p_role) on conflict do nothing;
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'staff.role.assign','staff_roles',p_user,jsonb_build_object('role',p_role));
end$$;

create or replace function public.admin_remove_staff_role(p_user uuid,p_role text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('staff.write') then raise exception 'Forbidden';end if;
  if p_role in ('owner','super_admin') and not exists(
    select 1 from public.staff_roles where user_id=auth.uid() and role_id='owner'
  ) then raise exception 'Owner authorization required';end if;
  if exists(select 1 from public.role_permissions rp where rp.role_id=p_role
    and not public.has_permission(rp.permission_id)) then raise exception 'Cannot manage permissions beyond your own';end if;
  if p_role='owner' then
    perform pg_advisory_xact_lock(hashtext('revora_owner_role'));
    if (select count(*) from public.staff_roles where role_id='owner')<=1 then
      raise exception 'Last owner cannot be removed';end if;
  end if;
  delete from public.staff_roles where user_id=p_user and role_id=p_role;
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'staff.role.remove','staff_roles',p_user,jsonb_build_object('role',p_role));
end$$;

create or replace function public.admin_set_role_permission(
  p_role text,p_permission text,p_enabled boolean
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('staff.write') then raise exception 'Forbidden';end if;
  if p_role in ('owner','super_admin') then raise exception 'Core roles are immutable';end if;
  if not exists(select 1 from public.roles where id=p_role) then raise exception 'Role not found';end if;
  if not exists(select 1 from public.permissions where id=p_permission) then raise exception 'Permission not found';end if;
  if not public.has_permission(p_permission) then raise exception 'Cannot manage permissions beyond your own';end if;
  if p_permission='staff.write' and not exists(
    select 1 from public.staff_roles where user_id=auth.uid() and role_id='owner'
  ) then raise exception 'Owner authorization required';end if;
  if p_enabled then
    insert into public.role_permissions(role_id,permission_id) values(p_role,p_permission) on conflict do nothing;
  else
    delete from public.role_permissions where role_id=p_role and permission_id=p_permission;
  end if;
  insert into public.audit_logs(actor_id,action,entity,detail)
    values(auth.uid(),'staff.permission.update','role_permissions',
      jsonb_build_object('role',p_role,'permission',p_permission,'enabled',p_enabled));
end$$;
