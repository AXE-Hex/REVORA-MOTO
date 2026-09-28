-- Expose account mutations only through narrow ownership-checked functions.
revoke insert,update,delete on public.profiles,public.addresses from anon,authenticated;
grant select on public.profiles,public.addresses to authenticated;

create function public.update_customer_profile(p_full_name text,p_phone text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if length(trim(coalesce(p_full_name,''))) not between 2 and 100 then raise exception 'Invalid name';end if;
  if p_phone is not null and trim(p_phone)<>'' and p_phone !~ '^\+?[0-9 ]{8,20}$' then raise exception 'Invalid phone';end if;
  update public.profiles set full_name=trim(p_full_name),phone=nullif(trim(p_phone),'') where id=auth.uid();
  if not found then raise exception 'Profile not found';end if;
end$$;
revoke all on function public.update_customer_profile(text,text) from public,anon;
grant execute on function public.update_customer_profile(text,text) to authenticated;

create function public.save_customer_address(
  p_id uuid,p_name text,p_line1 text,p_line2 text,p_city text,p_governorate text,p_phone text,p_default boolean
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 100
    or length(trim(coalesce(p_line1,''))) not between 5 and 200
    or length(trim(coalesce(p_line2,'')))>200
    or length(trim(coalesce(p_city,''))) not between 2 and 100
    or length(trim(coalesce(p_governorate,''))) not between 2 and 100
    or p_phone is null or p_phone !~ '^\+?[0-9 ]{8,20}$' then raise exception 'Invalid address';end if;
  if p_id is null then
    insert into public.addresses(user_id,name,line1,line2,city,governorate,phone,is_default)
      values(auth.uid(),trim(p_name),trim(p_line1),nullif(trim(p_line2),''),trim(p_city),trim(p_governorate),trim(p_phone),false)
      returning id into v_id;
  else
    update public.addresses set name=trim(p_name),line1=trim(p_line1),line2=nullif(trim(p_line2),''),
      city=trim(p_city),governorate=trim(p_governorate),phone=trim(p_phone)
      where id=p_id and user_id=auth.uid() returning id into v_id;
    if v_id is null then raise exception 'Address not found';end if;
  end if;
  if coalesce(p_default,false) then
    perform public.set_default_address(v_id);
  else
    update public.addresses set is_default=false where id=v_id and user_id=auth.uid();
  end if;
  return v_id;
end$$;
revoke all on function public.save_customer_address(uuid,text,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.save_customer_address(uuid,text,text,text,text,text,text,boolean) to authenticated;

create function public.delete_customer_address(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  delete from public.addresses where id=p_id and user_id=auth.uid();
  if not found then raise exception 'Address not found';end if;
end$$;
revoke all on function public.delete_customer_address(uuid) from public,anon;
grant execute on function public.delete_customer_address(uuid) to authenticated;

create function public.delete_own_garage_motorcycle(p_garage uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  delete from public.garage_motorcycles where id=p_garage and user_id=auth.uid();
  if not found then raise exception 'Garage motorcycle not found';end if;
end$$;
revoke all on function public.delete_own_garage_motorcycle(uuid) from public,anon;
grant execute on function public.delete_own_garage_motorcycle(uuid) to authenticated;
