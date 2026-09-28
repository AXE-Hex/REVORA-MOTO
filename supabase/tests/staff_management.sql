begin;
do $$begin
  if has_table_privilege('authenticated','public.staff_roles','DELETE') then raise exception 'Direct staff role deletion allowed'; end if;
end$$;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('81111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','staff-owner@example.com','',now(),now(),now()),
('82222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','staff-customer@example.com','',now(),now(),now());
insert into public.staff_roles(user_id,role_id) values('81111111-1111-4111-8111-111111111111','owner');
set local role authenticated;
select set_config('request.jwt.claim.sub','82222222-2222-4222-8222-222222222222',true);
do $$begin
  begin
    perform public.staff_directory();
    raise exception 'Customer accessed staff directory';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','81111111-1111-4111-8111-111111111111',true);
do $$begin
  if not exists(select 1 from public.staff_directory() where user_id='82222222-2222-4222-8222-222222222222') then raise exception 'Directory missing user';end if;
  begin
    perform public.admin_remove_staff_role(auth.uid(),'owner');
    raise exception 'Last owner removed';
  exception when raise_exception then if sqlerrm<>'Last owner cannot be removed' then raise;end if;end;
end$$;
select public.admin_assign_staff_role('82222222-2222-4222-8222-222222222222','sales');
do $$begin
  if not exists(select 1 from public.staff_roles where user_id='82222222-2222-4222-8222-222222222222' and role_id='sales') then raise exception 'Role not assigned'; end if;
end$$;
select public.admin_remove_staff_role('82222222-2222-4222-8222-222222222222','sales');
select public.admin_set_role_permission('sales','reports.read',true);
do $$begin
  if not exists(select 1 from public.role_permissions where role_id='sales' and permission_id='reports.read') then raise exception 'Permission not granted'; end if;
  begin
    perform public.admin_set_role_permission('owner','reports.read',false);
    raise exception 'Core role modified';
  exception when raise_exception then if sqlerrm<>'Core roles are immutable' then raise;end if;end;
end$$;
select public.admin_set_role_permission('sales','staff.write',true);
select public.admin_assign_staff_role('82222222-2222-4222-8222-222222222222','sales');
select set_config('request.jwt.claim.sub','82222222-2222-4222-8222-222222222222',true);
do $$begin
  begin
    perform public.admin_assign_staff_role(auth.uid(),'owner');
    raise exception 'Staff promoted self to owner';
  exception when raise_exception then if sqlerrm<>'Owner authorization required' then raise;end if;end;
  begin
    perform public.admin_assign_staff_role(auth.uid(),'admin');
    raise exception 'Staff granted permissions beyond own';
  exception when raise_exception then if sqlerrm<>'Cannot grant permissions beyond your own' then raise;end if;end;
  begin
    perform public.admin_set_role_permission('warehouse','payments.read',true);
    raise exception 'Staff granted missing permission';
  exception when raise_exception then if sqlerrm<>'Cannot manage permissions beyond your own' then raise;end if;end;
  begin
    perform public.admin_set_role_permission('warehouse','staff.write',true);
    raise exception 'Staff delegated staff administration';
  exception when raise_exception then if sqlerrm<>'Owner authorization required' then raise;end if;end;
  begin
    perform public.admin_remove_staff_role('81111111-1111-4111-8111-111111111111','owner');
    raise exception 'Staff removed owner';
  exception when raise_exception then if sqlerrm<>'Owner authorization required' then raise;end if;end;
end$$;
rollback;
