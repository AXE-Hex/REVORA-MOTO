-- Keep address defaults unique for each customer, including concurrent requests.
with ranked as (
  select id, row_number() over (partition by user_id order by id) as n
  from public.addresses where is_default
)
update public.addresses a set is_default = false
from ranked r where a.id = r.id and r.n > 1;
create unique index addresses_one_default_per_user
  on public.addresses(user_id) where is_default;

create or replace function public.set_default_address(p_address uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from auth.users where id = auth.uid() for update;
  if not exists(select 1 from public.addresses where id = p_address and user_id = auth.uid()) then
    raise exception 'Address not found';
  end if;
  update public.addresses set is_default = false where user_id = auth.uid() and is_default;
  update public.addresses set is_default = true where id = p_address and user_id = auth.uid();
end $$;
revoke all on function public.set_default_address(uuid) from public;
grant execute on function public.set_default_address(uuid) to authenticated;

-- Direct PostgREST writes must obey the same model-year rule as account forms.
create or replace function public.validate_garage_year()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_start int; v_end int;
begin
  select start_year, coalesce(end_year, 2100) into v_start, v_end
  from public.motorcycle_variants where id = new.variant_id;
  if v_start is null or new.year < v_start or new.year > v_end then
    raise exception 'Invalid motorcycle year';
  end if;
  return new;
end $$;
create trigger garage_year_valid before insert or update of variant_id,year
on public.garage_motorcycles for each row execute function public.validate_garage_year();

-- Review changes remain moderated and cannot change their verified purchase.
create or replace function public.update_own_review(p_review uuid, p_rating int, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_rating not between 1 and 5 or length(trim(p_body)) not between 10 and 2000 then
    raise exception 'Invalid review';
  end if;
  update public.reviews set rating = p_rating, body = trim(p_body), status = 'pending'
  where id = p_review and user_id = auth.uid();
  if not found then raise exception 'Review not found'; end if;
end $$;
revoke all on function public.update_own_review(uuid,int,text) from public;
grant execute on function public.update_own_review(uuid,int,text) to authenticated;

create or replace function public.delete_own_review(p_review uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_review public.reviews%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_review from public.reviews
  where id = p_review and user_id = auth.uid() for update;
  if not found then raise exception 'Review not found'; end if;
  delete from public.reviews where id = p_review and user_id = auth.uid();
  insert into public.audit_logs(actor_id, action, entity, entity_id, detail)
  values(auth.uid(), 'review.delete', 'reviews', p_review,
    jsonb_build_object('product_id',v_review.product_id,'order_id',v_review.order_id,'status',v_review.status));
end $$;
revoke all on function public.delete_own_review(uuid) from public;
grant execute on function public.delete_own_review(uuid) to authenticated;

create or replace function public.customer_review_candidates(p_limit int default 50, p_offset int default 0)
returns table(order_id uuid, order_number bigint, product_id uuid, product_name_ar text, product_name_en text)
language sql stable security definer set search_path = public as $$
  select o.id, o.order_number, oi.product_id,
    max(oi.name_ar_snapshot), max(oi.name_en_snapshot)
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.user_id = auth.uid() and o.status = 'delivered'
    and not exists (
      select 1 from public.reviews r where r.user_id = auth.uid()
        and r.order_id = o.id and r.product_id = oi.product_id
    )
  group by o.id, o.order_number, oi.product_id
  order by o.order_number desc, oi.product_id
  limit least(greatest(coalesce(p_limit,50),1),100)
  offset least(greatest(coalesce(p_offset,0),0),10000)
$$;
revoke all on function public.customer_review_candidates(int,int) from public;
grant execute on function public.customer_review_candidates(int,int) to authenticated;
