-- Customer service cases. Financial settlement is deliberately provider-gated.
alter table public.return_requests drop constraint return_requests_status_check;
alter table public.return_requests add constraint return_requests_status_check check(status in ('requested','under_review','approved','rejected','received','inspected','refund_pending','refunded','completed'));
alter table public.return_requests add column customer_notes text,
  add column admin_notes text,
  add column inspection_notes text,
  add column refund_amount_egp numeric(12,2) check(refund_amount_egp>=0),
  add column updated_at timestamptz not null default now();

create table public.return_history (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users,
  note text,
  created_at timestamptz not null default now()
);
create index return_history_case_idx on public.return_history(return_id,created_at);
alter table public.return_history enable row level security;
create policy return_history_read on public.return_history for select to authenticated using (
  exists(select 1 from public.return_requests r where r.id=return_id and (r.user_id=auth.uid() or public.has_permission('orders.read')))
);

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null unique references public.return_requests on delete cascade,
  payment_id uuid not null references public.payments,
  amount_egp numeric(12,2) not null check(amount_egp>0),
  status text not null default 'provider_required' check(status in ('provider_required','pending','succeeded','failed')),
  provider_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.refund_requests enable row level security;
create policy refund_requests_read on public.refund_requests for select to authenticated using (
  exists(select 1 from public.return_requests r where r.id=return_id and (r.user_id=auth.uid() or public.has_permission('payments.read')))
);

alter table public.products add column warranty_months int check(warranty_months between 1 and 120);
grant select(warranty_months) on public.products to anon,authenticated;
alter table public.warranties add column product_id uuid references public.products,
  add column unit_number int not null default 1 check(unit_number>0),
  add column registered_at timestamptz not null default now();
create unique index one_warranty_per_order_unit on public.warranties(order_item_id,unit_number);
alter table public.warranty_claims add column admin_notes text,
  add column updated_at timestamptz not null default now();
create table public.warranty_claim_history (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.warranty_claims on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users,
  note text,
  created_at timestamptz not null default now()
);
create index warranty_claim_history_idx on public.warranty_claim_history(claim_id,created_at);
alter table public.warranty_claim_history enable row level security;
create policy warranty_claim_history_read on public.warranty_claim_history for select to authenticated using (
  exists(select 1 from public.warranty_claims c where c.id=claim_id and (c.user_id=auth.uid() or public.has_permission('orders.read')))
);

create table public.case_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  return_id uuid references public.return_requests on delete cascade,
  claim_id uuid references public.warranty_claims on delete cascade,
  storage_path text not null unique,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes int not null check(size_bytes between 1 and 5242880),
  created_at timestamptz not null default now(),
  check(num_nonnulls(return_id,claim_id)=1)
);
alter table public.case_attachments enable row level security;
create policy case_attachments_read on public.case_attachments for select to authenticated using (
  (user_id=auth.uid() or public.has_permission('orders.read'))
  and (return_id is null or exists(select 1 from public.return_requests r where r.id=return_id and r.user_id=user_id))
  and (claim_id is null or exists(select 1 from public.warranty_claims c where c.id=claim_id and c.user_id=user_id))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('case-evidence','case-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy case_evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='case-evidence' and (storage.foldername(name))[1]=auth.uid()::text
  and (
    ((storage.foldername(name))[2]='returns' and exists(select 1 from public.return_requests r where r.id::text=(storage.foldername(name))[3] and r.user_id=auth.uid()))
    or ((storage.foldername(name))[2]='claims' and exists(select 1 from public.warranty_claims c where c.id::text=(storage.foldername(name))[3] and c.user_id=auth.uid()))
  )
);
create policy case_evidence_select on storage.objects for select to authenticated using (
  bucket_id='case-evidence' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_permission('orders.read'))
);

create or replace function public.register_case_attachment(p_case uuid,p_kind text,p_path text,p_mime text,p_size int)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_kind not in ('returns','claims') or p_path not like auth.uid()::text||'/'||p_kind||'/'||p_case::text||'/%' then raise exception 'Invalid attachment path';end if;
  if p_mime not in ('image/jpeg','image/png','image/webp') or p_size not between 1 and 5242880 then raise exception 'Invalid image';end if;
  if not exists(select 1 from storage.objects where bucket_id='case-evidence' and name=p_path) then raise exception 'Upload required';end if;
  if p_kind='returns' and not exists(select 1 from public.return_requests where id=p_case and user_id=auth.uid()) then raise exception 'Return not owned';end if;
  if p_kind='claims' and not exists(select 1 from public.warranty_claims where id=p_case and user_id=auth.uid()) then raise exception 'Claim not owned';end if;
  insert into public.case_attachments(user_id,return_id,claim_id,storage_path,mime_type,size_bytes)
  values(auth.uid(),case when p_kind='returns' then p_case end,case when p_kind='claims' then p_case end,p_path,p_mime,p_size) returning id into v_id;
  return v_id;
end$$;
revoke all on function public.register_case_attachment(uuid,text,text,text,int) from public;
grant execute on function public.register_case_attachment(uuid,text,text,text,int) to authenticated;

create or replace function public.request_return(p_order_item uuid,p_quantity int,p_reason text,p_customer_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_item public.order_items%rowtype;v_order public.orders%rowtype;v_claimed int;v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_quantity is null or p_quantity<1 or length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>500 or length(coalesce(p_customer_notes,''))>2000 then raise exception 'Invalid return request';end if;
  select * into v_item from public.order_items where id=p_order_item for update;
  if not found then raise exception 'Order item not found';end if;
  select * into v_order from public.orders where id=v_item.order_id and user_id=auth.uid() and status='delivered';
  if not found then raise exception 'Delivered order owned by customer required';end if;
  select coalesce(sum(ri.quantity),0) into v_claimed from public.return_items ri join public.return_requests r on r.id=ri.return_id where ri.order_item_id=p_order_item and r.status<>'rejected';
  if v_claimed+p_quantity>v_item.quantity then raise exception 'Return quantity exceeds available quantity';end if;
  insert into public.return_requests(order_id,user_id,reason,customer_notes,refund_amount_egp)
  values(v_order.id,auth.uid(),trim(p_reason),nullif(trim(p_customer_notes),''),
    round((v_item.total_egp / nullif(v_order.subtotal_egp,0)) * (v_order.subtotal_egp-v_order.discount_egp+v_order.tax_egp) * p_quantity / v_item.quantity,2)) returning id into v_id;
  insert into public.return_items(return_id,order_item_id,quantity) values(v_id,p_order_item,p_quantity);
  insert into public.return_history(return_id,to_status,actor_id) values(v_id,'requested',auth.uid());
  return v_id;
end$$;
revoke all on function public.request_return(uuid,int,text,text) from public;
grant execute on function public.request_return(uuid,int,text,text) to authenticated;

create or replace function public.advance_return(p_return uuid,p_status text,p_admin_notes text default null,p_inspection_notes text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_case public.return_requests%rowtype;v_payment uuid;v_paid numeric;v_previously_requested numeric;
begin
  if not public.has_permission('orders.write') then raise exception 'Forbidden';end if;
  select * into v_case from public.return_requests where id=p_return for update;
  if not found then raise exception 'Return not found';end if;
  if not ((v_case.status='requested' and p_status='under_review') or
          (v_case.status='under_review' and p_status in ('approved','rejected')) or
          (v_case.status='approved' and p_status='received') or
          (v_case.status='received' and p_status='inspected') or
          (v_case.status='inspected' and p_status='refund_pending')) then raise exception 'Invalid return transition';end if;
  if length(coalesce(p_admin_notes,''))>2000 or length(coalesce(p_inspection_notes,''))>2000 then raise exception 'Notes too long';end if;
  if p_status='refund_pending' then
    if length(trim(coalesce(p_inspection_notes,v_case.inspection_notes,'')))<5 then raise exception 'Inspection notes required';end if;
    if coalesce(v_case.refund_amount_egp,0)<=0 then raise exception 'Refund amount must be positive';end if;
    select id,amount_egp into v_payment,v_paid from public.payments where order_id=v_case.order_id and status='captured' order by created_at limit 1 for update;
    if v_payment is null then raise exception 'Captured payment required';end if;
    select coalesce(sum(amount_egp),0) into v_previously_requested from public.refund_requests where payment_id=v_payment and status<>'failed';
    if v_previously_requested+v_case.refund_amount_egp>v_paid then raise exception 'Refund would exceed captured payment';end if;
    insert into public.refund_requests(return_id,payment_id,amount_egp) values(v_case.id,v_payment,v_case.refund_amount_egp);
  end if;
  update public.return_requests set status=p_status,admin_notes=coalesce(nullif(trim(p_admin_notes),''),admin_notes),inspection_notes=coalesce(nullif(trim(p_inspection_notes),''),inspection_notes),updated_at=now() where id=p_return;
  insert into public.return_history(return_id,from_status,to_status,actor_id,note) values(p_return,v_case.status,p_status,auth.uid(),coalesce(p_inspection_notes,p_admin_notes));
end$$;
revoke all on function public.advance_return(uuid,text,text,text) from public;
grant execute on function public.advance_return(uuid,text,text,text) to authenticated;

create or replace function public.register_warranty(p_order_item uuid,p_serial text default null,p_unit int default 1)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_item public.order_items%rowtype;v_months int;v_start date;v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if length(coalesce(p_serial,''))>120 then raise exception 'Serial number too long';end if;
  select oi.* into v_item from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=p_order_item and o.user_id=auth.uid() and o.status='delivered';
  if not found then raise exception 'Delivered order owned by customer required';end if;
  if p_unit is null or p_unit<1 or p_unit>v_item.quantity then raise exception 'Invalid unit number';end if;
  select warranty_months into v_months from public.products where id=v_item.product_id;
  if v_months is null then raise exception 'No warranty terms configured';end if;
  select coalesce((select min(created_at)::date from public.order_history where order_id=v_item.order_id and status='delivered'),o.created_at::date) into v_start from public.orders o where o.id=v_item.order_id;
  insert into public.warranties(user_id,order_item_id,product_id,unit_number,serial_number,starts_at,ends_at)
    values(auth.uid(),p_order_item,v_item.product_id,p_unit,nullif(trim(p_serial),''),v_start,(v_start+make_interval(months=>v_months))::date) returning id into v_id;
  return v_id;
end$$;
revoke all on function public.register_warranty(uuid,text,int) from public;
grant execute on function public.register_warranty(uuid,text,int) to authenticated;

create or replace function public.request_warranty_claim(p_warranty uuid,p_details text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if length(trim(coalesce(p_details,'')))<10 or length(p_details)>2000 then raise exception 'Invalid claim details';end if;
  if not exists(select 1 from public.warranties where id=p_warranty and user_id=auth.uid() and status='active' and ends_at>=current_date and starts_at<=current_date) then raise exception 'Active warranty owned by customer required';end if;
  insert into public.warranty_claims(warranty_id,user_id,details) values(p_warranty,auth.uid(),trim(p_details)) returning id into v_id;
  insert into public.warranty_claim_history(claim_id,to_status,actor_id) values(v_id,'requested',auth.uid());
  return v_id;
end$$;
revoke all on function public.request_warranty_claim(uuid,text) from public;
grant execute on function public.request_warranty_claim(uuid,text) to authenticated;

create or replace function public.advance_warranty_claim(p_claim uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_old text;
begin
  if not public.has_permission('orders.write') then raise exception 'Forbidden';end if;
  select status into v_old from public.warranty_claims where id=p_claim for update;
  if not found then raise exception 'Claim not found';end if;
  if not ((v_old='requested' and p_status='reviewing') or (v_old='reviewing' and p_status in ('approved','rejected')) or (v_old='approved' and p_status='completed')) then raise exception 'Invalid claim transition';end if;
  if length(coalesce(p_note,''))>2000 then raise exception 'Note too long';end if;
  update public.warranty_claims set status=p_status,admin_notes=coalesce(nullif(trim(p_note),''),admin_notes),updated_at=now() where id=p_claim;
  insert into public.warranty_claim_history(claim_id,from_status,to_status,actor_id,note) values(p_claim,v_old,p_status,auth.uid(),p_note);
end$$;
revoke all on function public.advance_warranty_claim(uuid,text,text) from public;
grant execute on function public.advance_warranty_claim(uuid,text,text) to authenticated;

-- No direct table writes: mutations are only possible through the validated RPCs.
revoke insert,update,delete on public.return_requests,public.return_items,public.return_history,public.refund_requests,public.warranties,public.warranty_claims,public.warranty_claim_history,public.case_attachments from anon,authenticated;
