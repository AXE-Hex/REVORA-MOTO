create policy brands_staff_select on public.brands for select to authenticated
  using(public.has_permission('catalog.write'));
create policy categories_staff_select on public.categories for select to authenticated
  using(public.has_permission('catalog.write'));

create function public.prevent_category_cycle() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id=new.id then raise exception 'Category cannot parent itself'; end if;
  if exists(
    with recursive ancestors as (
      select id,parent_id from public.categories where id=new.parent_id
      union all
      select c.id,c.parent_id from public.categories c join ancestors a on c.id=a.parent_id
    ) select 1 from ancestors where id=new.id
  ) then raise exception 'Category cycle forbidden'; end if;
  return new;
end$$;
create trigger prevent_category_cycle before insert or update of parent_id on public.categories
for each row execute function public.prevent_category_cycle();
