begin;
do $$begin
  if has_table_privilege('anon','public.email_outbox','SELECT') then raise exception 'Email queue exposed to anonymous users'; end if;
  if has_table_privilege('authenticated','public.email_outbox','UPDATE') then raise exception 'Email queue writable by customers'; end if;
  if has_table_privilege('authenticated','public.notifications','UPDATE') then raise exception 'Notification content writable by customers'; end if;
end$$;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('51111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','notice-owner@example.com','',now(),now(),now()),
('52222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','notice-customer@example.com','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('51111111-1111-4111-8111-111111111111','owner');
set local role authenticated;
select set_config('request.jwt.claim.sub','51111111-1111-4111-8111-111111111111',true);
select public.save_customer_address(null,'Home','1 Test Street',null,'Cairo','Cairo','01000000000',true) as notification_address_id \gset
select public.add_cart_item(id,1) from public.products where sku='HLM-001';
select public.place_order(:'notification_address_id','card');
do $$begin
  if (select count(*) from public.notifications where user_id=auth.uid() and title_en='Order created')<>1 then raise exception 'Order notification missing'; end if;
  if (select count(*) from public.email_outbox where user_id=auth.uid() and status='queued')<>1 then raise exception 'Email outbox entry missing'; end if;
end$$;
select public.set_notification_read((select id from public.notifications where user_id=auth.uid() limit 1),true);
select set_config('test.notification_id',(select id::text from public.notifications where user_id=auth.uid() limit 1),true);
do $$begin
  if not exists(select 1 from public.notifications where user_id=auth.uid() and read_at is not null) then
    raise exception 'Owner could not mark notification read';end if;
end$$;
select set_config('request.jwt.claim.sub','52222222-2222-4222-8222-222222222222',true);
do $$begin
  if (select count(*) from public.email_outbox)<>0 then raise exception 'Customer can read email queue'; end if;
  begin
    perform public.set_notification_read(current_setting('test.notification_id')::uuid,false);
    raise exception 'Customer modified another notification';
  exception when raise_exception then
    if sqlerrm<>'Notification not owned' then raise;end if;
  end;
end$$;
rollback;
