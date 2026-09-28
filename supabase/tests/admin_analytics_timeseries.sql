begin;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('43333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','analytics-owner@example.test','',now(),now(),now()),
('44444444-4444-4444-8444-444444444444','00000000-0000-0000-0000-000000000000','authenticated','authenticated','analytics-customer@example.test','',now(),now(),now()),
('45555555-5555-4555-8555-555555555555','00000000-0000-0000-0000-000000000000','authenticated','authenticated','analytics-sales@example.test','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values
('43333333-3333-4333-8333-333333333333','owner'),
('45555555-5555-4555-8555-555555555555','sales');
update public.profiles set created_at=now()-interval '400 days'
where id in ('43333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','45555555-5555-4555-8555-555555555555');
update public.profiles set created_at=now()-interval '40 days'
where id='44444444-4444-4444-8444-444444444444';

-- A clean reporting interval returns a complete date spine of zero-valued buckets.
set local role authenticated;
select set_config('request.jwt.claim.sub','43333333-3333-4333-8333-333333333333',true);
do $$
declare v record;
begin
  select count(*) as buckets, coalesce(sum(orders),0) as orders,
    coalesce(sum(revenue_egp),0) as revenue, coalesce(sum(reservations),0) as reservations,
    coalesce(sum(customers),0) as customers, coalesce(sum(captured_payments_egp),0) as payments
  into v from public.admin_analytics_timeseries('7d');
  if v.buckets<>7 or v.orders<>0 or v.revenue<>0 or v.reservations<>0 or v.customers<>0 or v.payments<>0 then
    raise exception 'Empty 7d analytics did not return seven zero buckets: %', row_to_json(v);
  end if;
end$$;
reset role;

-- Current and 40-day-old paid orders test daily/monthly aggregation and bounds.
insert into public.orders(id,user_id,address_snapshot,status,subtotal_egp,discount_egp,tax_egp,shipping_egp,total_egp,created_at)
values
('45555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','{}','paid',1000,0,0,0,1000,now()),
('46666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','{}','paid',2000,0,0,0,2000,now()-interval '40 days'),
('49999999-9999-4999-8999-999999999999','44444444-4444-4444-8444-444444444444','{}','cancelled',300,0,0,0,300,now()),
('4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444','{}','pending_payment',50,0,0,0,50,(((now() at time zone 'UTC')::date - 29)::timestamp at time zone 'UTC')),
('4ccccccc-cccc-4ccc-8ccc-cccccccccccc','44444444-4444-4444-8444-444444444444','{}','cancelled',25,0,0,0,25,((((now() at time zone 'UTC')::date - 29)::timestamp at time zone 'UTC') - interval '1 second')),
('4ddddddd-dddd-4ddd-8ddd-dddddddddddd','44444444-4444-4444-8444-444444444444','{}','cancelled',20,0,0,0,20,(((now() at time zone 'UTC')::date + 1)::timestamp at time zone 'UTC'));
insert into public.payments(id,user_id,order_id,provider,method,amount_egp,status,created_at)
values
('47777777-7777-4777-8777-777777777777','44444444-4444-4444-8444-444444444444','45555555-5555-4555-8555-555555555555','test','card',1000,'captured',now()),
('48888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444','46666666-6666-4666-8666-666666666666','test','card',2000,'captured',now()-interval '40 days'),
('4aaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','49999999-9999-4999-8999-999999999999','test','card',300,'failed',now());
insert into public.payment_events(payment_id,event_type,provider_event_id,payload,created_at)
values
('47777777-7777-4777-8777-777777777777','captured','analytics-capture-current','{"amount_egp":1000}',now()),
('47777777-7777-4777-8777-777777777777','captured','analytics-capture-current-duplicate','{"amount_egp":1000}',now()+interval '1 second'),
('48888888-8888-4888-8888-888888888888','captured','analytics-capture-old','{"amount_egp":2000}',now()-interval '40 days'),
('4aaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa','failed','analytics-failure-current','{"amount_egp":300}',now());
-- Revenue measures gross historical captures. A later refund does not rewrite
-- the immutable captured event; failed/cancelled attempts have no gross capture.
update public.payments set status='refunded'
where id='47777777-7777-4777-8777-777777777777';
insert into public.motorcycle_reservations(user_id,motorcycle_id,branch_id,status,deposit_egp,created_at)
select '44444444-4444-4444-8444-444444444444',m.id,b.id,'cancelled',m.deposit_egp,now()
from public.motorcycles m cross join public.branches b
order by m.id,b.id limit 1;
insert into public.motorcycle_reservations(user_id,motorcycle_id,branch_id,status,deposit_egp,created_at)
select '44444444-4444-4444-8444-444444444444',m.id,b.id,'cancelled',m.deposit_egp,now()-interval '40 days'
from public.motorcycles m cross join public.branches b
order by m.id,b.id limit 1;
update public.profiles set created_at=now() where id='43333333-3333-4333-8333-333333333333';

set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$begin
  begin
    perform * from public.admin_analytics_timeseries('7d');
    raise exception 'Customer analytics access accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'Forbidden' then raise; end if;
  end;
end$$;
select set_config('request.jwt.claim.sub','45555555-5555-4555-8555-555555555555',true);
do $$begin
  begin
    perform * from public.admin_analytics_timeseries('7d');
    raise exception 'Staff without reports.read accessed analytics';
  exception when insufficient_privilege then
    if sqlerrm<>'Forbidden' then raise; end if;
  end;
end$$;
select set_config('request.jwt.claim.sub','43333333-3333-4333-8333-333333333333',true);
do $$
declare v record;
begin
  select count(*) as buckets, coalesce(sum(orders),0) as orders,
    coalesce(sum(revenue_egp),0) as revenue, coalesce(sum(customers),0) as customers,
    coalesce(sum(captured_payments_egp),0) as payments
  into v from public.admin_analytics_timeseries('7d');
  if v.buckets<>7 or v.orders<>2 or v.revenue<>1000 or v.customers<>1 or v.payments<>1000 then
    raise exception '7d range aggregation incorrect: %', row_to_json(v);
  end if;

  select count(*) as buckets, coalesce(sum(orders),0) as orders,
    coalesce(sum(revenue_egp),0) as revenue, coalesce(sum(captured_payments_egp),0) as payments
  into v from public.admin_analytics_timeseries('7d')
  where bucket_date=(now() at time zone 'UTC')::date;
  if v.buckets<>1 or v.orders<>2 or v.revenue<>1000 or v.payments<>1000 then
    raise exception 'Single-day aggregation incorrect: %', row_to_json(v);
  end if;

  select count(*) as buckets, coalesce(sum(orders),0) as orders,
    coalesce(sum(revenue_egp),0) as revenue, coalesce(sum(reservations),0) as reservations,
    coalesce(sum(customers),0) as customers, coalesce(sum(captured_payments_egp),0) as payments
  into v from public.admin_analytics_timeseries('90d');
  if v.buckets<>90 or v.orders<>5 or v.revenue<>3000 or v.reservations<>2 or v.customers<>2 or v.payments<>3000 then
    raise exception '90d range aggregation incorrect: %', row_to_json(v);
  end if;

  select count(*) as buckets, coalesce(sum(orders),0) as orders
  into v from public.admin_analytics_timeseries('30d');
  if v.buckets<>30 or v.orders<>3 then raise exception '30d boundary incorrect: %', row_to_json(v); end if;

  select count(*) as buckets, coalesce(sum(orders),0) as orders
  into v from public.admin_analytics_timeseries('12m');
  if v.buckets<>12 or v.orders<>5 then raise exception '12m monthly aggregation incorrect: %', row_to_json(v); end if;

  begin
    perform * from public.admin_analytics_timeseries('all');
    raise exception 'Unsupported range accepted';
  exception when invalid_parameter_value then
    if sqlerrm<>'Invalid range' then raise; end if;
  end;
end$$;
reset role;

set local role anon;
do $$begin
  begin
    perform * from public.admin_analytics_timeseries('7d');
    raise exception 'Anonymous analytics execution accepted';
  exception when insufficient_privilege then
    null;
  end;
end$$;
reset role;

do $$begin
  if has_function_privilege('anon','public.admin_analytics_timeseries(text)','EXECUTE')
    or has_function_privilege('service_role','public.admin_analytics_timeseries(text)','EXECUTE') then
    raise exception 'Analytics execution is granted to an unintended role';
  end if;
  if not has_function_privilege('authenticated','public.admin_analytics_timeseries(text)','EXECUTE') then
    raise exception 'Authenticated role cannot execute analytics RPC';
  end if;
end$$;

rollback;
