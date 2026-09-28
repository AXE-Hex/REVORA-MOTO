begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('41111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','staff-sales@example.com','',now(),now(),now()),
('42222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','customer-sales@example.com','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('41111111-1111-4111-8111-111111111111','owner');
set local role authenticated;
select set_config('request.jwt.claim.sub','42222222-2222-4222-8222-222222222222',true);
do $$begin
  begin
    perform public.admin_report();
    raise exception 'Customer report access accepted';
  exception when raise_exception then
    if sqlerrm<>'Forbidden' then raise; end if;
  end;
end$$;
select set_config('request.jwt.claim.sub','41111111-1111-4111-8111-111111111111',true);
select public.save_customer_address(null,'Staff test','12 Test Street',null,'Cairo','Cairo','01000000000',true) as sales_address_id \gset
select public.add_cart_item(id,1) from public.products where sku='HLM-001';
select public.place_order(:'sales_address_id','card') as sales_order \gset
select set_config('test.sales_order',:'sales_order',true);
do $$begin
  begin
    perform public.admin_transition_order(current_setting('test.sales_order')::uuid,'delivered');
    raise exception 'Invalid order transition accepted';
  exception when raise_exception then
    if sqlerrm<>'Invalid order transition' then raise; end if;
  end;
end$$;
select public.admin_transition_order(:'sales_order','cancelled');
do $$begin
  if (select stock from public.products where sku='HLM-001')<>12 then raise exception 'Cancelled order stock not restored'; end if;
  if public.available_product_stock((select id from public.products where sku='HLM-001'),null)<>12 then raise exception 'Cancelled order reservation not released'; end if;
  if exists(select 1 from public.order_stock_allocations a join public.order_items i on i.id=a.order_item_id where i.order_id=current_setting('test.sales_order')::uuid and a.status<>'released') then raise exception 'Cancelled allocation state wrong'; end if;
  if (select status from public.orders where id=current_setting('test.sales_order')::uuid)<>'cancelled' then raise exception 'Order not cancelled'; end if;
end$$;
select public.reserve_motorcycle((select id from public.motorcycles where slug='bmw-s1000rr-2026'),(select id from public.branches where name_en='Cairo Showroom' limit 1)) as sales_reservation \gset
select set_config('test.sales_reservation',:'sales_reservation',true);
do $$begin
  if (select availability from public.motorcycles where slug='bmw-s1000rr-2026')<>'reserved' then raise exception 'Reserved motorcycle still available'; end if;
end$$;
select public.admin_transition_reservation(:'sales_reservation','cancelled');
select status from public.reservation_history where reservation_id=:'sales_reservation';
do $$begin
  if (select availability from public.motorcycles where slug='bmw-s1000rr-2026')<>'available' then raise exception 'Cancelled reservation did not release motorcycle'; end if;
  if (select count(*) from public.reservation_history where reservation_id=current_setting('test.sales_reservation')::uuid)<>2 then raise exception 'Reservation history incomplete'; end if;
  if (public.admin_report()->>'all_orders')::int<1 then raise exception 'Report excludes created orders'; end if;
end$$;
rollback;
