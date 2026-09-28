begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('51111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fulfillment-staff@example.test','',now(),now(),now()),
('56666666-6666-4666-8666-666666666666','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fulfillment-warehouse@example.test','',now(),now(),now()),
('52222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fulfillment-customer@example.test','',now(),now(),now()),
('53333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fulfillment-other@example.test','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('51111111-1111-4111-8111-111111111111','owner');
insert into public.staff_roles(user_id,role_id) values('56666666-6666-4666-8666-666666666666','warehouse');
set local role authenticated;
select set_config('request.jwt.claim.sub','51111111-1111-4111-8111-111111111111',true);
select public.admin_set_checkout_rates(25.00,10.00);
select set_config('request.jwt.claim.sub','52222222-2222-4222-8222-222222222222',true);
insert into public.addresses(id,user_id,name,line1,city,governorate,phone)
values('54444444-4444-4444-8444-444444444444',auth.uid(),'Home','12 Test Street','Cairo','Cairo','01000000000');
select public.add_cart_item((select id from public.products where sku='HLM-001'),1);
do $$declare v_quote jsonb;begin
  v_quote:=public.quote_cart();
  if (v_quote->>'shipping_egp')::numeric<>25 or
    (v_quote->>'tax_egp')::numeric<>round((v_quote->>'subtotal_egp')::numeric*0.10,2) or
    (v_quote->>'total_egp')::numeric<>(v_quote->>'subtotal_egp')::numeric+(v_quote->>'tax_egp')::numeric+25
  then raise exception 'Authoritative checkout charges wrong'; end if;
end$$;
select public.place_order('54444444-4444-4444-8444-444444444444','card',null,
  '55555555-5555-4555-8555-555555555555') as order_id \gset
select set_config('test.fulfillment_order',:'order_id',true);
do $$begin
  if public.place_order('54444444-4444-4444-8444-444444444444','card',null,
    '55555555-5555-4555-8555-555555555555')<>current_setting('test.fulfillment_order')::uuid
    then raise exception 'Repeated checkout did not return same order'; end if;
  if (select count(*) from public.orders where user_id=auth.uid())<>1
    then raise exception 'Repeated checkout created duplicate order'; end if;
end$$;
do $$begin
  if (select stock from public.products where sku='HLM-001')<>12 then raise exception 'Physical stock deducted before shipment'; end if;
  if public.available_product_stock((select id from public.products where sku='HLM-001'),null)<>11
    then raise exception 'Reserved stock still available'; end if;
  begin
    perform public.add_cart_item((select id from public.products where sku='HLM-001'),12);
    raise exception 'Cart accepted unavailable stock';
  exception when raise_exception then if sqlerrm<>'Insufficient available stock' then raise; end if; end;
  if exists(select 1 from public.invoices where order_id=current_setting('test.fulfillment_order')::uuid)
    then raise exception 'Invoice issued before capture'; end if;
  begin
    perform public.admin_ship_order(current_setting('test.fulfillment_order')::uuid,'Carrier','TRK-001');
    raise exception 'Customer shipped order';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise; end if; end;
end$$;
reset role;
set local role service_role;
select public.record_payment_event(
  (select id from public.payments where order_id=:'order_id'),
  'fulfillment-capture-001','fulfillment-ref-001',
  (select amount_egp from public.payments where order_id=:'order_id'),'captured');
do $$begin
  if (select snapshot->>'brand' from public.invoices where order_id=current_setting('test.fulfillment_order')::uuid)<>'REVORA MOTO'
    then raise exception 'Invoice snapshot missing'; end if;
  if (select (snapshot->>'total_egp')::numeric from public.invoices where order_id=current_setting('test.fulfillment_order')::uuid)
    <>(select total_egp from public.orders where id=current_setting('test.fulfillment_order')::uuid)
    then raise exception 'Invoice total mismatch'; end if;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','51111111-1111-4111-8111-111111111111',true);
do $$begin
  if (select count(*) from public.order_stock_allocations a join public.order_items i on i.id=a.order_item_id
      where i.order_id=current_setting('test.fulfillment_order')::uuid and a.status='reserved')<>1
    then raise exception 'Stock allocation missing'; end if;
end$$;
select public.admin_transition_order(:'order_id','processing');
select set_config('request.jwt.claim.sub','56666666-6666-4666-8666-666666666666',true);
do $$begin
  begin
    perform public.admin_transition_order(current_setting('test.fulfillment_order')::uuid,'delivered');
    raise exception 'Warehouse changed order lifecycle';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise; end if; end;
end$$;
select public.admin_ship_order(:'order_id','Carrier','TRK-001');
do $$begin
  if (select status from public.orders where id=current_setting('test.fulfillment_order')::uuid)<>'shipped'
    then raise exception 'Order not shipped'; end if;
  if (select stock from public.products where sku='HLM-001')<>11
    then raise exception 'Shipment did not deduct physical stock'; end if;
  if exists(select 1 from public.order_stock_allocations a join public.order_items i on i.id=a.order_item_id
    where i.order_id=current_setting('test.fulfillment_order')::uuid and a.status<>'fulfilled')
    then raise exception 'Allocation not fulfilled'; end if;
  if not exists(select 1 from public.inventory_movements where kind='fulfillment' and delta=-1)
    then raise exception 'Shipment movement missing'; end if;
  begin
    perform public.admin_ship_order(current_setting('test.fulfillment_order')::uuid,'Carrier','TRK-002');
    raise exception 'Duplicate shipment accepted';
  exception when raise_exception then if sqlerrm<>'Order is not ready to ship' then raise; end if; end;
end$$;
select set_config('request.jwt.claim.sub','51111111-1111-4111-8111-111111111111',true);
select public.admin_transition_order(:'order_id','delivered');
do $$begin
  if not exists(select 1 from public.order_shipments where order_id=current_setting('test.fulfillment_order')::uuid
    and delivered_at is not null) then raise exception 'Delivery timestamp missing'; end if;
  if has_table_privilege('authenticated','public.invoices','UPDATE') then raise exception 'Invoice mutation grant exposed'; end if;
end$$;
select set_config('request.jwt.claim.sub','52222222-2222-4222-8222-222222222222',true);
select public.add_cart_item((select id from public.products where sku='HLM-001'),1);
select public.place_order('54444444-4444-4444-8444-444444444444','card') as expiring_order \gset
select set_config('test.expiring_order',:'expiring_order',true);
reset role;
update public.orders set expires_at=now()-interval '1 second' where id=:'expiring_order';
set local role service_role;
select public.expire_unpaid_orders(10);
select public.cancel_unpaid_order(:'expiring_order');
do $$begin
  if (select status from public.orders where id=current_setting('test.expiring_order')::uuid)<>'cancelled'
    then raise exception 'Expired order still active'; end if;
  if (select count(*) from public.order_history where order_id=current_setting('test.expiring_order')::uuid and status='cancelled')<>1
    then raise exception 'Cancellation is not idempotent'; end if;
  if public.available_product_stock((select id from public.products where sku='HLM-001'),null)<>11
    then raise exception 'Expired order did not release stock'; end if;
  begin
    perform public.record_payment_event((select id from public.payments where order_id=current_setting('test.expiring_order')::uuid),
      'late-capture-001','late-ref-001',(select total_egp from public.orders where id=current_setting('test.expiring_order')::uuid),'captured');
    raise exception 'Late capture accepted after expiry';
  exception when raise_exception then if sqlerrm<>'Payment is closed' then raise; end if; end;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','52222222-2222-4222-8222-222222222222',true);
select public.add_cart_item((select id from public.products where sku='HLM-001'),1);
select public.place_order('54444444-4444-4444-8444-444444444444','card') as own_cancel_order \gset
select set_config('test.own_cancel_order',:'own_cancel_order',true);
select public.cancel_own_unpaid_order(:'own_cancel_order');
do $$begin
  if (select status from public.orders where id=current_setting('test.own_cancel_order')::uuid)<>'cancelled'
    then raise exception 'Customer cancellation failed'; end if;
  if public.available_product_stock((select id from public.products where sku='HLM-001'),null)<>11
    then raise exception 'Customer cancellation did not release stock'; end if;
end$$;
select set_config('request.jwt.claim.sub','53333333-3333-4333-8333-333333333333',true);
do $$begin
  if exists(select 1 from public.invoices where order_id=current_setting('test.fulfillment_order')::uuid)
    or exists(select 1 from public.order_shipments where order_id=current_setting('test.fulfillment_order')::uuid)
    then raise exception 'Other customer can read private fulfillment data'; end if;
  begin
    perform public.cancel_own_unpaid_order(current_setting('test.fulfillment_order')::uuid);
    raise exception 'Other customer cancelled order';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise; end if; end;
end$$;
rollback;
