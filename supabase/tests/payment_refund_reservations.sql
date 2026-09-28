begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('a1111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reservation-owner@example.test','',now(),now(),now()),
('a2222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reservation-other@example.test','',now(),now(),now()),
('a3333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','refund-admin@example.test','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('a3333333-3333-4333-8333-333333333333','admin');

set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select public.reserve_motorcycle(
  (select id from public.motorcycles where slug='bmw-s1000rr-2026'),
  (select id from public.branches where name_en='Cairo Showroom' limit 1)
) as first_reservation \gset
select public.cancel_unpaid_reservation(:'first_reservation');
select set_config('test.first_reservation',:'first_reservation',true);
do $$begin
  if (select status from public.motorcycle_reservations where id=current_setting('test.first_reservation')::uuid)<>'cancelled' then
    raise exception 'Owner cancellation failed';end if;
  if (select status from public.payments where reservation_id=current_setting('test.first_reservation')::uuid)<>'cancelled' then
    raise exception 'Unpaid payment not cancelled';end if;
end$$;
select public.reserve_motorcycle(
  (select id from public.motorcycles where slug='bmw-s1000rr-2026'),
  (select id from public.branches where name_en='Cairo Showroom' limit 1)
) as reservation_id \gset
select set_config('test.reservation_id',:'reservation_id',true);
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
do $$begin
  begin
    perform public.cancel_unpaid_reservation(current_setting('test.reservation_id')::uuid);
    raise exception 'Another customer cancelled reservation';
  exception when raise_exception then
    if sqlerrm<>'Reservation not owned' then raise;end if;
  end;
end$$;

reset role;
select id as payment_id,amount_egp as deposit from public.payments where reservation_id=:'reservation_id' \gset
select set_config('test.payment_id',:'payment_id',true);
select set_config('test.deposit',:'deposit',true);
set local role service_role;
do $$begin
  begin
    perform public.record_payment_event(current_setting('test.payment_id')::uuid,'payment-currency-bad','deposit-ref-1',current_setting('test.deposit')::numeric,'captured','USD');
    raise exception 'Foreign currency accepted';
  exception when raise_exception then
    if sqlerrm<>'Currency mismatch' then raise;end if;
  end;
end$$;
select public.record_payment_event(:'payment_id','payment-event-ok','deposit-ref-1',:'deposit','captured','EGP');
select public.record_payment_event(:'payment_id','payment-event-ok','deposit-ref-1',:'deposit','captured','EGP');
do $$begin
  if (select count(*) from public.payment_events where provider_event_id='payment-event-ok')<>1 then
    raise exception 'Payment retry was not idempotent';end if;
  begin
    update public.payment_events set event_type='failed' where provider_event_id='payment-event-ok';
    raise exception 'Payment event mutated';
  exception when raise_exception then
    if sqlerrm<>'Financial events are immutable' then raise;end if;
  end;
end$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','a3333333-3333-4333-8333-333333333333',true);
select public.request_reservation_refund(:'reservation_id','Customer requested cancellation') as refund_id \gset
select set_config('test.refund_id',:'refund_id',true);
do $$begin
  if (select status from public.motorcycle_reservations where id=current_setting('test.reservation_id')::uuid)<>'cancelled' then
    raise exception 'Paid reservation was not cancelled';end if;
  if (select status from public.refund_requests where id=current_setting('test.refund_id')::uuid)<>'provider_required' then
    raise exception 'Refund falsely completed before provider event';end if;
  begin
    perform public.request_reservation_refund(current_setting('test.reservation_id')::uuid,'Duplicate refund');
    raise exception 'Duplicate reservation refund accepted';
  exception when raise_exception then
    if sqlerrm<>'Reservation is not refundable' then raise;end if;
  end;
end$$;

set local role service_role;
do $$begin
  begin
    perform public.record_refund_event(current_setting('test.refund_id')::uuid,'refund-event-bad','refund-ref-1',current_setting('test.deposit')::numeric,'USD','succeeded');
    raise exception 'Foreign refund currency accepted';
  exception when raise_exception then
    if sqlerrm<>'Currency mismatch' then raise;end if;
  end;
end$$;
select public.record_refund_event(:'refund_id','refund-event-ok','refund-ref-1',:'deposit','EGP','succeeded');
select public.record_refund_event(:'refund_id','refund-event-ok','refund-ref-1',:'deposit','EGP','succeeded');
do $$begin
  if (select count(*) from public.refund_events where provider_event_id='refund-event-ok')<>1 then
    raise exception 'Refund retry was not idempotent';end if;
  if (select status from public.motorcycle_reservations where id=current_setting('test.reservation_id')::uuid)<>'refunded' then
    raise exception 'Reservation refund status not verified';end if;
  if (select status from public.payments where id=current_setting('test.payment_id')::uuid)<>'refunded' then
    raise exception 'Payment refund status incorrect';end if;
  begin
    update public.refund_events set event_type='failed' where provider_event_id='refund-event-ok';
    raise exception 'Refund event mutated';
  exception when raise_exception then
    if sqlerrm<>'Financial events are immutable' then raise;end if;
  end;
end$$;
rollback;
