create function public.set_active_garage(p_garage uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.garage_motorcycles where id=p_garage and user_id=auth.uid()) then
    raise exception 'Garage motorcycle not found';
  end if;
  update public.garage_motorcycles set active=false where user_id=auth.uid() and active;
  update public.garage_motorcycles set active=true where id=p_garage and user_id=auth.uid();
end$$;
revoke all on function public.set_active_garage(uuid) from public;
grant execute on function public.set_active_garage(uuid) to authenticated;
