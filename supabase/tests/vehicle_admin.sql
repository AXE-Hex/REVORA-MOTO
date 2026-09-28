begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('71111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vehicle-owner@example.com','',now(),now(),now()),
('72222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vehicle-customer@example.com','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('71111111-1111-4111-8111-111111111111','owner');
set local role authenticated;
select set_config('request.jwt.claim.sub','72222222-2222-4222-8222-222222222222',true);
do $$begin
  begin
    insert into public.branches(name_ar,name_en) values('غير مصرح','Unauthorized');
    raise exception 'Customer created branch';
  exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
insert into public.branches(id,name_ar,name_en)
values('73333333-3333-4333-8333-333333333333','فرع تجريبي','Test branch');
insert into public.motorcycle_brands(id,name,slug)
values('74444444-4444-4444-8444-444444444444','Test Motorcycles','test-motorcycles');
insert into public.motorcycle_models(id,brand_id,name,slug)
values('75555555-5555-4555-8555-555555555555','74444444-4444-4444-8444-444444444444','Test Model','test-model');
insert into public.motorcycle_variants(id,model_id,name,start_year)
values('76666666-6666-4666-8666-666666666666','75555555-5555-4555-8555-555555555555','Standard',2020);
insert into public.motorcycles(id,variant_id,branch_id,slug,name_ar,name_en,condition,year,price_egp,deposit_egp)
values('77777777-7777-4777-8777-777777777777','76666666-6666-4666-8666-666666666666','73333333-3333-4333-8333-333333333333','test-used-motorcycle','دراجة مستعملة','Test used motorcycle','used',2024,200000,10000);
insert into public.used_motorcycle_details(motorcycle_id,inspection_notes)
values('77777777-7777-4777-8777-777777777777','Private internal inspection');
insert into public.fitment_rules(product_id,variant_id,year_from,year_to)
select id,'76666666-6666-4666-8666-666666666666',2020,2026 from public.products where sku='PART-001';
do $$begin
  begin
    insert into public.fitment_rules(product_id,variant_id,year_from,year_to)
    select id,'76666666-6666-4666-8666-666666666666',2020,2026 from public.products where sku='PART-001';
    raise exception 'Duplicate fitment rule accepted';
  exception when unique_violation then null; end;
end$$;
set local role anon;
do $$begin
  if has_table_privilege('anon','public.used_motorcycle_details','SELECT') then
    if exists(select 1 from public.used_motorcycle_details where motorcycle_id='77777777-7777-4777-8777-777777777777')
      then raise exception 'Private inspection exposed'; end if;
  end if;
end$$;
rollback;
