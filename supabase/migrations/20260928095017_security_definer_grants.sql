-- SECURITY DEFINER functions must never inherit Supabase's broad default ACL.
-- Trigger functions and internal helpers are callable by database triggers or
-- other definer-owned functions without exposing them as PostgREST RPCs.
do $$
declare v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      v_function.signature
    );
  end loop;
end$$;

-- Public catalog helpers return only availability aggregates and popular
-- terms; neither exposes customer or supplier data.
grant execute on function public.available_product_stock(uuid,uuid) to anon,authenticated;
grant execute on function public.popular_search_terms() to anon,authenticated;

-- Owner-scoped customer RPCs.
grant execute on function public.add_cart_item(uuid,integer,uuid) to authenticated;
grant execute on function public.remove_cart_item(uuid) to authenticated;
grant execute on function public.reserve_motorcycle(uuid,uuid) to authenticated;
grant execute on function public.place_order(uuid,text,text,uuid) to authenticated;
grant execute on function public.cancel_own_unpaid_order(uuid) to authenticated;
grant execute on function public.cancel_unpaid_reservation(uuid) to authenticated;
grant execute on function public.submit_review(uuid,uuid,integer,text) to authenticated;
grant execute on function public.customer_review_candidates(integer,integer) to authenticated;
grant execute on function public.update_own_review(uuid,integer,text) to authenticated;
grant execute on function public.delete_own_review(uuid) to authenticated;
grant execute on function public.set_active_garage(uuid) to authenticated;
grant execute on function public.update_customer_profile(text,text) to authenticated;
grant execute on function public.save_customer_address(uuid,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.delete_customer_address(uuid) to authenticated;
grant execute on function public.delete_own_garage_motorcycle(uuid) to authenticated;
grant execute on function public.set_default_address(uuid) to authenticated;
grant execute on function public.set_notification_read(uuid,boolean) to authenticated;
grant execute on function public.record_search_term(text) to authenticated;
grant execute on function public.quote_cart(text) to authenticated;
grant execute on function public.register_case_attachment(uuid,text,text,text,integer) to authenticated;
grant execute on function public.register_warranty(uuid,text,integer) to authenticated;
grant execute on function public.request_return(uuid,integer,text,text) to authenticated;
grant execute on function public.request_warranty_claim(uuid,text) to authenticated;

-- Authenticated staff RPCs repeat permission checks inside the function.
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.adjust_inventory(uuid,integer,text) to authenticated;
grant execute on function public.admin_transition_order(uuid,text) to authenticated;
grant execute on function public.admin_transition_reservation(uuid,text) to authenticated;
grant execute on function public.admin_report() to authenticated;
grant execute on function public.admin_assign_staff_role(uuid,text) to authenticated;
grant execute on function public.admin_remove_staff_role(uuid,text) to authenticated;
grant execute on function public.admin_set_role_permission(text,text,boolean) to authenticated;
grant execute on function public.admin_customer_directory(text,integer) to authenticated;
grant execute on function public.admin_save_site_setting(text,text) to authenticated;
grant execute on function public.admin_set_checkout_rates(numeric,numeric) to authenticated;
grant execute on function public.admin_ship_order(uuid,text,text) to authenticated;
grant execute on function public.transfer_inventory(uuid,uuid,integer,text) to authenticated;
grant execute on function public.create_purchase_order(uuid,uuid,uuid,uuid,integer,numeric) to authenticated;
grant execute on function public.receive_purchase_order_item(uuid,integer) to authenticated;
grant execute on function public.save_promotion(uuid,text,text,text,numeric,numeric,integer,integer,timestamptz,timestamptz,boolean,jsonb) to authenticated;
grant execute on function public.advance_return(uuid,text,text,text) to authenticated;
grant execute on function public.advance_warranty_claim(uuid,text,text) to authenticated;
grant execute on function public.request_reservation_refund(uuid,text) to authenticated;
grant execute on function public.retry_failed_refund(uuid) to authenticated;
grant execute on function public.staff_directory() to authenticated;

-- Storage RLS evaluates this validator as the authenticated uploader.
grant execute on function public.valid_catalog_image_object(text,jsonb) to authenticated;
