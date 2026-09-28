begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('10101010-1010-4010-8010-101010101010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','returns-owner@example.test','',now(),now(),now()),
('20202020-2020-4020-8020-202020202020','00000000-0000-0000-0000-000000000000','authenticated','authenticated','returns-other@example.test','',now(),now(),now()),
('30303030-3030-4030-8030-303030303030','00000000-0000-0000-0000-000000000000','authenticated','authenticated','returns-staff@example.test','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('30303030-3030-4030-8030-303030303030','admin');
update public.products set warranty_months=12 where sku='HLM-001';
insert into public.orders(id,user_id,address_snapshot,status,subtotal_egp,total_egp)
values('40404040-4040-4040-8040-404040404040','10101010-1010-4010-8010-101010101010','{}','pending_payment',1000,1000);
insert into public.order_items(id,order_id,product_id,sku_snapshot,name_ar_snapshot,name_en_snapshot,quantity,unit_price_egp,total_egp)
select '50505050-5050-4050-8050-505050505050','40404040-4040-4040-8040-404040404040',id,'HLM-001','خوذة','Helmet',2,500,1000 from public.products where sku='HLM-001';
insert into public.payments(id,user_id,order_id,provider,method,amount_egp,status)
values('60606060-6060-4060-8060-606060606060','10101010-1010-4010-8010-101010101010','40404040-4040-4040-8040-404040404040','test','card',1000,'captured');
update public.orders set status='delivered' where id='40404040-4040-4040-8040-404040404040';
insert into public.order_history(order_id,status) values('40404040-4040-4040-8040-404040404040','delivered');

set local role authenticated;
select set_config('request.jwt.claim.sub','20202020-2020-4020-8020-202020202020',true);
do $$begin
  begin perform public.request_return('50505050-5050-4050-8050-505050505050',1,'Damaged item'); raise exception 'Another customer submitted a return';
  exception when raise_exception then if sqlerrm<>'Delivered order owned by customer required' then raise;end if;end;
  begin perform public.register_warranty('50505050-5050-4050-8050-505050505050',null); raise exception 'Another customer registered warranty';
  exception when raise_exception then if sqlerrm<>'Delivered order owned by customer required' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','10101010-1010-4010-8010-101010101010',true);
select public.request_return('50505050-5050-4050-8050-505050505050',1,'Damaged item','Scratched on delivery') as return_id \gset
select set_config('test.return_id',:'return_id',true);
select public.register_warranty('50505050-5050-4050-8050-505050505050','SN-123') as warranty_id \gset
select public.register_warranty('50505050-5050-4050-8050-505050505050','SN-124',2) as second_warranty_id \gset
select public.request_warranty_claim(:'warranty_id','The visor mechanism is broken') as claim_id \gset
select set_config('test.claim_id',:'claim_id',true);
do $$begin
  if (select refund_amount_egp from public.return_requests where id=current_setting('test.return_id')::uuid)<>500 then raise exception 'Refund amount not server calculated';end if;
  if (select count(*) from public.return_history where return_id=current_setting('test.return_id')::uuid)<>1 then raise exception 'Initial return history missing';end if;
  if (select count(*) from public.warranty_claim_history where claim_id=current_setting('test.claim_id')::uuid)<>1 then raise exception 'Initial claim history missing';end if;
  if (select count(*) from public.warranties where order_item_id='50505050-5050-4050-8050-505050505050')<>2 then raise exception 'Two purchased units did not receive separate warranties';end if;
  begin perform public.register_warranty('50505050-5050-4050-8050-505050505050','SN-125',3); raise exception 'Nonexistent unit registered';
  exception when raise_exception then if sqlerrm<>'Invalid unit number' then raise;end if;end;
  begin perform public.request_return('50505050-5050-4050-8050-505050505050',2,'More damaged'); raise exception 'Over-return accepted';
  exception when raise_exception then if sqlerrm<>'Return quantity exceeds available quantity' then raise;end if;end;
  begin perform public.advance_return(current_setting('test.return_id')::uuid,'refunded'); raise exception 'Customer advanced return';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','30303030-3030-4030-8030-303030303030',true);
select public.advance_return(:'return_id','under_review','Review started');
select public.advance_return(:'return_id','approved','Approved');
select public.advance_return(:'return_id','received');
select public.advance_return(:'return_id','inspected',null,'Condition inspected');
select public.advance_return(:'return_id','refund_pending');
select public.advance_warranty_claim(:'claim_id','reviewing','Checking evidence');
do $$begin
  if (select status from public.refund_requests where return_id=current_setting('test.return_id')::uuid)<>'provider_required' then raise exception 'Refund falsely finalized';end if;
  if (select count(*) from public.return_history where return_id=current_setting('test.return_id')::uuid)<>6 then raise exception 'Return lifecycle history missing';end if;
  begin perform public.advance_return(current_setting('test.return_id')::uuid,'refunded'); raise exception 'Staff marked external refund successful';
  exception when raise_exception then if sqlerrm<>'Invalid return transition' then raise;end if;end;
end$$;
reset role;
select id as refund_id,amount_egp as refund_amount from public.refund_requests where return_id=:'return_id' \gset
set local role service_role;
select public.record_refund_event(:'refund_id','refund-failed-event','provider-ref-failed',:'refund_amount','EGP','failed');
set local role authenticated;
select set_config('request.jwt.claim.sub','30303030-3030-4030-8030-303030303030',true);
select public.retry_failed_refund(:'refund_id');
reset role;
set local role service_role;
select public.record_refund_event(:'refund_id','refund-success-event','provider-ref-success',:'refund_amount','EGP','succeeded');
set local role authenticated;
select set_config('request.jwt.claim.sub','30303030-3030-4030-8030-303030303030',true);
select public.advance_return(:'return_id','completed','Case closed');
do $$begin
  if (select status from public.return_requests where id=current_setting('test.return_id')::uuid)<>'completed' then
    raise exception 'Verified return did not complete';end if;
  if (select count(*) from public.return_history where return_id=current_setting('test.return_id')::uuid)<>8 then
    raise exception 'Refund and completion history missing';end if;
end$$;
rollback;
