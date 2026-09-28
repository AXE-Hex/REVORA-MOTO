create index if not exists orders_created_at_analytics_idx
  on public.orders (created_at);

create index if not exists motorcycle_reservations_created_at_analytics_idx
  on public.motorcycle_reservations (created_at);

create index if not exists profiles_created_at_analytics_idx
  on public.profiles (created_at);

create index if not exists payment_events_captured_created_at_idx
  on public.payment_events (created_at, payment_id)
  where event_type = 'captured';

create or replace function public.admin_analytics_timeseries(p_range text)
returns table (
  bucket_date date,
  revenue_egp numeric,
  orders bigint,
  reservations bigint,
  customers bigint,
  captured_payments_egp numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (pg_catalog.now() at time zone 'UTC')::date;
  v_start date;
  v_step interval;
  v_start_utc timestamp with time zone;
  v_end_utc timestamp with time zone;
begin
  if auth.uid() is null or not public.has_permission('reports.read') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  case p_range
    when '7d' then
      v_start := v_today - 6;
      v_step := interval '1 day';
    when '30d' then
      v_start := v_today - 29;
      v_step := interval '1 day';
    when '90d' then
      v_start := v_today - 89;
      v_step := interval '1 day';
    when '12m' then
      v_start := (pg_catalog.date_trunc('month', v_today::timestamp)::date - interval '11 months')::date;
      v_step := interval '1 month';
    else
      raise exception 'Invalid range' using errcode = '22023';
  end case;

  v_start_utc := v_start::timestamp at time zone 'UTC';
  v_end_utc := (v_today + 1)::timestamp at time zone 'UTC';

  return query
  with buckets as (
    select case when p_range = '12m'
      then pg_catalog.date_trunc('month', point)::date
      else point::date
    end as day
    from pg_catalog.generate_series(v_start::timestamp, v_today::timestamp, v_step) as series(point)
  ), order_totals as (
    select case when p_range = '12m'
        then pg_catalog.date_trunc('month', o.created_at at time zone 'UTC')::date
        else (o.created_at at time zone 'UTC')::date
      end as day,
      count(*)::bigint as order_count
    from public.orders o
    where o.created_at >= v_start_utc
      and o.created_at < v_end_utc
    group by 1
  ), reservation_totals as (
    select case when p_range = '12m'
        then pg_catalog.date_trunc('month', r.created_at at time zone 'UTC')::date
        else (r.created_at at time zone 'UTC')::date
      end as day,
      count(*)::bigint as reservation_count
    from public.motorcycle_reservations r
    where r.created_at >= v_start_utc
      and r.created_at < v_end_utc
    group by 1
  ), customer_totals as (
    select case when p_range = '12m'
        then pg_catalog.date_trunc('month', p.created_at at time zone 'UTC')::date
        else (p.created_at at time zone 'UTC')::date
      end as day,
      count(*)::bigint as customer_count
    from public.profiles p
    where p.created_at >= v_start_utc
      and p.created_at < v_end_utc
    group by 1
  ), captured_payments as (
    -- A payment is captured once by the payment state machine. Deduplicate by
    -- payment as a defensive measure so a malformed/imported duplicate event
    -- cannot multiply the reported amount.
    select distinct on (pe.payment_id)
      pe.payment_id,
      pe.created_at,
      p.order_id,
      p.amount_egp
    from public.payment_events pe
    join public.payments p on p.id = pe.payment_id
    where pe.event_type = 'captured'
      and pe.created_at >= v_start_utc
      and pe.created_at < v_end_utc
    order by pe.payment_id, pe.created_at, pe.id
  ), payment_totals as (
    select case when p_range = '12m'
        then pg_catalog.date_trunc('month', cp.created_at at time zone 'UTC')::date
        else (cp.created_at at time zone 'UTC')::date
      end as day,
      coalesce(sum(cp.amount_egp), 0)::numeric as payment_volume,
      coalesce(sum(cp.amount_egp) filter (where cp.order_id is not null), 0)::numeric as order_revenue
    from captured_payments cp
    group by 1
  )
  select b.day,
    coalesce(pt.order_revenue, 0)::numeric,
    coalesce(ot.order_count, 0)::bigint,
    coalesce(rt.reservation_count, 0)::bigint,
    coalesce(ct.customer_count, 0)::bigint,
    coalesce(pt.payment_volume, 0)::numeric
  from buckets b
  left join order_totals ot on ot.day = b.day
  left join reservation_totals rt on rt.day = b.day
  left join customer_totals ct on ct.day = b.day
  left join payment_totals pt on pt.day = b.day
  order by b.day;
end;
$$;

revoke all on function public.admin_analytics_timeseries(text) from public, anon, authenticated, service_role;
grant execute on function public.admin_analytics_timeseries(text) to authenticated;

comment on function public.admin_analytics_timeseries(text) is
  'Returns bounded UTC aggregates only to authenticated staff with reports.read. Revenue/payment volume is gross immutable captured payment value by capture date; later refunds do not rewrite captures, while failed/cancelled payment attempts are excluded. SECURITY DEFINER is required to aggregate profiles and operational rows whose RLS policies otherwise restrict individual records.';
