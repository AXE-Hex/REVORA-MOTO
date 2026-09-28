begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('33333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','promotions-test@example.com','',now(),now(),now());
insert into public.addresses(id,user_id,name,line1,city,governorate,phone)
values('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','Home','12 Test Street','Cairo','Cairo','01000000000');

-- One targeted product, one category, one brand and one automatic offer.
insert into public.promotions(id,code,name,type,value,min_total_egp,usage_limit,per_customer_limit,starts_at,ends_at)
values
 ('50000000-0000-4000-8000-000000000001','HELMET10','Helmet 10%','percent',10,1000,2,1,now()-interval '1 day',now()+interval '1 day'),
 ('50000000-0000-4000-8000-000000000002','GEAR500','Gear 500','fixed',500,0,null,null,now()-interval '1 day',now()+interval '1 day'),
 ('50000000-0000-4000-8000-000000000003','AGV100','AGV 100','fixed',100,0,null,null,now()-interval '1 day',now()+interval '1 day'),
 ('50000000-0000-4000-8000-000000000004',null,'Automatic 50','fixed',50,0,null,null,now()-interval '1 day',now()+interval '1 day'),
 ('50000000-0000-4000-8000-000000000005','FUTURE','Not started','fixed',100,0,null,null,now()+interval '1 day',now()+interval '2 days'),
 ('50000000-0000-4000-8000-000000000006','MINIMUM','High minimum','fixed',100,999999,null,null,now()-interval '1 day',now()+interval '1 day'),
 ('50000000-0000-4000-8000-000000000007','DISABLED','Inactive','fixed',100,0,null,null,now()-interval '1 day',now()+interval '1 day'),
 ('50000000-0000-4000-8000-000000000008','LIMITED','One redemption','fixed',200,0,1,null,now()-interval '1 day',now()+interval '1 day'),
 ('50000000-0000-4000-8000-000000000009','CAPTEST','Cap to eligible items','fixed',30000,0,null,null,now()-interval '1 day',now()+interval '1 day');
update public.promotions set active=false where code='DISABLED';
insert into public.promotion_targets(promotion_id,product_id)
select '50000000-0000-4000-8000-000000000001',id from public.products where sku='HLM-001';
insert into public.promotion_targets(promotion_id,category_id)
select '50000000-0000-4000-8000-000000000002',id from public.categories where slug='riding-gear';
insert into public.promotion_targets(promotion_id,brand_id)
select '50000000-0000-4000-8000-000000000003',id from public.brands where slug='agv';
insert into public.promotion_targets(promotion_id,product_id)
select '50000000-0000-4000-8000-000000000009',id from public.products where sku='HLM-001';

set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select public.add_cart_item((select id from public.products where sku='HLM-001'),1);
select public.add_cart_item((select id from public.products where sku='GEAR-001'),1,(select id from public.product_variants where sku='GEAR-001-L'));
do $$declare q jsonb;begin
  q:=public.quote_cart(' helmet10 ');
  if (q->>'subtotal_egp')::numeric<>22500 or (q->>'discount_egp')::numeric<>1450 or (q->>'total_egp')::numeric<>21050 then raise exception 'Product percent quote wrong: %',q;end if;
  if (public.quote_cart('gear500')->>'discount_egp')::numeric<>500 then raise exception 'Category target quote wrong';end if;
  if (public.quote_cart('agv100')->>'discount_egp')::numeric<>100 then raise exception 'Brand target quote wrong';end if;
  if (public.quote_cart('captest')->>'discount_egp')::numeric<>14500 then raise exception 'Fixed discount exceeded targeted item';end if;
  if (public.quote_cart()->>'discount_egp')::numeric<>50 then raise exception 'Automatic promotion quote wrong';end if;
  begin perform public.quote_cart('FUTURE');raise exception 'Future coupon accepted';exception when raise_exception then if sqlerrm<>'Coupon unavailable' then raise;end if;end;
  begin perform public.quote_cart('MINIMUM');raise exception 'Minimum ignored';exception when raise_exception then if sqlerrm<>'Coupon unavailable' then raise;end if;end;
  begin perform public.quote_cart('DISABLED');raise exception 'Inactive coupon accepted';exception when raise_exception then if sqlerrm<>'Coupon unavailable' then raise;end if;end;
  begin perform public.quote_cart('UNKNOWN');raise exception 'Unknown coupon accepted';exception when raise_exception then if sqlerrm<>'Coupon unavailable' then raise;end if;end;
end$$;
select public.place_order('44444444-4444-4444-8444-444444444444','card','helmet10') as promo_order \gset
select set_config('test.promo_order',:'promo_order',true);
do $$begin
  if (select subtotal_egp from public.orders where id=current_setting('test.promo_order')::uuid)<>22500 then raise exception 'Order subtotal wrong';end if;
  if (select discount_egp from public.orders where id=current_setting('test.promo_order')::uuid)<>1450 then raise exception 'Order discount wrong';end if;
  if (select total_egp from public.orders where id=current_setting('test.promo_order')::uuid)<>21050 then raise exception 'Order total wrong';end if;
  if (select promotion_snapshot->>'code' from public.orders where id=current_setting('test.promo_order')::uuid)<>'HELMET10' then raise exception 'Promotion snapshot missing';end if;
  if (select amount_egp from public.payments where order_id=current_setting('test.promo_order')::uuid)<>21050 then raise exception 'Payment amount not discounted';end if;
  if (select count(*) from public.coupon_usage where order_id=current_setting('test.promo_order')::uuid)<>1 then raise exception 'Usage history missing';end if;
end$$;
select public.add_cart_item((select id from public.products where sku='HLM-001'),1);
do $$begin
  begin perform public.place_order('44444444-4444-4444-8444-444444444444','card','HELMET10');raise exception 'Per customer limit ignored';exception when raise_exception then if sqlerrm<>'Coupon unavailable' then raise;end if;end;
end$$;
select public.place_order('44444444-4444-4444-8444-444444444444','card','LIMITED') as limited_order \gset
select public.add_cart_item((select id from public.products where sku='HLM-001'),1);
do $$begin
  begin perform public.place_order('44444444-4444-4444-8444-444444444444','card','LIMITED');raise exception 'Global usage limit ignored';exception when raise_exception then if sqlerrm<>'Coupon unavailable' then raise;end if;end;
end$$;
do $$begin
  begin
    perform public.save_promotion(null,'STAFF10','Staff only','percent',10,0,null,null,now(),now()+interval '1 day',true,'[]'::jsonb);
    raise exception 'Customer created a promotion';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise;end if;end;
end$$;
reset role;
insert into public.staff_roles(user_id,role_id) values('33333333-3333-4333-8333-333333333333','store_manager');
set local role authenticated;
select public.save_promotion(null,'staff10','Staff only','percent',10,0,null,null,now(),now()+interval '1 day',true,
  jsonb_build_array(jsonb_build_object('kind','brand','id',(select id from public.brands where slug='agv')))) as saved_promo \gset
select set_config('test.saved_promo',:'saved_promo',true);
do $$begin
  if (select code from public.promotions where id=current_setting('test.saved_promo')::uuid)<>'STAFF10' then raise exception 'Admin promotion code not normalized';end if;
  if (select count(*) from public.promotion_targets where promotion_id=current_setting('test.saved_promo')::uuid)<>1 then raise exception 'Admin target missing';end if;
  begin
    perform public.save_promotion(current_setting('test.saved_promo')::uuid,'STAFF10','Changed name','percent',10,0,null,null,now(),now()+interval '1 day',true,
      '[{"kind":"brand","id":"99999999-9999-4999-8999-999999999999"}]'::jsonb);
    raise exception 'Invalid target accepted';
  exception when foreign_key_violation then null;end;
  if (select name from public.promotions where id=current_setting('test.saved_promo')::uuid)<>'Staff only' then raise exception 'Failed admin update was partially committed';end if;
  if (select count(*) from public.promotion_targets where promotion_id=current_setting('test.saved_promo')::uuid)<>1 then raise exception 'Failed admin update removed targets';end if;
end$$;
reset role;
rollback;
