create policy order_history_read on public.order_history for select to authenticated
using (exists(
  select 1 from public.orders o where o.id=order_id
    and (o.user_id=auth.uid() or public.has_permission('orders.read'))
));

create policy reservation_history_read on public.reservation_history for select to authenticated
using (exists(
  select 1 from public.motorcycle_reservations r where r.id=reservation_id
    and (r.user_id=auth.uid() or public.has_permission('reservations.read'))
));
