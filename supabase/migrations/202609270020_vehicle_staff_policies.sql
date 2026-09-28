create policy motorcycle_brands_staff_write on public.motorcycle_brands for all to authenticated
  using(public.has_permission('motorcycles.write'))
  with check(public.has_permission('motorcycles.write'));
create policy motorcycle_models_staff_write on public.motorcycle_models for all to authenticated
  using(public.has_permission('motorcycles.write'))
  with check(public.has_permission('motorcycles.write'));
create policy motorcycle_variants_staff_write on public.motorcycle_variants for all to authenticated
  using(public.has_permission('motorcycles.write'))
  with check(public.has_permission('motorcycles.write'));
create policy branches_staff_write on public.branches for all to authenticated
  using(public.has_permission('motorcycles.write'))
  with check(public.has_permission('motorcycles.write'));

create unique index fitment_rule_unique on public.fitment_rules
  (product_id,variant_id,year_from,year_to,is_universal,is_exclusion) nulls not distinct;
