create policy role_permissions_staff_read on public.role_permissions for select to authenticated
  using(public.has_permission('staff.write'));
revoke insert,update,delete on public.staff_roles,public.role_permissions from anon,authenticated;

create function public.staff_directory() returns table(user_id uuid,email text,full_name text,roles text[])
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.has_permission('staff.write') then raise exception 'Forbidden'; end if;
  return query
    select u.id,u.email::text,coalesce(p.full_name,''),
      coalesce(array_agg(sr.role_id order by sr.role_id) filter(where sr.role_id is not null),array[]::text[])
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.staff_roles sr on sr.user_id=u.id
    group by u.id,u.email,p.full_name
    order by u.created_at desc limit 200;
end$$;
revoke all on function public.staff_directory() from public;
grant execute on function public.staff_directory() to authenticated;

create function public.admin_assign_staff_role(p_user uuid,p_role text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('staff.write') then raise exception 'Forbidden'; end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'User not found'; end if;
  if not exists(select 1 from public.roles where id=p_role) then raise exception 'Role not found'; end if;
  insert into public.staff_roles(user_id,role_id) values(p_user,p_role) on conflict do nothing;
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'staff.role.assign','staff_roles',p_user,jsonb_build_object('role',p_role));
end$$;
revoke all on function public.admin_assign_staff_role(uuid,text) from public;
grant execute on function public.admin_assign_staff_role(uuid,text) to authenticated;

create function public.admin_remove_staff_role(p_user uuid,p_role text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('staff.write') then raise exception 'Forbidden'; end if;
  if p_role='owner' then
    perform pg_advisory_xact_lock(hashtext('revora_owner_role'));
    if (select count(*) from public.staff_roles where role_id='owner')<=1 then
      raise exception 'Last owner cannot be removed';
    end if;
  end if;
  delete from public.staff_roles where user_id=p_user and role_id=p_role;
  insert into public.audit_logs(actor_id,action,entity,entity_id,detail)
    values(auth.uid(),'staff.role.remove','staff_roles',p_user,jsonb_build_object('role',p_role));
end$$;
revoke all on function public.admin_remove_staff_role(uuid,text) from public;
grant execute on function public.admin_remove_staff_role(uuid,text) to authenticated;

create function public.admin_set_role_permission(p_role text,p_permission text,p_enabled boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_permission('staff.write') then raise exception 'Forbidden'; end if;
  if p_role in ('owner','super_admin') then raise exception 'Core roles are immutable'; end if;
  if not exists(select 1 from public.roles where id=p_role) then raise exception 'Role not found'; end if;
  if not exists(select 1 from public.permissions where id=p_permission) then raise exception 'Permission not found'; end if;
  if p_enabled then
    insert into public.role_permissions(role_id,permission_id) values(p_role,p_permission) on conflict do nothing;
  else
    delete from public.role_permissions where role_id=p_role and permission_id=p_permission;
  end if;
  insert into public.audit_logs(actor_id,action,entity,detail)
    values(auth.uid(),'staff.permission.update','role_permissions',
      jsonb_build_object('role',p_role,'permission',p_permission,'enabled',p_enabled));
end$$;
revoke all on function public.admin_set_role_permission(text,text,boolean) from public;
grant execute on function public.admin_set_role_permission(text,text,boolean) to authenticated;
