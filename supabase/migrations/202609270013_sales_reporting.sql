-- Staff transitions are only available through checked RPCs.
revoke update on public.orders, public.motorcycle_reservations from authenticated;

create or replace function public.reserve_motorcycle(p_motorcycle uuid,p_branch uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_deposit numeric; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select deposit_egp into v_deposit from public.motorcycles
    where id=p_motorcycle and availability='available' for update;
  if v_deposit is null then raise exception 'Motorcycle unavailable'; end if;
  if not exists(select 1 from public.branches where id=p_branch and active) then raise exception 'Invalid branch'; end if;
  insert into public.motorcycle_reservations(user_id,motorcycle_id,branch_id,deposit_egp)
    values(auth.uid(),p_motorcycle,p_branch,v_deposit) returning id into v_id;
  update public.motorcycles set availability='reserved' where id=p_motorcycle;
  insert into public.reservation_history(reservation_id,status,actor_id)
    values(v_id,'awaiting_payment',auth.uid());
  insert into public.payments(user_id,reservation_id,provider,method,amount_egp)
    values(auth.uid(),v_id,'pending','card',v_deposit);
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(auth.uid(),'تم إنشاء الحجز','Reservation created','حجز دراجتك ينتظر دفع العربون.','Your motorcycle reservation awaits its deposit.');
  return v_id;
end$$;

update public.motorcycles m set availability='reserved'
where availability='available' and exists(
  select 1 from public.motorcycle_reservations r where r.motorcycle_id=m.id
  and r.status in ('pending','awaiting_payment','deposit_paid','contacted','appointment_scheduled')
);

create function public.admin_transition_order(p_order uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_item record;
begin
  if not public.has_permission('orders.write') then raise exception 'Forbidden'; end if;
  select * into v_order from public.orders where id=p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (
    (v_order.status='pending_payment' and p_status='cancelled') or
    (v_order.status='paid' and p_status='processing') or
    (v_order.status='processing' and p_status='shipped') or
    (v_order.status='shipped' and p_status='delivered')
  ) then raise exception 'Invalid order transition'; end if;
  update public.orders set status=p_status where id=p_order;
  if p_status='cancelled' then
    for v_item in select product_id,variant_id,quantity from public.order_items where order_id=p_order loop
      if v_item.variant_id is null then
        update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
      else
        update public.product_variants set stock=stock+v_item.quantity where id=v_item.variant_id;
      end if;
    end loop;
    update public.payments set status='cancelled' where order_id=p_order and status='pending';
  end if;
  insert into public.order_history(order_id,status,actor_id) values(p_order,p_status,auth.uid());
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(v_order.user_id,'تحديث حالة الطلب','Order status updated',p_status,p_status);
end$$;
revoke all on function public.admin_transition_order(uuid,text) from public;
grant execute on function public.admin_transition_order(uuid,text) to authenticated;

create function public.admin_transition_reservation(p_reservation uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare v_reservation public.motorcycle_reservations%rowtype;
begin
  if not public.has_permission('reservations.write') then raise exception 'Forbidden'; end if;
  select * into v_reservation from public.motorcycle_reservations where id=p_reservation for update;
  if not found then raise exception 'Reservation not found'; end if;
  if not (
    (v_reservation.status in ('pending','awaiting_payment') and p_status in ('cancelled','expired')) or
    (v_reservation.status='deposit_paid' and p_status='contacted') or
    (v_reservation.status='contacted' and p_status='appointment_scheduled') or
    (v_reservation.status='appointment_scheduled' and p_status='completed')
  ) then raise exception 'Invalid reservation transition'; end if;
  update public.motorcycle_reservations set status=p_status where id=p_reservation;
  if p_status in ('cancelled','expired') then
    update public.motorcycles set availability='available' where id=v_reservation.motorcycle_id;
    update public.payments set status='cancelled' where reservation_id=p_reservation and status='pending';
  elsif p_status='completed' then
    update public.motorcycles set availability='sold' where id=v_reservation.motorcycle_id;
  end if;
  insert into public.reservation_history(reservation_id,status,actor_id)
    values(p_reservation,p_status,auth.uid());
  insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(v_reservation.user_id,'تحديث حالة الحجز','Reservation status updated',p_status,p_status);
end$$;
revoke all on function public.admin_transition_reservation(uuid,text) from public;
grant execute on function public.admin_transition_reservation(uuid,text) to authenticated;

create function public.admin_report() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not public.has_permission('reports.read') then raise exception 'Forbidden'; end if;
  select jsonb_build_object(
    'revenue_egp',(select coalesce(sum(total_egp),0) from public.orders where status in ('paid','processing','shipped','delivered')),
    'paid_orders',(select count(*) from public.orders where status in ('paid','processing','shipped','delivered')),
    'all_orders',(select count(*) from public.orders),
    'average_order_egp',(select coalesce(round(avg(total_egp),2),0) from public.orders where status in ('paid','processing','shipped','delivered')),
    'reservations',(select count(*) from public.motorcycle_reservations),
    'captured_deposits_egp',(select coalesce(sum(amount_egp),0) from public.payments where reservation_id is not null and status='captured'),
    'customers',(select count(*) from public.profiles),
    'pending_returns',(select count(*) from public.return_requests where status not in ('completed','rejected')),
    'low_stock_products',(select count(*) from public.products where status='active' and stock<=low_stock_threshold),
    'best_selling_products',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
      select oi.product_id,max(oi.name_en_snapshot) as name_en,sum(oi.quantity) as units
      from public.order_items oi join public.orders o on o.id=oi.order_id
      where o.status in ('paid','processing','shipped','delivered')
      group by oi.product_id order by units desc limit 5
    ) t)
  ) into v_result;
  return v_result;
end$$;
revoke all on function public.admin_report() from public;
grant execute on function public.admin_report() to authenticated;

create trigger audit_reviews after update on public.reviews
for each row execute function public.audit_change();

create function public.notify_review_moderation() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status and new.status in ('published','rejected') then
    insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en)
    values(new.user_id,'تحديث تقييمك','Your review was updated',new.status,new.status);
  end if;
  return new;
end$$;
create trigger review_moderation_notification after update of status on public.reviews
for each row execute function public.notify_review_moderation();
