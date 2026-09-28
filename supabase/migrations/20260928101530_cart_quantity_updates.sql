create function public.update_cart_item_quantity(p_item uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product uuid;
  v_variant uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_item is null or p_quantity is null or p_quantity < 1 or p_quantity > 99 then
    raise exception 'Invalid quantity';
  end if;

  select ci.product_id, ci.variant_id
    into v_product, v_variant
    from public.cart_items ci
    join public.carts c on c.id = ci.cart_id
   where ci.id = p_item and c.user_id = auth.uid()
   for update of ci, c;
  if not found then raise exception 'Cart item not found'; end if;

  if not exists (
    select 1 from public.products p
     where p.id = v_product and p.status = 'active'
  ) then raise exception 'Product unavailable'; end if;
  if v_variant is not null and not exists (
    select 1 from public.product_variants v
     where v.id = v_variant and v.product_id = v_product
  ) then raise exception 'Product variant unavailable'; end if;
  if public.available_product_stock(v_product, v_variant) < p_quantity then
    raise exception 'Insufficient available stock';
  end if;

  update public.cart_items set quantity = p_quantity where id = p_item;
end;
$$;

revoke all on function public.update_cart_item_quantity(uuid, integer)
  from public, anon;
grant execute on function public.update_cart_item_quantity(uuid, integer)
  to authenticated;

-- Customers may read their cart through the owner policies, but mutations must
-- pass through the stock-checking RPCs above and remove_cart_item.
revoke all on public.carts, public.cart_items from public, anon, authenticated;
grant select on public.carts, public.cart_items to authenticated;
