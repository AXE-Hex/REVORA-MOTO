create function public.record_payment_event(p_payment uuid,p_event_id text,p_reference text,p_amount numeric,p_status text) returns void language plpgsql security definer set search_path=public as $$declare v_payment public.payments%rowtype;begin
  if p_status not in ('authorized','captured','failed','cancelled') then raise exception 'Invalid payment status';end if;
  if p_event_id is null or length(p_event_id)<5 then raise exception 'Invalid event ID';end if;
  select * into v_payment from public.payments where id=p_payment for update;
  if not found then raise exception 'Payment not found';end if;
  if v_payment.amount_egp<>p_amount then raise exception 'Amount mismatch';end if;
  if v_payment.provider_reference is not null and v_payment.provider_reference<>p_reference then raise exception 'Reference mismatch';end if;
  if exists(select 1 from public.payment_events where provider_event_id=p_event_id) then return;end if;
  if v_payment.status='captured' and p_status<>'captured' then raise exception 'Captured payment cannot regress';end if;
  insert into public.payment_events(payment_id,event_type,provider_event_id,payload) values(p_payment,p_status,p_event_id,jsonb_build_object('reference',p_reference,'amount_egp',p_amount));
  update public.payments set status=p_status,provider_reference=coalesce(provider_reference,p_reference) where id=p_payment;
  if p_status='captured' then
    if v_payment.order_id is not null then
      update public.orders set status='paid' where id=v_payment.order_id and status='pending_payment';
      insert into public.order_history(order_id,status) values(v_payment.order_id,'paid');
      insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en) values(v_payment.user_id,'تم تأكيد الدفع','Payment confirmed','تم تأكيد دفع طلبك.','Your order payment was confirmed.');
    else
      update public.motorcycle_reservations set status='deposit_paid' where id=v_payment.reservation_id and status='awaiting_payment';
      insert into public.reservation_history(reservation_id,status) values(v_payment.reservation_id,'deposit_paid');
      insert into public.notifications(user_id,title_ar,title_en,body_ar,body_en) values(v_payment.user_id,'تم استلام العربون','Deposit received','تم تأكيد عربون الحجز.','Your reservation deposit was confirmed.');
    end if;
  end if;
end$$;
revoke all on function public.record_payment_event(uuid,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.record_payment_event(uuid,text,text,numeric,text) to service_role;
