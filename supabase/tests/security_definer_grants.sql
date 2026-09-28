begin;
do $$begin
  if has_function_privilege('anon','public.admin_report()','EXECUTE') then
    raise exception 'Anonymous analytics RPC remains executable';
  end if;
  if has_function_privilege('anon','public.adjust_inventory(uuid,integer,text)','EXECUTE') then
    raise exception 'Anonymous inventory RPC remains executable';
  end if;
  if has_function_privilege('authenticated','public.sync_inventory_from_catalog()','EXECUTE') then
    raise exception 'Internal stock trigger is directly callable';
  end if;
  if has_function_privilege('authenticated','public.audit_change()','EXECUTE') then
    raise exception 'Internal audit trigger is directly callable';
  end if;
  if not has_function_privilege('authenticated','public.place_order(uuid,text,text,uuid)','EXECUTE') then
    raise exception 'Customer checkout RPC unavailable';
  end if;
  if not has_function_privilege('authenticated','public.save_customer_address(uuid,text,text,text,text,text,text,boolean)','EXECUTE') then
    raise exception 'Customer address RPC unavailable';
  end if;
  if not has_function_privilege('authenticated','public.admin_report()','EXECUTE') then
    raise exception 'Staff report RPC unavailable';
  end if;
  if has_function_privilege('anon','public.admin_analytics_timeseries(text)','EXECUTE') then
    raise exception 'Anonymous time-series analytics RPC remains executable';
  end if;
  if not has_function_privilege('authenticated','public.admin_analytics_timeseries(text)','EXECUTE') then
    raise exception 'Authorized time-series analytics RPC unavailable';
  end if;
  if not has_function_privilege('service_role','public.record_payment_event(uuid,text,text,numeric,text,text)','EXECUTE') then
    raise exception 'Payment webhook RPC unavailable to service role';
  end if;
  if has_table_privilege('anon','public.search_term_daily','SELECT') then
    raise exception 'Anonymous search activity access allowed';
  end if;
  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and has_function_privilege('anon',p.oid,'EXECUTE')
      and p.proname not in ('available_product_stock','popular_search_terms')
  ) then raise exception 'Unexpected anonymous SECURITY DEFINER function grant'; end if;
  -- Keep this new reporting exception signature-specific: an overload must
  -- remain rejected even though its base function name is allowlisted below.
  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
      and (
        p.proname not in (
          'add_cart_item','adjust_inventory','admin_assign_staff_role','admin_customer_directory',
          'admin_remove_staff_role','admin_report','admin_save_site_setting','admin_set_checkout_rates',
          'admin_set_role_permission','admin_ship_order','admin_transition_order','admin_transition_reservation',
          'advance_return','advance_warranty_claim','available_product_stock','cancel_own_unpaid_order',
          'cancel_unpaid_reservation','create_purchase_order','customer_review_candidates',
          'delete_customer_address','delete_own_garage_motorcycle','delete_own_review','has_permission',
          'place_order','popular_search_terms','quote_cart','receive_purchase_order_item','record_search_term',
          'register_case_attachment','register_warranty','remove_cart_item','request_reservation_refund',
          'request_return','request_warranty_claim','reserve_motorcycle','retry_failed_refund',
          'save_customer_address','save_promotion','set_active_garage','set_default_address',
          'set_notification_read','staff_directory','submit_review','transfer_inventory',
          'update_cart_item_quantity','update_customer_profile','update_own_review',
          'admin_analytics_timeseries'
        )
        or (
          p.proname='admin_analytics_timeseries'
          and p.oid <> 'public.admin_analytics_timeseries(text)'::regprocedure
        )
      )
  ) then raise exception 'Unexpected authenticated SECURITY DEFINER function grant'; end if;
end$$;
rollback;
