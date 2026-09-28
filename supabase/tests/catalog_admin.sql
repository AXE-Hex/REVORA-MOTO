begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('61111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','catalog-owner@example.com','',now(),now(),now()),
('62222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','catalog-customer@example.com','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('61111111-1111-4111-8111-111111111111','owner');
set local role authenticated;
select set_config('request.jwt.claim.sub','62222222-2222-4222-8222-222222222222',true);
do $$begin
  begin
    insert into public.products(id,slug,sku,name_ar,name_en,price_egp,stock)
    values('63333333-3333-4333-8333-333333333333','unauthorized-catalog-test','NO-AUTH-001','تجربة','Test',100,0);
    raise exception 'Customer created product';
  exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub','61111111-1111-4111-8111-111111111111',true);
insert into public.products(id,slug,sku,name_ar,name_en,price_egp,stock)
values('64444444-4444-4444-8444-444444444444','new-catalog-test','CAT-NEW-001','منتج جديد','New product',100,0);
do $$begin
  if not exists(select 1 from public.inventory where product_id='64444444-4444-4444-8444-444444444444' and variant_id is null and on_hand=0)
    then raise exception 'New zero-stock product has no inventory location'; end if;
end$$;
insert into public.product_variants(product_id,sku,price_egp,stock)
values('64444444-4444-4444-8444-444444444444','CAT-NEW-001-S',100,0);
do $$begin
  if not exists(select 1 from public.inventory where variant_id=(select id from public.product_variants where sku='CAT-NEW-001-S') and on_hand=0)
    then raise exception 'New variant has no inventory location'; end if;
end$$;
insert into public.categories(id,slug,name_ar,name_en) values('65555555-5555-4555-8555-555555555551','test-parent','أم','Parent');
insert into public.categories(id,parent_id,slug,name_ar,name_en) values('65555555-5555-4555-8555-555555555552','65555555-5555-4555-8555-555555555551','test-child','ابن','Child');
do $$begin
  begin
    update public.categories set parent_id='65555555-5555-4555-8555-555555555552' where id='65555555-5555-4555-8555-555555555551';
    raise exception 'Category cycle accepted';
  exception when raise_exception then
    if sqlerrm<>'Category cycle forbidden' then raise; end if;
  end;
end$$;
rollback;
