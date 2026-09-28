begin;

do $$begin
  if has_table_privilege('anon','public.suppliers','SELECT') then raise exception 'Supplier data exposed to anon';end if;
  if has_table_privilege('authenticated','public.inventory','UPDATE') then raise exception 'Direct inventory update allowed';end if;
  if not exists(select 1 from public.inventory_movements where kind in ('bootstrap','catalog')) then raise exception 'Initial stock lacks ledger entry';end if;
  if exists(select 1 from public.inventory i where i.variant_id is null and exists(select 1 from public.product_variants v where v.product_id=i.product_id) and i.on_hand<>0) then raise exception 'Variant product has phantom base stock';end if;
end$$;

do $$begin
  begin
    insert into public.product_variants(product_id,sku,price_egp,stock)
      select id,'INVALID-PARENT-VARIANT',100,1 from public.products where sku='HLM-001';
    raise exception 'Variant accepted while parent has stock';
  exception when raise_exception then
    if sqlerrm<>'Clear base product stock before adding variants' then raise;end if;
  end;
end$$;

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('33333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inventory-test@example.com','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('33333333-3333-4333-8333-333333333333','warehouse');
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);

select id as inventory_id from public.inventory where product_id=(select id from public.products where sku='HLM-001') and variant_id is null limit 1 \gset
select set_config('test.inventory_id',:'inventory_id',true);
select on_hand as before_qty from public.inventory where id=:'inventory_id' \gset
select set_config('test.before_qty',:'before_qty',true);
select public.adjust_inventory(:'inventory_id',3,'Count correction');
do $$begin
  if (select on_hand from public.inventory where id=current_setting('test.inventory_id')::uuid)<>current_setting('test.before_qty')::int+3 then raise exception 'Adjustment did not change balance';end if;
  if (select stock from public.products where sku='HLM-001')<>current_setting('test.before_qty')::int+3 then raise exception 'Catalog stock not synced';end if;
  if not exists(select 1 from public.inventory_movements where inventory_id=current_setting('test.inventory_id')::uuid and delta=3 and kind='adjustment') then raise exception 'Adjustment not recorded';end if;
end$$;

insert into public.warehouses(name) values('Inventory test branch') returning id as destination_id \gset
select set_config('test.destination_id',:'destination_id',true);
select public.transfer_inventory(:'inventory_id',:'destination_id',2,'Branch replenishment');
do $$begin
  if (select on_hand from public.inventory where warehouse_id=current_setting('test.destination_id')::uuid and product_id=(select id from public.products where sku='HLM-001'))<>2 then raise exception 'Transfer destination wrong';end if;
  if (select count(*) from public.inventory_movements where kind='transfer' and reason='Branch replenishment')<>2 then raise exception 'Transfer ledger incomplete';end if;
  if (select stock from public.products where sku='HLM-001')<>current_setting('test.before_qty')::int+3 then raise exception 'Transfer changed total stock';end if;
end$$;

insert into public.suppliers(name,email) values('Test supplier','private@example.test') returning id as supplier_id \gset
select public.create_purchase_order(:'supplier_id',:'destination_id',(select id from public.products where sku='HLM-001'),null,5,100) as po_id \gset
select set_config('test.po_id',:'po_id',true);
select id as item_id from public.purchase_order_items where purchase_order_id=:'po_id' \gset
select set_config('test.item_id',:'item_id',true);
do $$begin
  if (select incoming from public.inventory where warehouse_id=current_setting('test.destination_id')::uuid and product_id=(select id from public.products where sku='HLM-001'))<>5 then raise exception 'Incoming not recorded';end if;
end$$;
select public.receive_purchase_order_item(:'item_id',3);
do $$begin
  if (select status from public.purchase_orders where id=current_setting('test.po_id')::uuid)<>'partially_received' then raise exception 'Partial receiving status wrong';end if;
  if (select incoming from public.inventory where warehouse_id=current_setting('test.destination_id')::uuid and product_id=(select id from public.products where sku='HLM-001'))<>2 then raise exception 'Incoming remaining wrong';end if;
  if (select stock from public.products where sku='HLM-001')<>current_setting('test.before_qty')::int+6 then raise exception 'Receiving not reflected in catalog';end if;
end$$;
select public.receive_purchase_order_item(:'item_id',2);
do $$begin
  if (select status from public.purchase_orders where id=current_setting('test.po_id')::uuid)<>'received' then raise exception 'Receiving completion wrong';end if;
  begin
    perform public.receive_purchase_order_item(current_setting('test.item_id')::uuid,1);
    raise exception 'Over receipt accepted';
  exception when raise_exception then if sqlerrm<>'Purchase order unavailable' then raise;end if;end;
  begin
    update public.inventory_movements set reason='tampered' where inventory_id=current_setting('test.inventory_id')::uuid;
    raise exception 'Ledger mutation accepted';
  exception when insufficient_privilege then null;end;
end$$;

-- Checkout reserves location stock without moving physical stock.
select public.save_customer_address(null,'Warehouse','1 Test Street',null,'Cairo','Cairo','01000000000',true) as inventory_address_id \gset
select public.add_cart_item((select id from public.products where sku='HLM-001'),1);
select public.place_order(:'inventory_address_id','card');
do $$begin
  if not exists(select 1 from public.order_stock_allocations where status='reserved') then raise exception 'Checkout reservation missing';end if;
  if (select sum(reserved) from public.inventory where product_id=(select id from public.products where sku='HLM-001') and variant_id is null)<>1 then raise exception 'Location reservation missing';end if;
  if (select stock from public.products where sku='HLM-001')<>(select sum(on_hand) from public.inventory where product_id=(select id from public.products where sku='HLM-001') and variant_id is null) then raise exception 'Catalog/location stock diverged';end if;
end$$;

rollback;
