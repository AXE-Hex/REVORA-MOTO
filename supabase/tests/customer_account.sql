begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('a5111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','account-a@example.test','',now(),now(),now()),
('a5222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','account-b@example.test','',now(),now(),now());
do $$begin
  if has_table_privilege('authenticated','public.profiles','UPDATE') then raise exception 'Direct profile update allowed';end if;
  if has_table_privilege('authenticated','public.addresses','INSERT') then raise exception 'Direct address insert allowed';end if;
end$$;
insert into public.orders(id,user_id,address_snapshot,status,subtotal_egp,total_egp)
values('a5333333-3333-4333-8333-333333333333','a5111111-1111-4111-8111-111111111111','{}','pending_payment',29000,29000);
insert into public.order_items(id,order_id,product_id,sku_snapshot,name_ar_snapshot,name_en_snapshot,quantity,unit_price_egp,total_egp)
select 'a5444444-4444-4444-8444-444444444444','a5333333-3333-4333-8333-333333333333',id,'HLM-001','خوذة','Helmet',1,29000,29000
from public.products where sku='HLM-001';
insert into public.payments(user_id,order_id,provider,method,amount_egp,status)
values('a5111111-1111-4111-8111-111111111111','a5333333-3333-4333-8333-333333333333','test','card',29000,'captured');
update public.orders set status='delivered' where id='a5333333-3333-4333-8333-333333333333';
insert into public.order_history(order_id,status) values('a5333333-3333-4333-8333-333333333333','delivered');

set local role authenticated;
select set_config('request.jwt.claim.sub','a5111111-1111-4111-8111-111111111111',true);
select public.update_customer_profile('Account Customer','+201000000000');
select public.save_customer_address(null,'Home','12 Test Avenue',null,'Cairo','Cairo','01000000000',true) as address_id \gset
select set_config('test.address_id',:'address_id',true);
select public.save_customer_address(:'address_id','Home Updated','12 Test Avenue','Apartment 4','Cairo','Cairo','01000000000',true);
do $$declare v_garage uuid;v_variant uuid;v_year int;begin
  if not exists(select 1 from public.profiles where id=auth.uid() and full_name='Account Customer' and phone='+201000000000') then raise exception 'Profile update failed';end if;
  if (select count(*) from public.addresses where user_id=auth.uid() and is_default)<>1 then raise exception 'Default address not set';end if;
  if not exists(select 1 from public.addresses where id=current_setting('test.address_id')::uuid and line2='Apartment 4') then raise exception 'Address update failed';end if;
  select id,start_year into v_variant,v_year from public.motorcycle_variants order by start_year limit 1;
  insert into public.garage_motorcycles(user_id,variant_id,year) values(auth.uid(),v_variant,v_year) returning id into v_garage;
  perform set_config('test.garage_id',v_garage::text,true);
  if not exists(select 1 from public.customer_review_candidates(10,0) where order_id='a5333333-3333-4333-8333-333333333333' and product_id=(select product_id from public.order_items where id='a5444444-4444-4444-8444-444444444444')) then raise exception 'Review candidate missing';end if;
end$$;
select public.submit_review((select product_id from public.order_items where id='a5444444-4444-4444-8444-444444444444'),'a5333333-3333-4333-8333-333333333333',5,'Verified purchase review');
select id as review_id from public.reviews where user_id=auth.uid() and order_id='a5333333-3333-4333-8333-333333333333' \gset
select set_config('test.review_id',:'review_id',true);
do $$begin
  if exists(select 1 from public.customer_review_candidates(10,0) where order_id='a5333333-3333-4333-8333-333333333333') then raise exception 'Already reviewed item still eligible';end if;
  begin update public.profiles set full_name='Direct edit' where id=auth.uid(); raise exception 'Direct profile write succeeded';
  exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','a5222222-2222-4222-8222-222222222222',true);
do $$begin
  begin perform public.delete_customer_address(current_setting('test.address_id')::uuid);raise exception 'Customer deleted foreign address';
  exception when raise_exception then if sqlerrm<>'Address not found' then raise;end if;end;
  begin perform public.delete_own_garage_motorcycle(current_setting('test.garage_id')::uuid);raise exception 'Customer deleted foreign garage entry';
  exception when raise_exception then if sqlerrm<>'Garage motorcycle not found' then raise;end if;end;
  begin perform public.update_own_review(current_setting('test.review_id')::uuid,1,'Unauthorized edit');raise exception 'Customer edited foreign review';
  exception when raise_exception then if sqlerrm<>'Review not found' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','a5111111-1111-4111-8111-111111111111',true);
select public.update_own_review(current_setting('test.review_id')::uuid,4,'Updated verified review');
select public.delete_own_review(current_setting('test.review_id')::uuid);
select public.delete_customer_address(current_setting('test.address_id')::uuid);
select public.delete_own_garage_motorcycle(current_setting('test.garage_id')::uuid);
rollback;
