begin;
insert into auth.users(id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at)
values
  ('58888888-8888-4888-8888-888888888888', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'cart-quantity-owner@example.test', '', now(), now(), now()),
  ('59999999-9999-4999-8999-999999999999', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'cart-quantity-other@example.test', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '58888888-8888-4888-8888-888888888888', true);
select public.add_cart_item((select id from public.products where sku = 'HLM-001'), 1);
select ci.id as owner_item from public.cart_items ci
  join public.carts c on c.id = ci.cart_id
 where c.user_id = auth.uid() and ci.product_id = (select id from public.products where sku = 'HLM-001')
\gset
select set_config('test.cart_item', :'owner_item', true);
select public.update_cart_item_quantity(:'owner_item', 4);

do $$declare v_item uuid := current_setting('test.cart_item')::uuid; begin
  if (select quantity from public.cart_items where id = v_item) <> 4 then
    raise exception 'Owner quantity update failed';
  end if;
  begin
    perform public.update_cart_item_quantity(v_item, 100);
    raise exception 'Out-of-range quantity accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid quantity' then raise; end if;
  end;
  begin
    perform public.update_cart_item_quantity(v_item, 99);
    raise exception 'Quantity above stock accepted';
  exception when raise_exception then
    if sqlerrm <> 'Insufficient available stock' then raise; end if;
  end;
end$$;

select set_config('request.jwt.claim.sub', '59999999-9999-4999-8999-999999999999', true);
do $$begin
  begin
    perform public.update_cart_item_quantity(current_setting('test.cart_item')::uuid, 2);
    raise exception 'Customer updated another cart item';
  exception when raise_exception then
    if sqlerrm <> 'Cart item not found' then raise; end if;
  end;
end$$;

do $$begin
  if has_table_privilege('authenticated', 'public.cart_items', 'INSERT') or
     has_table_privilege('authenticated', 'public.cart_items', 'UPDATE') or
     has_table_privilege('authenticated', 'public.cart_items', 'DELETE') or
     has_table_privilege('authenticated', 'public.cart_items', 'TRUNCATE') or
     has_table_privilege('anon', 'public.cart_items', 'UPDATE') then
    raise exception 'Direct cart item mutation privileges remain exposed';
  end if;
  if not has_table_privilege('authenticated', 'public.cart_items', 'SELECT') then
    raise exception 'Customers cannot read their own cart items';
  end if;
end$$;
rollback;
