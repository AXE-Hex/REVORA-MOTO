alter table public.order_items add column variant_snapshot jsonb not null default '{}'::jsonb;
drop function public.add_cart_item(uuid,int);
create function public.add_cart_item(p_product uuid,p_quantity int default 1,p_variant uuid default null) returns void language plpgsql security definer set search_path=public as $$declare v_cart uuid;v_stock int;begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_quantity<1 or p_quantity>99 then raise exception 'Invalid quantity';end if;
  if not exists(select 1 from public.products where id=p_product and status='active') then raise exception 'Product unavailable';end if;
  if p_variant is null then
    if exists(select 1 from public.product_variants where product_id=p_product) then raise exception 'Variant required';end if;
    select stock into v_stock from public.products where id=p_product;
  else
    select stock into v_stock from public.product_variants where id=p_variant and product_id=p_product;
  end if;
  if v_stock is null or v_stock<p_quantity then raise exception 'Product unavailable';end if;
  insert into public.carts(user_id) values(auth.uid()) on conflict(user_id) do update set updated_at=now() returning id into v_cart;
  insert into public.cart_items(cart_id,product_id,variant_id,quantity) values(v_cart,p_product,p_variant,p_quantity) on conflict(cart_id,product_id,variant_id) do update set quantity=least(99,public.cart_items.quantity+excluded.quantity);
end$$;
revoke all on function public.add_cart_item(uuid,int,uuid) from public;
grant execute on function public.add_cart_item(uuid,int,uuid) to authenticated;

create or replace function public.place_order(p_address uuid,p_method text) returns uuid language plpgsql security definer set search_path=public as $$declare v_cart uuid;v_address jsonb;v_total numeric:=0;v_order uuid;v_row record;begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_method not in ('card','instapay') then raise exception 'Invalid payment method';end if;
  select to_jsonb(a) - 'user_id' into v_address from public.addresses a where id=p_address and user_id=auth.uid();
  if v_address is null then raise exception 'Address not found';end if;
  select id into v_cart from public.carts where user_id=auth.uid() for update;
  if v_cart is null or not exists(select 1 from public.cart_items where cart_id=v_cart) then raise exception 'Cart is empty';end if;
  perform id from public.products where id in(select product_id from public.cart_items where cart_id=v_cart) order by id for update;
  perform id from public.product_variants where id in(select variant_id from public.cart_items where cart_id=v_cart and variant_id is not null) order by id for update;
  for v_row in select ci.product_id,ci.variant_id,ci.quantity,p.stock as product_stock,v.stock as variant_stock,p.price_egp,p.sale_price_egp,v.price_egp as variant_price,p.sku as product_sku,v.sku as variant_sku,p.name_ar,p.name_en,p.status,v.attributes from public.cart_items ci join public.products p on p.id=ci.product_id left join public.product_variants v on v.id=ci.variant_id and v.product_id=p.id where ci.cart_id=v_cart loop
    if v_row.status<>'active' then raise exception 'Product unavailable';end if;
    if v_row.variant_id is null and exists(select 1 from public.product_variants where product_id=v_row.product_id) then raise exception 'Variant required';end if;
    if v_row.variant_id is not null and v_row.variant_stock is null then raise exception 'Variant unavailable';end if;
    if coalesce(v_row.variant_stock,v_row.product_stock)<v_row.quantity then raise exception 'Stock changed for %',coalesce(v_row.variant_sku,v_row.product_sku);end if;
    v_total:=v_total+coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp)*v_row.quantity;
  end loop;
  insert into public.orders(user_id,address_snapshot,subtotal_egp,total_egp) values(auth.uid(),v_address,v_total,v_total) returning id into v_order;
  for v_row in select ci.product_id,ci.variant_id,ci.quantity,p.price_egp,p.sale_price_egp,v.price_egp as variant_price,p.sku as product_sku,v.sku as variant_sku,p.name_ar,p.name_en,v.attributes from public.cart_items ci join public.products p on p.id=ci.product_id left join public.product_variants v on v.id=ci.variant_id and v.product_id=p.id where ci.cart_id=v_cart loop
    insert into public.order_items(order_id,product_id,variant_id,sku_snapshot,name_ar_snapshot,name_en_snapshot,variant_snapshot,quantity,unit_price_egp,total_egp) values(v_order,v_row.product_id,v_row.variant_id,coalesce(v_row.variant_sku,v_row.product_sku),v_row.name_ar,v_row.name_en,coalesce(v_row.attributes,'{}'::jsonb),v_row.quantity,coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp),coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp)*v_row.quantity);
    if v_row.variant_id is null then update public.products set stock=stock-v_row.quantity where id=v_row.product_id;
    else update public.product_variants set stock=stock-v_row.quantity where id=v_row.variant_id;end if;
  end loop;
  insert into public.order_history(order_id,status,actor_id) values(v_order,'pending_payment',auth.uid());
  insert into public.payments(user_id,order_id,provider,method,amount_egp) values(auth.uid(),v_order,'pending',p_method,v_total);
  delete from public.cart_items where cart_id=v_cart;
  return v_order;
end$$;
create or replace view public.public_products with (security_invoker=true) as select p.id,p.slug,p.sku,p.name_ar,p.name_en,p.description_ar,p.description_en,p.price_egp,p.sale_price_egp,case when exists(select 1 from public.product_variants v where v.product_id=p.id) then (select coalesce(sum(v.stock),0)::int from public.product_variants v where v.product_id=p.id) else p.stock end as stock,p.image_url,p.featured,p.category_id,p.brand_id,c.slug as category_slug,b.slug as brand_slug,p.is_demo from public.products p left join public.categories c on c.id=p.category_id left join public.brands b on b.id=p.brand_id where p.status='active';
