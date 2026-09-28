-- Variant products cannot also carry sellable base stock.
do $$declare v_row record;begin
  for v_row in
    select i.id,i.on_hand from public.inventory i
    where i.variant_id is null and i.on_hand>0
      and exists(select 1 from public.product_variants v where v.product_id=i.product_id)
  loop
    update public.inventory set on_hand=0 where id=v_row.id;
    insert into public.inventory_movements(inventory_id,delta,kind,reason)
      values(v_row.id,-v_row.on_hand,'catalog','Variant parent stock reconciliation');
  end loop;
end$$;
update public.products p set stock=0 where stock<>0
  and exists(select 1 from public.product_variants v where v.product_id=p.id);

create function public.guard_first_variant_stock() returns trigger
language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.product_variants where product_id=new.product_id)
    and exists(select 1 from public.products where id=new.product_id and stock<>0)
  then raise exception 'Clear base product stock before adding variants'; end if;
  return new;
end$$;
create trigger guard_first_variant_stock before insert on public.product_variants
for each row execute function public.guard_first_variant_stock();

create or replace function public.inventory_variant_matches() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.variant_id is not null and not exists(
    select 1 from public.product_variants where id=new.variant_id and product_id=new.product_id
  ) then raise exception 'Variant does not belong to product'; end if;
  if new.variant_id is null and new.on_hand<>0 and exists(
    select 1 from public.product_variants where product_id=new.product_id
  ) then raise exception 'Variant product cannot have base inventory'; end if;
  return new;
end$$;
drop trigger inventory_variant_consistency on public.inventory;
create trigger inventory_variant_consistency before insert or update of product_id,variant_id,on_hand
on public.inventory for each row execute function public.inventory_variant_matches();
