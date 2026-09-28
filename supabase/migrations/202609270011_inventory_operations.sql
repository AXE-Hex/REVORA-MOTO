-- Location balances are authoritative for staff operations. The catalog stock
-- trigger also records legacy checkout/catalog stock changes in the ledger.
alter table public.inventory_movements alter column actor_id drop not null;
alter table public.inventory_movements drop constraint inventory_movements_delta_check;
alter table public.inventory_movements add column incoming_delta int not null default 0;
alter table public.inventory_movements add column kind text not null default 'adjustment'
  check(kind in ('bootstrap','adjustment','transfer','receiving','purchase_order','catalog'));
alter table public.inventory_movements add column operation_id uuid;
alter table public.inventory_movements add constraint inventory_movement_has_change check(delta<>0 or incoming_delta<>0);
alter table public.purchase_orders add column warehouse_id uuid references public.warehouses;
alter table public.purchase_order_items add column variant_id uuid references public.product_variants;

insert into public.warehouses(id,name,active)
values('00000000-0000-4000-8000-000000000011','Main warehouse',true)
on conflict(id) do nothing;

insert into public.inventory(product_id,variant_id,warehouse_id,on_hand)
select p.id,null,'00000000-0000-4000-8000-000000000011',p.stock
from public.products p where not exists(select 1 from public.product_variants v where v.product_id=p.id)
on conflict(product_id,variant_id,warehouse_id) do nothing;
insert into public.inventory(product_id,variant_id,warehouse_id,on_hand)
select v.product_id,v.id,'00000000-0000-4000-8000-000000000011',v.stock
from public.product_variants v
on conflict(product_id,variant_id,warehouse_id) do nothing;
insert into public.inventory_movements(inventory_id,delta,kind,reason)
select id,on_hand,'bootstrap','Initial catalog stock' from public.inventory where on_hand<>0;

create function public.inventory_variant_matches() returns trigger language plpgsql set search_path=public as $$begin
  if new.variant_id is not null and not exists(select 1 from public.product_variants where id=new.variant_id and product_id=new.product_id) then
    raise exception 'Variant does not belong to product';
  end if;
  return new;
end$$;
create trigger inventory_variant_consistency before insert or update of product_id,variant_id on public.inventory for each row execute function public.inventory_variant_matches();

create function public.immutable_inventory_movement() returns trigger language plpgsql set search_path=public as $$begin
  raise exception 'Inventory movements are immutable';
end$$;
create trigger inventory_movements_immutable before update or delete on public.inventory_movements for each row execute function public.immutable_inventory_movement();

create function public.sync_catalog_stock_from_inventory() returns trigger language plpgsql security definer set search_path=public as $$declare v_total int;begin
  if pg_trigger_depth()>1 then return new;end if;
  select coalesce(sum(on_hand),0)::int into v_total from public.inventory
  where product_id=new.product_id and variant_id is not distinct from new.variant_id;
  if new.variant_id is null then
    update public.products set stock=v_total where id=new.product_id and stock<>v_total;
  else
    update public.product_variants set stock=v_total where id=new.variant_id and stock<>v_total;
  end if;
  return new;
end$$;
create trigger inventory_catalog_sync after insert or update of on_hand on public.inventory for each row execute function public.sync_catalog_stock_from_inventory();

create function public.sync_inventory_from_catalog() returns trigger language plpgsql security definer set search_path=public as $$
declare v_delta int;v_left int;v_take int;v_row record;v_inventory uuid;v_product uuid;v_variant uuid;
begin
  if pg_trigger_depth()>1 then return new;end if;
  v_delta:=new.stock-coalesce(old.stock,0);
  if v_delta=0 then return new;end if;
  if tg_table_name='products' then v_product:=new.id;v_variant:=null;
  else v_product:=new.product_id;v_variant:=new.id;end if;
  -- Products with variants use variant balances; their base stock is not sellable.
  if v_variant is null and exists(select 1 from public.product_variants where product_id=v_product) then return new;end if;
  if v_delta>0 then
    insert into public.inventory(product_id,variant_id,warehouse_id,on_hand)
    values(v_product,v_variant,'00000000-0000-4000-8000-000000000011',v_delta)
    on conflict(product_id,variant_id,warehouse_id) do update set on_hand=public.inventory.on_hand+excluded.on_hand
    returning id into v_inventory;
    insert into public.inventory_movements(inventory_id,delta,kind,reason,actor_id)
    values(v_inventory,v_delta,'catalog','Catalog stock change',auth.uid());
  else
    v_left:=-v_delta;
    for v_row in select id,on_hand,reserved from public.inventory
      where product_id=v_product and variant_id is not distinct from v_variant and on_hand>reserved
      order by warehouse_id for update
    loop
      v_take:=least(v_left,v_row.on_hand-v_row.reserved);
      update public.inventory set on_hand=on_hand-v_take where id=v_row.id;
      insert into public.inventory_movements(inventory_id,delta,kind,reason,actor_id)
      values(v_row.id,-v_take,'catalog','Catalog stock change',auth.uid());
      v_left:=v_left-v_take;
      exit when v_left=0;
    end loop;
    if v_left<>0 then raise exception 'Insufficient location stock';end if;
  end if;
  return new;
end$$;
create trigger products_inventory_sync after insert or update of stock on public.products for each row execute function public.sync_inventory_from_catalog();
create trigger variants_inventory_sync after insert or update of stock on public.product_variants for each row execute function public.sync_inventory_from_catalog();
create function public.archive_base_stock_after_variant() returns trigger language plpgsql security definer set search_path=public as $$
declare v_row record;
begin
  if (select count(*) from public.product_variants where product_id=new.product_id)=1 then
    for v_row in select id,on_hand from public.inventory where product_id=new.product_id and variant_id is null and on_hand>0 for update loop
      update public.inventory set on_hand=0 where id=v_row.id;
      insert into public.inventory_movements(inventory_id,delta,kind,reason,actor_id)
      values(v_row.id,-v_row.on_hand,'catalog','Converted to variant stock',auth.uid());
    end loop;
    update public.products set stock=0 where id=new.product_id and stock<>0;
  end if;
  return new;
end$$;
create trigger variants_archive_base_stock after insert on public.product_variants for each row execute function public.archive_base_stock_after_variant();
create policy products_inventory_staff_select on public.products for select to authenticated using(public.has_permission('inventory.write'));
create policy variants_inventory_staff_select on public.product_variants for select to authenticated using(public.has_permission('inventory.write'));

-- Existing adjustment RPC is retained for callers, with one movement per change.
create or replace function public.adjust_inventory(p_inventory uuid,p_delta int,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare v_row public.inventory%rowtype;v_after int;
begin
  if not public.has_permission('inventory.write') then raise exception 'Forbidden';end if;
  if p_delta is null or p_delta=0 or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Invalid adjustment';end if;
  select * into v_row from public.inventory where id=p_inventory for update;
  if not found then raise exception 'Inventory not found';end if;
  v_after:=v_row.on_hand+p_delta;
  if v_after<v_row.reserved then raise exception 'Insufficient stock';end if;
  update public.inventory set on_hand=v_after where id=p_inventory;
  insert into public.inventory_movements(inventory_id,delta,kind,reason,actor_id)
  values(p_inventory,p_delta,'adjustment',trim(p_reason),auth.uid());
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
  values(auth.uid(),'inventory.adjust','inventory',p_inventory,jsonb_build_object('before',v_row.on_hand,'after',v_after,'reason',p_reason));
end$$;

create function public.transfer_inventory(p_inventory uuid,p_destination uuid,p_quantity int,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare v_source public.inventory%rowtype;v_target uuid;v_operation uuid:=gen_random_uuid();
begin
  if not public.has_permission('inventory.write') then raise exception 'Forbidden';end if;
  if p_quantity is null or p_quantity<=0 or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Invalid transfer';end if;
  select * into v_source from public.inventory where id=p_inventory for update;
  if not found then raise exception 'Inventory not found';end if;
  if v_source.warehouse_id=p_destination then raise exception 'Same location';end if;
  if not exists(select 1 from public.warehouses where id=p_destination and active) then raise exception 'Destination unavailable';end if;
  if v_source.on_hand-v_source.reserved<p_quantity then raise exception 'Insufficient available stock';end if;
  insert into public.inventory(product_id,variant_id,warehouse_id,on_hand)
  values(v_source.product_id,v_source.variant_id,p_destination,0)
  on conflict(product_id,variant_id,warehouse_id) do nothing;
  select id into v_target from public.inventory where product_id=v_source.product_id
    and variant_id is not distinct from v_source.variant_id and warehouse_id=p_destination for update;
  update public.inventory set on_hand=on_hand-p_quantity where id=p_inventory;
  update public.inventory set on_hand=on_hand+p_quantity where id=v_target;
  insert into public.inventory_movements(inventory_id,delta,kind,reason,actor_id,operation_id)
  values(p_inventory,-p_quantity,'transfer',trim(p_reason),auth.uid(),v_operation),
    (v_target,p_quantity,'transfer',trim(p_reason),auth.uid(),v_operation);
end$$;
revoke all on function public.transfer_inventory(uuid,uuid,int,text) from public;
grant execute on function public.transfer_inventory(uuid,uuid,int,text) to authenticated;

create function public.create_purchase_order(p_supplier uuid,p_warehouse uuid,p_product uuid,p_variant uuid,p_quantity int,p_unit_cost numeric) returns uuid language plpgsql security definer set search_path=public as $$
declare v_po uuid;v_item uuid;v_inventory uuid;
begin
  if not public.has_permission('inventory.write') then raise exception 'Forbidden';end if;
  if p_quantity is null or p_quantity<=0 or p_unit_cost is null or p_unit_cost<0 then raise exception 'Invalid purchase order';end if;
  if not exists(select 1 from public.suppliers where id=p_supplier and active) then raise exception 'Supplier unavailable';end if;
  if not exists(select 1 from public.warehouses where id=p_warehouse and active) then raise exception 'Warehouse unavailable';end if;
  if not exists(select 1 from public.products where id=p_product) then raise exception 'Product unavailable';end if;
  if p_variant is not null and not exists(select 1 from public.product_variants where id=p_variant and product_id=p_product) then raise exception 'Variant mismatch';end if;
  if p_variant is null and exists(select 1 from public.product_variants where product_id=p_product) then raise exception 'Variant required';end if;
  insert into public.purchase_orders(supplier_id,warehouse_id,status,created_by) values(p_supplier,p_warehouse,'placed',auth.uid()) returning id into v_po;
  insert into public.purchase_order_items(purchase_order_id,product_id,variant_id,quantity,unit_cost_egp)
    values(v_po,p_product,p_variant,p_quantity,p_unit_cost) returning id into v_item;
  insert into public.inventory(product_id,variant_id,warehouse_id,incoming)
    values(p_product,p_variant,p_warehouse,p_quantity)
    on conflict(product_id,variant_id,warehouse_id) do update set incoming=public.inventory.incoming+excluded.incoming
    returning id into v_inventory;
  insert into public.inventory_movements(inventory_id,delta,incoming_delta,kind,reason,actor_id,operation_id)
    values(v_inventory,0,p_quantity,'purchase_order','Purchase order placed',auth.uid(),v_item);
  return v_po;
end$$;
revoke all on function public.create_purchase_order(uuid,uuid,uuid,uuid,int,numeric) from public;
grant execute on function public.create_purchase_order(uuid,uuid,uuid,uuid,int,numeric) to authenticated;

create function public.receive_purchase_order_item(p_item uuid,p_quantity int) returns void language plpgsql security definer set search_path=public as $$
declare v_item record;v_inventory uuid;
begin
  if not public.has_permission('inventory.write') then raise exception 'Forbidden';end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Invalid received quantity';end if;
  select i.*,o.warehouse_id,o.status into v_item from public.purchase_order_items i
    join public.purchase_orders o on o.id=i.purchase_order_id where i.id=p_item for update of i,o;
  if not found or v_item.status not in ('placed','partially_received') then raise exception 'Purchase order unavailable';end if;
  if v_item.received_quantity+p_quantity>v_item.quantity then raise exception 'Over receipt';end if;
  select id into v_inventory from public.inventory where product_id=v_item.product_id
    and variant_id is not distinct from v_item.variant_id and warehouse_id=v_item.warehouse_id for update;
  if v_inventory is null then raise exception 'Inventory location missing';end if;
  update public.purchase_order_items set received_quantity=received_quantity+p_quantity where id=p_item;
  update public.inventory set on_hand=on_hand+p_quantity,incoming=incoming-p_quantity where id=v_inventory;
  insert into public.inventory_movements(inventory_id,delta,incoming_delta,kind,reason,actor_id,operation_id)
    values(v_inventory,p_quantity,-p_quantity,'receiving','Purchase order received',auth.uid(),p_item);
  update public.purchase_orders set status=case when exists(
    select 1 from public.purchase_order_items where purchase_order_id=v_item.purchase_order_id and received_quantity<quantity
  ) then 'partially_received' else 'received' end where id=v_item.purchase_order_id;
end$$;
revoke all on function public.receive_purchase_order_item(uuid,int) from public;
grant execute on function public.receive_purchase_order_item(uuid,int) to authenticated;

-- Staff may manage suppliers and locations, but stock/receipts are RPC-only.
revoke all on public.inventory,public.inventory_movements,public.purchase_orders,public.purchase_order_items,public.suppliers,public.supplier_products,public.warehouses from anon,authenticated;
grant select on public.inventory,public.inventory_movements,public.purchase_orders,public.purchase_order_items,public.suppliers,public.supplier_products,public.warehouses to authenticated;
grant insert,update on public.suppliers,public.supplier_products,public.warehouses to authenticated;
revoke execute on function public.sync_catalog_stock_from_inventory(),public.sync_inventory_from_catalog(),public.inventory_variant_matches(),public.immutable_inventory_movement(),public.archive_base_stock_after_variant() from public;
