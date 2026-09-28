begin;
do $$begin
  if (select count(*) from public.products where status='active')<28 then raise exception 'Seed products missing';end if;
  if (select count(*) from public.motorcycles where availability='available')<6 then raise exception 'Seed motorcycles missing';end if;
  if has_column_privilege('anon','public.products','cost_egp','SELECT') then raise exception 'Cost column exposed';end if;
  if has_column_privilege('anon','public.motorcycles','vin','SELECT') then raise exception 'VIN column exposed';end if;
end$$;
set local role anon;
select count(*) as visible_products from public.public_products;
select count(*) as visible_motorcycles from public.public_motorcycles;
reset role;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','revora-test@example.com','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.addresses(id,user_id,name,line1,city,governorate,phone) values('22222222-2222-4222-8222-222222222222',auth.uid(),'Home','12 Test Street','Cairo','Cairo','01000000000');
select public.add_cart_item(id,1) from public.products where sku='HLM-001';
select public.add_cart_item(id,1) from public.products where sku='HLM-001';
do $$begin if (select quantity from public.cart_items limit 1)<>2 then raise exception 'Cart quantity not merged';end if;end$$;
select public.place_order('22222222-2222-4222-8222-222222222222','card') as placed_order \gset
select set_config('test.order_id',:'placed_order',true);
do $$begin
  if (select total_egp from public.orders where id=current_setting('test.order_id')::uuid)<>29000 then raise exception 'Server price snapshot wrong';end if;
  if (select stock from public.products where sku='HLM-001')<>12 then raise exception 'Physical stock changed before fulfillment';end if;
  if public.available_product_stock((select id from public.products where sku='HLM-001'),null)<>10 then raise exception 'Order stock not reserved';end if;
  if (select status from public.orders where id=current_setting('test.order_id')::uuid)<>'pending_payment' then raise exception 'Order incorrectly paid';end if;
end$$;
select public.add_cart_item((select id from public.products where sku='GEAR-001'),1,(select id from public.product_variants where sku='GEAR-001-L'));
select public.place_order('22222222-2222-4222-8222-222222222222','card') as variant_order \gset
select set_config('test.variant_order_id',:'variant_order',true);
do $$begin
  if (select total_egp from public.orders where id=current_setting('test.variant_order_id')::uuid)<>8000 then raise exception 'Variant price snapshot wrong';end if;
  if (select stock from public.product_variants where sku='GEAR-001-L')<>8 then raise exception 'Variant physical stock changed before fulfillment';end if;
  if public.available_product_stock((select id from public.products where sku='GEAR-001'),(select id from public.product_variants where sku='GEAR-001-L'))<>7 then raise exception 'Variant stock not reserved';end if;
  if (select variant_snapshot->>'size' from public.order_items where order_id=current_setting('test.variant_order_id')::uuid)<>'L' then raise exception 'Variant attributes missing from order';end if;
end$$;
select public.reserve_motorcycle((select id from public.motorcycles where slug='bmw-s1000rr-2026'),(select id from public.branches where name_en='Cairo Showroom' limit 1)) as reservation_id \gset
select set_config('test.reservation_id',:'reservation_id',true);
do $$begin if (select status from public.motorcycle_reservations where id=current_setting('test.reservation_id')::uuid)<>'awaiting_payment' then raise exception 'Reservation incorrectly paid';end if;end$$;
do $$begin
  begin
    perform public.reserve_motorcycle((select id from public.motorcycles where slug='bmw-s1000rr-2026'),(select id from public.branches where name_en='Cairo Showroom' limit 1));
    raise exception 'Duplicate reservation accepted';
  exception when unique_violation then null;
  when raise_exception then
    if sqlerrm<>'Motorcycle unavailable' then raise;end if;
  end;
  begin
    perform public.submit_review((select id from public.products where sku='HLM-001'),current_setting('test.order_id')::uuid,5,'Excellent helmet quality');
    raise exception 'Unverified review accepted';
  exception when raise_exception then
    if sqlerrm<>'Verified purchase required' then raise;end if;
  end;
end$$;
reset role;
select id as payment_id from public.payments where order_id=:'placed_order' \gset
set local role service_role;
do $$begin
  begin
    perform public.record_payment_event((select id from public.payments where order_id=current_setting('test.order_id')::uuid),'test-event-bad-amount','gateway-ref-00001',1,'captured');
    raise exception 'Incorrect amount accepted';
  exception when raise_exception then
    if sqlerrm<>'Amount mismatch' then raise;end if;
  end;
end$$;
select public.record_payment_event(:'payment_id','test-event-00001','gateway-ref-00001',29000,'captured');
do $$begin if (select status from public.orders where id=current_setting('test.order_id')::uuid)<>'paid' then raise exception 'Captured payment did not update order';end if;end$$;
rollback;
