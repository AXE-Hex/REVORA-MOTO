create or replace function public.admin_report() returns jsonb
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
    'customers_last_30_days',(select count(*) from public.profiles where created_at>=now()-interval '30 days'),
    'pending_returns',(select count(*) from public.return_requests where status not in ('completed','rejected')),
    'refund_requests',(select count(*) from public.refund_requests),
    'provider_required_refunds',(select count(*) from public.refund_requests where status='provider_required'),
    'low_stock_products',(select count(*) from public.products p where p.status='active'
      and (case when exists(select 1 from public.product_variants v where v.product_id=p.id)
        then (select coalesce(sum(v.stock),0) from public.product_variants v where v.product_id=p.id)
        else p.stock end)<=p.low_stock_threshold),
    'inventory_on_hand',(select coalesce(sum(on_hand),0) from public.inventory),
    'inventory_reserved',(select coalesce(sum(reserved),0) from public.inventory),
    'inventory_incoming',(select coalesce(sum(incoming),0) from public.inventory),
    'best_selling_products',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
      select oi.product_id,max(oi.name_en_snapshot) as name_en,sum(oi.quantity) as units
      from public.order_items oi join public.orders o on o.id=oi.order_id
      where o.status in ('paid','processing','shipped','delivered')
      group by oi.product_id order by units desc limit 5
    ) t),
    'best_categories',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
      select c.id,c.name_en,sum(oi.quantity) as units
      from public.order_items oi join public.orders o on o.id=oi.order_id
      join public.products p on p.id=oi.product_id join public.categories c on c.id=p.category_id
      where o.status in ('paid','processing','shipped','delivered')
      group by c.id,c.name_en order by units desc limit 5
    ) t),
    'popular_motorcycles',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
      select m.id,m.name_en,count(*) as reservations
      from public.motorcycle_reservations r join public.motorcycles m on m.id=r.motorcycle_id
      group by m.id,m.name_en order by reservations desc limit 5
    ) t)
  ) into v_result;
  return v_result;
end$$;
