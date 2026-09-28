begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('91111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-visibility-owner@example.com','',now(),now(),now()),
('92222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-visibility-customer@example.com','',now(),now(),now()),
('93333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-visibility-sales@example.com','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values
('91111111-1111-4111-8111-111111111111','owner'),
('93333333-3333-4333-8333-333333333333','sales');
set local role authenticated;
select set_config('request.jwt.claim.sub','92222222-2222-4222-8222-222222222222',true);
do $$begin
  if public.has_permission('customers.read') or public.has_permission('settings.write') then raise exception 'Customer has admin permissions'; end if;
  begin
    perform public.admin_customer_directory();
    raise exception 'Customer read directory';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise;end if;end;
  begin
    perform public.admin_save_site_setting('announcement_en','Should fail');
    raise exception 'Customer wrote setting';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise;end if;end;
  if exists(select 1 from public.site_settings) then raise exception 'Customer read settings'; end if;
  if exists(select 1 from public.audit_logs) then raise exception 'Customer read audit logs'; end if;
end$$;
select set_config('request.jwt.claim.sub','93333333-3333-4333-8333-333333333333',true);
do $$begin
  if not public.has_permission('customers.read') then raise exception 'Sales cannot read customers'; end if;
  if not exists(select 1 from public.admin_customer_directory() where user_id='92222222-2222-4222-8222-222222222222') then raise exception 'Directory omitted customer'; end if;
  if public.has_permission('settings.write') then raise exception 'Sales can write settings'; end if;
end$$;
select set_config('request.jwt.claim.sub','91111111-1111-4111-8111-111111111111',true);
do $$begin
  if not public.has_permission('customers.read') or not public.has_permission('settings.write') then raise exception 'Owner permission missing'; end if;
  begin
    perform public.admin_save_site_setting('payment_status','captured');
    raise exception 'Unsafe key accepted';
  exception when raise_exception then if sqlerrm<>'Invalid setting' then raise;end if;end;
  begin
    perform public.admin_save_site_setting('contact_email','bad email');
    raise exception 'Invalid email accepted';
  exception when raise_exception then if sqlerrm<>'Invalid email' then raise;end if;end;
end$$;
select public.admin_save_site_setting('contact_email','support@example.com');
do $$begin
  if (select value from public.site_settings where key='contact_email') <> '"support@example.com"'::jsonb then raise exception 'Setting not saved'; end if;
  if not exists(select 1 from public.audit_logs where action='site_setting.update' and detail->>'key'='contact_email' and actor_id=auth.uid()) then raise exception 'Audit missing'; end if;
  if has_table_privilege('authenticated','public.site_settings','UPDATE')
    or has_table_privilege('authenticated','public.site_settings','INSERT')
    or has_table_privilege('authenticated','public.site_settings','DELETE') then
    raise exception 'Direct settings mutation allowed';
  end if;
end$$;
rollback;
