-- A coupon is private until a customer presents its code. Automatic promotions
-- (code IS NULL) are considered at checkout; only the best one applies.
drop policy if exists promotions_public on public.promotions;
create policy promotions_staff_select on public.promotions for select to authenticated using(public.has_permission('catalog.write'));
create policy promotion_usage_staff on public.coupon_usage for select to authenticated using(public.has_permission('catalog.write'));
create policy promotion_usage_own on public.coupon_usage for select to authenticated using(user_id=auth.uid());

alter table public.promotions add constraint promotions_code_format check(code is null or code ~ '^[A-Z0-9_-]{3,40}$');
alter table public.promotions add constraint promotions_usage_limit_valid check(usage_limit is null or usage_limit>0);
alter table public.promotions add constraint promotions_customer_limit_valid check(per_customer_limit is null or per_customer_limit>0);
create unique index promotions_code_case_insensitive on public.promotions(upper(code)) where code is not null;
create index coupon_usage_customer_idx on public.coupon_usage(promotion_id,user_id);
alter table public.orders add column promotion_id uuid references public.promotions(id);
alter table public.orders add column promotion_snapshot jsonb;

-- The function owner reads catalog prices and promotion targets. Callers never
-- submit amounts, discount values or target IDs.
create function public.compute_checkout_quote(p_code text default null,p_lock boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_cart uuid;
  v_subtotal numeric(12,2):=0;
  v_eligible numeric(12,2);
  v_discount numeric(12,2);
  v_best_discount numeric(12,2):=0;
  v_best public.promotions%rowtype;
  v_promo public.promotions%rowtype;
  v_row record;
  v_code text:=nullif(upper(trim(p_code)),'');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_code is not null and v_code !~ '^[A-Z0-9_-]{3,40}$' then raise exception 'Invalid coupon'; end if;
  select id into v_cart from public.carts where user_id=auth.uid();
  if v_cart is null or not exists(select 1 from public.cart_items where cart_id=v_cart) then raise exception 'Cart is empty'; end if;
  for v_row in
    select ci.product_id,ci.variant_id,ci.quantity,p.status,p.stock as product_stock,p.price_egp,p.sale_price_egp,
      v.stock as variant_stock,v.price_egp as variant_price
    from public.cart_items ci join public.products p on p.id=ci.product_id
    left join public.product_variants v on v.id=ci.variant_id and v.product_id=p.id
    where ci.cart_id=v_cart
  loop
    if v_row.status<>'active' then raise exception 'Product unavailable'; end if;
    if v_row.variant_id is null and exists(select 1 from public.product_variants where product_id=v_row.product_id) then raise exception 'Variant required'; end if;
    if v_row.variant_id is not null and v_row.variant_stock is null then raise exception 'Variant unavailable'; end if;
    if coalesce(v_row.variant_stock,v_row.product_stock)<v_row.quantity then raise exception 'Stock changed'; end if;
    v_subtotal:=v_subtotal+coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp)*v_row.quantity;
  end loop;

  -- Lock promotions before counting uses at placement. Concurrent checkouts
  -- serialize on these rows, so neither global nor customer limits can race.
  if p_lock then
    perform id from public.promotions where active and (v_code is null and code is null or code=v_code) order by id for update;
  end if;
  for v_promo in select * from public.promotions where active and now()>=starts_at and now()<ends_at
      and (v_code is null and code is null or code=v_code) order by id
  loop
    if v_subtotal<v_promo.min_total_egp then continue; end if;
    if v_promo.usage_limit is not null and
      (select count(*) from public.coupon_usage where promotion_id=v_promo.id)>=v_promo.usage_limit then continue; end if;
    if v_promo.per_customer_limit is not null and
      (select count(*) from public.coupon_usage where promotion_id=v_promo.id and user_id=auth.uid())>=v_promo.per_customer_limit then continue; end if;

    if exists(select 1 from public.promotion_targets where promotion_id=v_promo.id) then
      select coalesce(sum(coalesce(v.price_egp,p.sale_price_egp,p.price_egp)*ci.quantity),0)
      into v_eligible
      from public.cart_items ci join public.products p on p.id=ci.product_id
      left join public.product_variants v on v.id=ci.variant_id and v.product_id=p.id
      where ci.cart_id=v_cart and exists(
        select 1 from public.promotion_targets t where t.promotion_id=v_promo.id
        and (t.product_id=p.id or t.category_id=p.category_id or t.brand_id=p.brand_id)
      );
    else
      v_eligible:=v_subtotal;
    end if;
    if v_eligible<=0 then continue; end if;
    if v_promo.type='percent' then
      v_discount:=round(v_eligible*v_promo.value/100,2);
    else
      v_discount:=least(v_eligible,v_promo.value);
    end if;
    if v_discount>v_best_discount then v_best_discount:=v_discount;v_best:=v_promo; end if;
  end loop;
  if v_code is not null and v_best.id is null then raise exception 'Coupon unavailable'; end if;
  return jsonb_build_object(
    'subtotal_egp',v_subtotal,'discount_egp',v_best_discount,
    'total_egp',v_subtotal-v_best_discount,
    'promotion_id',v_best.id,'promotion_name',v_best.name,'code',v_best.code,
    'promotion_snapshot',case when v_best.id is null then null else
      jsonb_build_object('id',v_best.id,'code',v_best.code,'name',v_best.name,
        'type',v_best.type,'value',v_best.value,'discount_egp',v_best_discount) end
  );
end$$;
revoke all on function public.compute_checkout_quote(text,boolean) from public,anon,authenticated;

create function public.quote_cart(p_code text default null) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  return public.compute_checkout_quote(p_code,false);
end$$;
revoke all on function public.quote_cart(text) from public,anon;
grant execute on function public.quote_cart(text) to authenticated;

drop function public.place_order(uuid,text);
create function public.place_order(p_address uuid,p_method text,p_code text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_cart uuid;v_address jsonb;v_quote jsonb;v_order uuid;v_row record;begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_method not in ('card','instapay') then raise exception 'Invalid payment method';end if;
  select to_jsonb(a) - 'user_id' into v_address from public.addresses a where id=p_address and user_id=auth.uid();
  if v_address is null then raise exception 'Address not found';end if;
  select id into v_cart from public.carts where user_id=auth.uid() for update;
  if v_cart is null or not exists(select 1 from public.cart_items where cart_id=v_cart) then raise exception 'Cart is empty';end if;
  perform id from public.products where id in(select product_id from public.cart_items where cart_id=v_cart) order by id for update;
  perform id from public.product_variants where id in(select variant_id from public.cart_items where cart_id=v_cart and variant_id is not null) order by id for update;
  v_quote:=public.compute_checkout_quote(p_code,true);
  insert into public.orders(user_id,address_snapshot,subtotal_egp,discount_egp,total_egp,promotion_id,promotion_snapshot)
    values(auth.uid(),v_address,(v_quote->>'subtotal_egp')::numeric,(v_quote->>'discount_egp')::numeric,
      (v_quote->>'total_egp')::numeric,(v_quote->>'promotion_id')::uuid,v_quote->'promotion_snapshot') returning id into v_order;
  for v_row in select ci.product_id,ci.variant_id,ci.quantity,p.price_egp,p.sale_price_egp,v.price_egp as variant_price,p.sku as product_sku,v.sku as variant_sku,p.name_ar,p.name_en,v.attributes from public.cart_items ci join public.products p on p.id=ci.product_id left join public.product_variants v on v.id=ci.variant_id and v.product_id=p.id where ci.cart_id=v_cart loop
    insert into public.order_items(order_id,product_id,variant_id,sku_snapshot,name_ar_snapshot,name_en_snapshot,variant_snapshot,quantity,unit_price_egp,total_egp) values(v_order,v_row.product_id,v_row.variant_id,coalesce(v_row.variant_sku,v_row.product_sku),v_row.name_ar,v_row.name_en,coalesce(v_row.attributes,'{}'::jsonb),v_row.quantity,coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp),coalesce(v_row.variant_price,v_row.sale_price_egp,v_row.price_egp)*v_row.quantity);
    if v_row.variant_id is null then update public.products set stock=stock-v_row.quantity where id=v_row.product_id;
    else update public.product_variants set stock=stock-v_row.quantity where id=v_row.variant_id;end if;
  end loop;
  if v_quote->>'promotion_id' is not null then
    insert into public.coupon_usage(promotion_id,user_id,order_id) values((v_quote->>'promotion_id')::uuid,auth.uid(),v_order);
  end if;
  insert into public.order_history(order_id,status,actor_id) values(v_order,'pending_payment',auth.uid());
  insert into public.payments(user_id,order_id,provider,method,amount_egp) values(auth.uid(),v_order,'pending',p_method,(v_quote->>'total_egp')::numeric);
  delete from public.cart_items where cart_id=v_cart;
  return v_order;
end$$;
revoke all on function public.place_order(uuid,text,text) from public,anon;
grant execute on function public.place_order(uuid,text,text) to authenticated;

-- One database transaction updates promotion details and all targets. This
-- prevents a partly saved offer when a target ID or date is invalid.
create function public.save_promotion(
  p_id uuid,p_code text,p_name text,p_type text,p_value numeric,p_min_total numeric,
  p_global_limit int,p_customer_limit int,p_starts timestamptz,p_ends timestamptz,
  p_active boolean,p_targets jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_target jsonb;v_kind text;v_target_id uuid;begin
  if not public.has_permission('catalog.write') then raise exception 'Forbidden';end if;
  if p_name is null or length(trim(p_name))<3 or length(p_name)>120 then raise exception 'Invalid promotion name';end if;
  if p_targets is null or jsonb_typeof(p_targets)<>'array' or jsonb_array_length(p_targets)>100 then raise exception 'Invalid targets';end if;
  if p_id is null then
    insert into public.promotions(code,name,type,value,min_total_egp,usage_limit,per_customer_limit,starts_at,ends_at,active)
      values(nullif(upper(trim(p_code)),''),trim(p_name),p_type,p_value,p_min_total,p_global_limit,p_customer_limit,p_starts,p_ends,p_active)
      returning id into v_id;
  else
    update public.promotions set code=nullif(upper(trim(p_code)),''),name=trim(p_name),type=p_type,value=p_value,
      min_total_egp=p_min_total,usage_limit=p_global_limit,per_customer_limit=p_customer_limit,
      starts_at=p_starts,ends_at=p_ends,active=p_active where id=p_id returning id into v_id;
    if v_id is null then raise exception 'Promotion not found';end if;
    delete from public.promotion_targets where promotion_id=v_id;
  end if;
  for v_target in select value from jsonb_array_elements(p_targets) loop
    v_kind:=v_target->>'kind';
    if v_kind not in ('product','category','brand') then raise exception 'Invalid target kind';end if;
    v_target_id:=(v_target->>'id')::uuid;
    insert into public.promotion_targets(promotion_id,product_id,category_id,brand_id)
      values(v_id,case when v_kind='product' then v_target_id end,
        case when v_kind='category' then v_target_id end,
        case when v_kind='brand' then v_target_id end);
  end loop;
  return v_id;
end$$;
revoke all on function public.save_promotion(uuid,text,text,text,numeric,numeric,int,int,timestamptz,timestamptz,boolean,jsonb) from public,anon;
grant execute on function public.save_promotion(uuid,text,text,text,numeric,numeric,int,int,timestamptz,timestamptz,boolean,jsonb) to authenticated;
