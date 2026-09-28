insert into public.permissions(id,description) values
  ('customers.read','Read customer directory'),
  ('settings.write','Manage safe site settings')
on conflict (id) do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.id in ('owner','super_admin') and p.id in ('customers.read','settings.write')
on conflict do nothing;
insert into public.role_permissions(role_id,permission_id) values
  ('admin','customers.read'),('admin','settings.write'),
  ('sales','customers.read'),('customer_support','customers.read')
on conflict do nothing;

create function public.admin_customer_directory(p_query text default '',p_offset integer default 0)
returns table(user_id uuid,email text,full_name text,phone text,joined_at timestamptz,order_count bigint,reservation_count bigint)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.has_permission('customers.read') then raise exception 'Forbidden'; end if;
  if p_offset is null or p_offset<0 or p_offset>10000 or length(coalesce(p_query,''))>100 then
    raise exception 'Invalid search';
  end if;
  return query
    select u.id,u.email::text,coalesce(p.full_name,''),p.phone,u.created_at,
      (select count(*) from public.orders o where o.user_id=u.id),
      (select count(*) from public.motorcycle_reservations r where r.user_id=u.id)
    from auth.users u left join public.profiles p on p.id=u.id
    where nullif(trim(p_query),'') is null
      or position(lower(trim(p_query)) in lower(coalesce(u.email,'')))>0
      or position(lower(trim(p_query)) in lower(coalesce(p.full_name,'')))>0
    order by u.created_at desc,u.id desc limit 50 offset p_offset;
end$$;
revoke all on function public.admin_customer_directory(text,integer) from public;
grant execute on function public.admin_customer_directory(text,integer) to authenticated;

drop policy settings_staff on public.site_settings;
create policy settings_staff_read on public.site_settings for select to authenticated
  using(public.has_permission('settings.write'));
revoke insert,update,delete on public.site_settings from anon,authenticated;

create function public.admin_save_site_setting(p_key text,p_value text) returns void
language plpgsql security definer set search_path=public as $$
declare v_old jsonb; v_max integer;
begin
  if not public.has_permission('settings.write') then raise exception 'Forbidden'; end if;
  v_max:=case p_key
    when 'contact_email' then 254
    when 'contact_phone' then 32
    when 'support_hours_ar' then 160
    when 'support_hours_en' then 160
    when 'announcement_ar' then 300
    when 'announcement_en' then 300
    else null end;
  if v_max is null or p_value is null or length(p_value)>v_max
    or p_value ~ '[[:cntrl:]]' then raise exception 'Invalid setting'; end if;
  if p_key='contact_email' and p_value<>'' and p_value !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Invalid email';
  end if;
  if p_key='contact_phone' and p_value<>'' and p_value !~ '^[0-9+() .-]{6,32}$' then
    raise exception 'Invalid phone';
  end if;
  select value into v_old from public.site_settings where key=p_key for update;
  insert into public.site_settings(key,value,updated_at)
    values(p_key,to_jsonb(p_value),now())
    on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;
  insert into public.audit_logs(actor_id,action,entity,detail)
    values(auth.uid(),'site_setting.update','site_settings',
      jsonb_build_object('key',p_key,'old',v_old,'new',to_jsonb(p_value)));
end$$;
revoke all on function public.admin_save_site_setting(text,text) from public;
grant execute on function public.admin_save_site_setting(text,text) to authenticated;

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc,id desc);
