-- Fulfillment keeps physical stock on hand until shipment and reserves it at checkout.
insert into public.permissions(id,description) values('fulfillment.write','Ship paid orders') on conflict(id) do nothing;
insert into public.role_permissions(role_id,permission_id)
  values('owner','fulfillment.write'),('super_admin','fulfillment.write'),('admin','fulfillment.write'),
    ('store_manager','fulfillment.write'),('warehouse','fulfillment.write')
  on conflict do nothing;

create table public.order_stock_allocations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id),
  quantity integer not null check (quantity > 0),
  status text not null default 'reserved' check (status in ('reserved','fulfilled','released')),
  created_at timestamptz not null default now(),
  changed_at timestamptz,
  unique (order_item_id,inventory_id)
);
create index order_stock_allocations_inventory_idx on public.order_stock_allocations(inventory_id,status);
alter table public.order_stock_allocations enable row level security;
create policy order_stock_allocations_staff_read on public.order_stock_allocations for select to authenticated
  using(public.has_permission('orders.read') or public.has_permission('inventory.write'));
revoke all on public.order_stock_allocations from anon,authenticated;
grant select on public.order_stock_allocations to authenticated;

create table public.order_checkout_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  order_id uuid unique references public.orders(id),
  created_at timestamptz not null default now(),
  primary key(user_id,request_key)
);
alter table public.order_checkout_requests enable row level security;
revoke all on public.order_checkout_requests from anon,authenticated;

create function public.available_product_stock(p_product uuid,p_variant uuid default null) returns integer
language sql stable security definer set search_path=public as $$
  select case when exists(select 1 from public.products p where p.id=p_product and p.status='active')
    then coalesce((select sum(i.on_hand-i.reserved)::integer from public.inventory i
      where i.product_id=p_product and i.variant_id is not distinct from p_variant),0)
    else 0 end;
$$;
revoke all on function public.available_product_stock(uuid,uuid) from public;
grant execute on function public.available_product_stock(uuid,uuid) to anon,authenticated;

create or replace function public.add_cart_item(p_product uuid,p_quantity int default 1,p_variant uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_cart uuid;v_current integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity<1 or p_quantity>99 then raise exception 'Invalid quantity'; end if;
  if not exists(select 1 from public.products where id=p_product and status='active') then raise exception 'Product unavailable'; end if;
  if p_variant is null and exists(select 1 from public.product_variants where product_id=p_product) then
    raise exception 'Variant required';
  end if;
  if p_variant is not null and not exists(select 1 from public.product_variants where id=p_variant and product_id=p_product) then
    raise exception 'Variant unavailable';
  end if;
  insert into public.carts(user_id) values(auth.uid()) on conflict(user_id) do update set updated_at=now() returning id into v_cart;
  select coalesce((select quantity from public.cart_items where cart_id=v_cart and product_id=p_product
    and variant_id is not distinct from p_variant),0) into v_current;
  if v_current+p_quantity>99 or public.available_product_stock(p_product,p_variant)<v_current+p_quantity then
    raise exception 'Insufficient available stock';
  end if;
  insert into public.cart_items(cart_id,product_id,variant_id,quantity)
    values(v_cart,p_product,p_variant,p_quantity)
    on conflict(cart_id,product_id,variant_id) do update set quantity=public.cart_items.quantity+excluded.quantity;
end$$;

create or replace view public.public_products with (security_invoker=true) as
select p.id,p.slug,p.sku,p.name_ar,p.name_en,p.description_ar,p.description_en,p.price_egp,p.sale_price_egp,
  case when exists(select 1 from public.product_variants v where v.product_id=p.id)
    then (select coalesce(sum(public.available_product_stock(p.id,v.id)),0)::integer
      from public.product_variants v where v.product_id=p.id)
    else public.available_product_stock(p.id,null) end as stock,
  p.image_url,p.featured,p.category_id,p.brand_id,c.slug as category_slug,b.slug as brand_slug,p.is_demo,p.created_at,
  coalesce(p.sale_price_egp,p.price_egp) as effective_price_egp
from public.products p left join public.categories c on c.id=p.category_id
left join public.brands b on b.id=p.brand_id where p.status='active';

create view public.public_product_variants with (security_invoker=true) as
select v.id,v.product_id,v.sku,v.attributes,v.price_egp,
  public.available_product_stock(v.product_id,v.id) as stock,v.image_url
from public.product_variants v join public.products p on p.id=v.product_id where p.status='active';
grant select on public.public_product_variants to anon,authenticated;

create table public.order_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  carrier text not null check (length(trim(carrier)) between 2 and 100),
  tracking_number text not null check (length(trim(tracking_number)) between 3 and 120),
  shipped_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_by uuid references auth.users(id)
);
create index order_shipments_tracking_idx on public.order_shipments(carrier,tracking_number);
alter table public.order_shipments enable row level security;
create policy order_shipments_owner_read on public.order_shipments for select to authenticated using(
  exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_permission('orders.read')))
);
revoke all on public.order_shipments from anon,authenticated;
grant select on public.order_shipments to authenticated;

alter table public.order_history add column detail jsonb not null default '{}'::jsonb;
alter table public.invoices add constraint invoice_snapshot_object check(jsonb_typeof(snapshot)='object');
revoke insert,update,delete on public.invoices from anon,authenticated;
alter table public.orders add column tax_rate_percent_snapshot numeric(5,2) not null default 0
  check(tax_rate_percent_snapshot between 0 and 100);
alter table public.orders add column expires_at timestamptz;
-- Existing pending orders receive a full grace period when this migration is applied.
update public.orders set expires_at=now()+interval '48 hours' where status='pending_payment';
alter table public.orders alter column expires_at set default (now()+interval '48 hours');
alter table public.orders add constraint orders_totals_valid check(
  subtotal_egp>=0 and discount_egp>=0 and discount_egp<=subtotal_egp and
  tax_egp>=0 and shipping_egp>=0 and total_egp=subtotal_egp-discount_egp+tax_egp+shipping_egp
);

-- These are commercial settings, so only settings staff can change them and
-- checkout reads them inside the same database transaction as order creation.
insert into public.site_settings(key,value) values
  ('shipping_flat_egp','0'::jsonb),('tax_rate_percent','0'::jsonb)
on conflict(key) do nothing;
create function public.admin_set_checkout_rates(p_shipping numeric,p_tax_percent numeric) returns void
language plpgsql security definer set search_path=public as $$
declare v_before jsonb;
begin
  if not public.has_permission('settings.write') then raise exception 'Forbidden'; end if;
  if p_shipping is null or p_shipping<0 or p_shipping>10000 or p_shipping<>round(p_shipping,2)
    or p_tax_percent is null or p_tax_percent<0 or p_tax_percent>100 or p_tax_percent<>round(p_tax_percent,2)
  then raise exception 'Invalid checkout rates'; end if;
  select jsonb_object_agg(key,value) into v_before from public.site_settings
    where key in ('shipping_flat_egp','tax_rate_percent');
  insert into public.site_settings(key,value,updated_at)
    values('shipping_flat_egp',to_jsonb(p_shipping),now()),('tax_rate_percent',to_jsonb(p_tax_percent),now())
    on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  insert into public.audit_logs(actor_id,action,entity,detail)
    values(auth.uid(),'checkout.rates.update','site_settings',jsonb_build_object(
      'before',v_before,'after',jsonb_build_object('shipping_flat_egp',p_shipping,'tax_rate_percent',p_tax_percent)));
end$$;
revoke all on function public.admin_set_checkout_rates(numeric,numeric) from public,anon;
grant execute on function public.admin_set_checkout_rates(numeric,numeric) to authenticated;

create function public.compute_order_quote(p_code text default null,p_lock boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_quote jsonb;v_shipping numeric(12,2);v_tax_rate numeric(5,2);v_tax numeric(12,2);v_net numeric(12,2);v_item record;
begin
  for v_item in select ci.product_id,ci.variant_id,ci.quantity
    from public.cart_items ci join public.carts c on c.id=ci.cart_id where c.user_id=auth.uid()
  loop
    if public.available_product_stock(v_item.product_id,v_item.variant_id)<v_item.quantity then
      raise exception 'Insufficient available stock';
    end if;
  end loop;
  v_quote:=public.compute_checkout_quote(p_code,p_lock);
  select coalesce((select (value #>> '{}')::numeric from public.site_settings where key='shipping_flat_egp'),0)
    into v_shipping;
  select coalesce((select (value #>> '{}')::numeric from public.site_settings where key='tax_rate_percent'),0)
    into v_tax_rate;
  if v_shipping<0 or v_shipping>10000 or v_tax_rate<0 or v_tax_rate>100 then
    raise exception 'Invalid checkout configuration';
  end if;
  v_net:=(v_quote->>'total_egp')::numeric;
  v_tax:=round(v_net*v_tax_rate/100,2);
  return v_quote || jsonb_build_object('shipping_egp',v_shipping,'tax_egp',v_tax,
    'tax_rate_percent',v_tax_rate,'total_egp',v_net+v_shipping+v_tax);
end$$;
revoke all on function public.compute_order_quote(text,boolean) from public,anon,authenticated;

create or replace function public.quote_cart(p_code text default null) returns jsonb
language plpgsql security definer set search_path=public as $$begin
  return public.compute_order_quote(p_code,false);
end$$;

-- Reserve stock by location, with row locks to serialize simultaneous checkouts.
create function public.reserve_order_item_stock(p_order_item uuid,p_product uuid,p_variant uuid,p_quantity integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_left integer:=p_quantity;v_take integer;v_row record;
begin
  if p_quantity is null or p_quantity<=0 then raise exception 'Invalid quantity'; end if;
  for v_row in select id,on_hand,reserved from public.inventory
    where product_id=p_product and variant_id is not distinct from p_variant and on_hand>reserved
    order by id for update
  loop
    v_take:=least(v_left,v_row.on_hand-v_row.reserved);
    update public.inventory set reserved=reserved+v_take where id=v_row.id;
    insert into public.order_stock_allocations(order_item_id,inventory_id,quantity)
      values(p_order_item,v_row.id,v_take);
    v_left:=v_left-v_take;
    exit when v_left=0;
  end loop;
  if v_left<>0 then raise exception 'Insufficient available stock'; end if;
end$$;
revoke all on function public.reserve_order_item_stock(uuid,uuid,uuid,integer) from public,anon,authenticated;

drop function public.place_order(uuid,text,text);
create function public.place_order(p_address uuid,p_method text,p_code text default null,p_request_key uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_cart uuid;v_address jsonb;v_quote jsonb;v_order uuid;v_item uuid;v_row record;v_existing uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_method not in ('card','instapay') then raise exception 'Invalid payment method';end if;
  if p_request_key is not null then
    insert into public.order_checkout_requests(user_id,request_key) values(auth.uid(),p_request_key)
      on conflict(user_id,request_key) do nothing;
    select order_id into v_existing from public.order_checkout_requests
      where user_id=auth.uid() and request_key=p_request_key for update;
    if v_existing is not null then return v_existing; end if;
  end if;
  select to_jsonb(a)-'user_id' into v_address from public.addresses a where id=p_address and user_id=auth.uid();
  if v_address is null then raise exception 'Address not found';end if;
  select id into v_cart from public.carts where user_id=auth.uid() for update;
  if v_cart is null or not exists(select 1 from public.cart_items where cart_id=v_cart) then raise exception 'Cart is empty';end if;
  perform id from public.products where id in(select product_id from public.cart_items where cart_id=v_cart) order by id for update;
  perform id from public.product_variants where id in(select variant_id from public.cart_items where cart_id=v_cart and variant_id is not null) order by id for update;
  v_quote:=public.compute_order_quote(p_code,true);
  insert into public.orders(user_id,address_snapshot,subtotal_egp,discount_egp,tax_egp,shipping_egp,total_egp,
    tax_rate_percent_snapshot,promotion_id,promotion_snapshot)
    values(auth.uid(),v_address,(v_quote->>'subtotal_egp')::numeric,(v_quote->>'discount_egp')::numeric,
      (v_quote->>'tax_egp')::numeric,(v_quote->>'shipping_egp')::numeric,(v_quote->>'total_egp')::numeric,
      (v_quote->>'tax_rate_percent')::numeric,
      (v_quote->>'promotion_id')::uuid,v_quote->'promotion_snapshot') returning id into v_order;
  for v_row in select ci.product_id,ci.variant_id,ci.quantity,p.price_egp,p.sale_price_egp,
      v.price_egp as variant_price,p.sku as product_sku,v.sku as variant_sku,p.name_ar,p.name_en,v.attributes
    from public.cart_items ci join public.products p on p.id=ci.product_id
    left join public.product_variants v on v.id=ci.variant_id and v.product_id=p.id
    where ci.cart_id=v_cart order by ci.product_id,ci.variant_id
  loop
    insert into public.order_items(order_id,product_id,variant_id,sku_snapshot,name_ar_snapshot,name_en_snapshot,
      variant_snapshot,quantity,unit_price_egp,total_egp)
      values(v_order,v_row.product_id,v_row.variant_id,coalesce(v_row.variant_sku,v_row.product_sku),
      v_row.name_ar,v_row.name_en,coalesce(v_row.attributes,'{}'::jsonb),v_row.quantity,
      coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp),
      coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp)*v_row.quantity)
      returning id into v_item;
    perform public.reserve_order_item_stock(v_item,v_row.product_id,v_row.variant_id,v_row.quantity);
  end loop;
  if v_quote->>'promotion_id' is not null then
    insert into public.coupon_usage(promotion_id,user_id,order_id)
      values((v_quote->>'promotion_id')::uuid,auth.uid(),v_order);
  end if;
  insert into public.order_history(order_id,status,actor_id) values(v_order,'pending_payment',auth.uid());
  insert into public.payments(user_id,order_id,provider,method,amount_egp)
    values(auth.uid(),v_order,'pending',p_method,(v_quote->>'total_egp')::numeric);
  delete from public.cart_items where cart_id=v_cart;
  if p_request_key is not null then
    update public.order_checkout_requests set order_id=v_order
      where user_id=auth.uid() and request_key=p_request_key;
  end if;
  return v_order;
end$$;
revoke all on function public.place_order(uuid,text,text,uuid) from public,anon;
grant execute on function public.place_order(uuid,text,text,uuid) to authenticated;

-- A captured payment issues one immutable snapshot. Provider confirmation sets
-- payment.status before order.status, so this trigger sees the payment method.
create function public.issue_order_invoice() returns trigger language plpgsql security definer set search_path=public as $$
declare v_snapshot jsonb;
begin
  if new.status<>'paid' or old.status='paid' then return new; end if;
  select jsonb_build_object('brand','REVORA MOTO','currency','EGP','order_id',new.id,
    'order_number',new.order_number,'order_created_at',new.created_at,'issued_at',now(),
    'customer',jsonb_build_object('name',coalesce(p.full_name,''),'address',new.address_snapshot),
    'items',coalesce((select jsonb_agg(jsonb_build_object('sku',i.sku_snapshot,'name_ar',i.name_ar_snapshot,
      'name_en',i.name_en_snapshot,'variant',i.variant_snapshot,'quantity',i.quantity,
      'unit_price_egp',i.unit_price_egp,'total_egp',i.total_egp) order by i.id)
      from public.order_items i where i.order_id=new.id),'[]'::jsonb),
    'subtotal_egp',new.subtotal_egp,'discount_egp',new.discount_egp,'tax_egp',new.tax_egp,
    'shipping_egp',new.shipping_egp,'tax_rate_percent',new.tax_rate_percent_snapshot,'total_egp',new.total_egp,
    'payment',(select jsonb_build_object('method',pay.method,'provider',pay.provider,
      'reference',pay.provider_reference,'status',pay.status) from public.payments pay
      where pay.order_id=new.id and pay.status='captured' order by pay.created_at desc limit 1))
    into v_snapshot from (select 1) x left join public.profiles p on p.id=new.user_id;
  insert into public.invoices(order_id,snapshot) values(new.id,v_snapshot) on conflict(order_id) do nothing;
  return new;
end$$;
create trigger issue_invoice_on_paid after update of status on public.orders
for each row execute function public.issue_order_invoice();
revoke all on function public.issue_order_invoice() from public,anon,authenticated;

-- Existing captured orders receive a snapshot without changing their status.
do $$declare v_order record;begin
  for v_order in select id from public.orders where status in ('paid','processing','shipped','delivered')
    and not exists(select 1 from public.invoices where order_id=orders.id)
  loop
    -- Backfill uses the same immutable order data, including original snapshots.
    insert into public.invoices(order_id,snapshot)
    select o.id,jsonb_build_object('brand','REVORA MOTO','currency','EGP','order_id',o.id,
      'order_number',o.order_number,'order_created_at',o.created_at,'issued_at',now(),
      'customer',jsonb_build_object('name',coalesce(p.full_name,''),'address',o.address_snapshot),
      'items',coalesce((select jsonb_agg(jsonb_build_object('sku',i.sku_snapshot,'name_ar',i.name_ar_snapshot,
        'name_en',i.name_en_snapshot,'variant',i.variant_snapshot,'quantity',i.quantity,
        'unit_price_egp',i.unit_price_egp,'total_egp',i.total_egp) order by i.id)
        from public.order_items i where i.order_id=o.id),'[]'::jsonb),
      'subtotal_egp',o.subtotal_egp,'discount_egp',o.discount_egp,'tax_egp',o.tax_egp,
      'shipping_egp',o.shipping_egp,'tax_rate_percent',o.tax_rate_percent_snapshot,'total_egp',o.total_egp,
      'payment',(select jsonb_build_object('method',pay.method,'provider',pay.provider,
        'reference',pay.provider_reference,'status',pay.status) from public.payments pay
        where pay.order_id=o.id and pay.status='captured' order by pay.created_at desc limit 1))
    from public.orders o left join public.profiles p on p.id=o.user_id where o.id=v_order.id;
  end loop;
end$$;

-- A failed payment or expired pending order releases reservations atomically.
-- This RPC is also used by the checked staff transition below.
create function public.cancel_unpaid_order(p_order uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_item record;v_allocation record;
begin
  select * into v_order from public.orders where id=p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status='cancelled' then return; end if;
  if v_order.status<>'pending_payment' or exists(select 1 from public.payments
    where order_id=p_order and status in ('captured','partially_refunded','refunded'))
  then raise exception 'Paid order cannot be cancelled as unpaid'; end if;
  if exists(select 1 from public.order_stock_allocations a join public.order_items i on i.id=a.order_item_id
    where i.order_id=p_order) then
    for v_allocation in select a.id,a.inventory_id,a.quantity from public.order_stock_allocations a
      join public.order_items i on i.id=a.order_item_id where i.order_id=p_order and a.status='reserved'
      order by a.inventory_id for update of a
    loop
      update public.inventory set reserved=reserved-v_allocation.quantity where id=v_allocation.inventory_id;
      update public.order_stock_allocations set status='released',changed_at=now() where id=v_allocation.id;
    end loop;
  else
    -- Pre-migration checkouts already decremented physical stock.
    for v_item in select product_id,variant_id,quantity from public.order_items where order_id=p_order loop
      if v_item.variant_id is null then update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
      else update public.product_variants set stock=stock+v_item.quantity where id=v_item.variant_id; end if;
    end loop;
  end if;
  with closed as (
    update public.payments set status='cancelled' where order_id=p_order and status in ('pending','authorized')
      returning id
  ) insert into public.payment_events(payment_id,event_type,provider_event_id,payload)
    select id,'cancelled','order-cancel:'||id::text,jsonb_build_object('reason','unpaid_order_cancelled')
    from closed
    on conflict(provider_event_id) do nothing;
  update public.orders set status='cancelled' where id=p_order;
  insert into public.order_history(order_id,status,actor_id) values(p_order,'cancelled',auth.uid());
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(v_order.user_id,'تم إلغاء الطلب','Order cancelled','تم إلغاء الطلب غير المدفوع.','The unpaid order was cancelled.');
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'order.cancel_unpaid','orders',p_order,jsonb_build_object('before',v_order.status,'after','cancelled'));
end$$;
revoke all on function public.cancel_unpaid_order(uuid) from public,anon,authenticated;
grant execute on function public.cancel_unpaid_order(uuid) to service_role;

create function public.cancel_own_unpaid_order(p_order uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not exists(select 1 from public.orders where id=p_order and user_id=auth.uid())
    then raise exception 'Forbidden'; end if;
  perform public.cancel_unpaid_order(p_order);
end$$;
revoke all on function public.cancel_own_unpaid_order(uuid) from public,anon;
grant execute on function public.cancel_own_unpaid_order(uuid) to authenticated;

create function public.expire_unpaid_orders(p_limit integer default 100) returns integer
language plpgsql security definer set search_path=public as $$
declare v_order record;v_count integer:=0;
begin
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'Invalid limit'; end if;
  for v_order in select id from public.orders where status='pending_payment' and expires_at<=now()
    order by expires_at,id limit p_limit for update skip locked
  loop
    perform public.cancel_unpaid_order(v_order.id);
    v_count:=v_count+1;
  end loop;
  return v_count;
end$$;
revoke all on function public.expire_unpaid_orders(integer) from public,anon,authenticated;
grant execute on function public.expire_unpaid_orders(integer) to service_role;

create or replace function public.admin_transition_order(p_order uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;
begin
  if not public.has_permission('orders.write') then raise exception 'Forbidden'; end if;
  select * into v_order from public.orders where id=p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not ((v_order.status='pending_payment' and p_status='cancelled') or
    (v_order.status='paid' and p_status='processing') or
    (v_order.status='shipped' and p_status='delivered')) then raise exception 'Invalid order transition'; end if;
  if p_status='cancelled' then
    perform public.cancel_unpaid_order(p_order);
    return;
  elsif p_status='delivered' then
    update public.order_shipments set delivered_at=now() where order_id=p_order;
    if not found and exists(select 1 from public.order_stock_allocations a join public.order_items i on i.id=a.order_item_id
      where i.order_id=p_order) then raise exception 'Shipment missing'; end if;
  end if;
  update public.orders set status=p_status where id=p_order;
  insert into public.order_history(order_id,status,actor_id) values(p_order,p_status,auth.uid());
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(v_order.user_id,'تحديث حالة الطلب','Order status updated',p_status,p_status);
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'order.transition','orders',p_order,jsonb_build_object('before',v_order.status,'after',p_status));
end$$;

create function public.admin_ship_order(p_order uuid,p_carrier text,p_tracking text)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_allocation record;v_operation uuid:=gen_random_uuid();
begin
  if not (public.has_permission('fulfillment.write') or public.has_permission('orders.write')) then raise exception 'Forbidden'; end if;
  if p_carrier is null or length(trim(p_carrier)) not between 2 and 100 or
    p_tracking is null or length(trim(p_tracking)) not between 3 and 120 or
    p_carrier ~ '[[:cntrl:]]' or p_tracking ~ '[[:cntrl:]]' then raise exception 'Invalid shipment'; end if;
  select * into v_order from public.orders where id=p_order for update;
  if not found or v_order.status<>'processing' then raise exception 'Order is not ready to ship'; end if;
  for v_allocation in select a.id,a.inventory_id,a.quantity from public.order_stock_allocations a
    join public.order_items i on i.id=a.order_item_id where i.order_id=p_order and a.status='reserved'
    order by a.inventory_id for update of a
  loop
    update public.inventory set reserved=reserved-v_allocation.quantity,on_hand=on_hand-v_allocation.quantity
      where id=v_allocation.inventory_id;
    update public.order_stock_allocations set status='fulfilled',changed_at=now() where id=v_allocation.id;
    insert into public.inventory_movements(inventory_id,delta,kind,reason,actor_id,operation_id)
      values(v_allocation.inventory_id,-v_allocation.quantity,'fulfillment','Order shipped',auth.uid(),v_operation);
  end loop;
  insert into public.order_shipments(order_id,carrier,tracking_number,created_by)
    values(p_order,trim(p_carrier),trim(p_tracking),auth.uid());
  update public.orders set status='shipped' where id=p_order;
  insert into public.order_history(order_id,status,actor_id,detail)
    values(p_order,'shipped',auth.uid(),jsonb_build_object('carrier',trim(p_carrier),'tracking_number',trim(p_tracking)));
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(v_order.user_id,'تم شحن طلبك','Your order shipped',trim(p_tracking),trim(p_tracking));
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'order.ship','orders',p_order,jsonb_build_object('carrier',trim(p_carrier),'tracking_number',trim(p_tracking)));
end$$;
revoke all on function public.admin_ship_order(uuid,text,text) from public,anon;
grant execute on function public.admin_ship_order(uuid,text,text) to authenticated;
alter table public.inventory_movements drop constraint inventory_movements_kind_check;
alter table public.inventory_movements add constraint inventory_movements_kind_check
  check(kind in ('bootstrap','adjustment','transfer','receiving','purchase_order','catalog','fulfillment'));
