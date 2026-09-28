create or replace function public.enforce_paid_status() returns trigger language plpgsql security definer set search_path=public as $$begin
  if tg_table_name='orders' then
    if new.status in ('paid','processing','shipped','delivered') and not exists(select 1 from public.payments where order_id=new.id and status='captured' and amount_egp>=new.total_egp) then raise exception 'Verified captured payment required';end if;
  elsif tg_table_name='motorcycle_reservations' then
    if new.status in ('deposit_paid','contacted','appointment_scheduled','completed') and not exists(select 1 from public.payments where reservation_id=new.id and status='captured' and amount_egp>=new.deposit_egp) then raise exception 'Verified deposit required';end if;
  end if;
  return new;
end$$;
