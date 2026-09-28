-- Newly created catalog records need a location row even before receiving stock.
create function public.ensure_product_inventory_row() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.inventory(product_id,variant_id,warehouse_id,on_hand)
    values(new.id,null,'00000000-0000-4000-8000-000000000011',0)
    on conflict(product_id,variant_id,warehouse_id) do nothing;
  return new;
end$$;
create trigger ensure_product_inventory_row after insert on public.products
for each row execute function public.ensure_product_inventory_row();

create function public.ensure_variant_inventory_row() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.inventory(product_id,variant_id,warehouse_id,on_hand)
    values(new.product_id,new.id,'00000000-0000-4000-8000-000000000011',0)
    on conflict(product_id,variant_id,warehouse_id) do nothing;
  return new;
end$$;
create trigger ensure_variant_inventory_row after insert on public.product_variants
for each row execute function public.ensure_variant_inventory_row();
