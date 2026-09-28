create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text, created_at timestamptz not null default now()
);
create function public.create_profile() returns trigger language plpgsql security definer set search_path = public as $$begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict do nothing;
  return new;
end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();

create table public.roles (id text primary key, name text not null);
create table public.permissions (id text primary key, description text not null);
create table public.role_permissions(role_id text references public.roles on delete cascade, permission_id text references public.permissions on delete cascade, primary key(role_id,permission_id));
create table public.staff_roles(user_id uuid references auth.users on delete cascade, role_id text references public.roles on delete cascade, primary key(user_id,role_id));
insert into public.roles values ('owner','Owner'),('super_admin','Super Admin'),('admin','Admin'),('store_manager','Store Manager'),('sales','Sales'),('warehouse','Warehouse'),('customer_support','Customer Support'),('accountant','Accountant'),('content_manager','Content Manager');
insert into public.permissions values ('catalog.write','Manage catalog'),('motorcycles.write','Manage motorcycles'),('orders.read','Read orders'),('orders.write','Manage orders'),('reservations.read','Read reservations'),('reservations.write','Manage reservations'),('inventory.write','Manage inventory'),('payments.read','Read payments'),('staff.write','Manage staff'),('reports.read','Read reports'),('content.write','Manage content'),('audit.read','Read audit log');
insert into public.role_permissions select r.id,p.id from public.roles r cross join public.permissions p where r.id in ('owner','super_admin');
insert into public.role_permissions select 'admin',id from public.permissions where id <> 'staff.write';
insert into public.role_permissions values ('store_manager','catalog.write'),('store_manager','orders.read'),('store_manager','orders.write'),('store_manager','inventory.write'),('store_manager','reports.read'),('sales','reservations.read'),('sales','reservations.write'),('sales','orders.read'),('warehouse','inventory.write'),('warehouse','orders.read'),('customer_support','orders.read'),('customer_support','reservations.read'),('accountant','payments.read'),('accountant','reports.read'),('content_manager','content.write'),('content_manager','catalog.write');
create function public.has_permission(p_permission text) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.staff_roles sr join public.role_permissions rp on rp.role_id=sr.role_id where sr.user_id=auth.uid() and rp.permission_id=p_permission);
$$;

create table public.brands(id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, active boolean not null default true);
create table public.categories(id uuid primary key default gen_random_uuid(), parent_id uuid references public.categories, slug text unique not null, name_ar text not null, name_en text not null, sort_order int not null default 0, active boolean not null default true);
create table public.products(id uuid primary key default gen_random_uuid(), category_id uuid references public.categories, brand_id uuid references public.brands, slug text unique not null, sku text unique not null, barcode text, name_ar text not null, name_en text not null, description_ar text, description_en text, price_egp numeric(12,2) not null check(price_egp>=0), sale_price_egp numeric(12,2) check(sale_price_egp>=0 and sale_price_egp<=price_egp), cost_egp numeric(12,2) check(cost_egp>=0), stock int not null default 0 check(stock>=0), low_stock_threshold int not null default 3 check(low_stock_threshold>=0), image_url text, featured boolean not null default false, status text not null default 'draft' check(status in ('draft','active','archived')), specifications jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table public.product_variants(id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, sku text unique not null, attributes jsonb not null default '{}'::jsonb, price_egp numeric(12,2) not null check(price_egp>=0), stock int not null default 0 check(stock>=0), image_url text);
create table public.product_images(id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, url text not null, alt_ar text, alt_en text, sort_order int not null default 0);
create table public.motorcycle_brands(id uuid primary key default gen_random_uuid(), name text unique not null, slug text unique not null);
create table public.motorcycle_models(id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.motorcycle_brands, name text not null, slug text not null, unique(brand_id,slug));
create table public.motorcycle_variants(id uuid primary key default gen_random_uuid(), model_id uuid not null references public.motorcycle_models, name text not null, engine_cc int check(engine_cc>0), start_year int not null check(start_year between 1950 and 2100), end_year int check(end_year>=start_year), unique(model_id,name,start_year));
create table public.branches(id uuid primary key default gen_random_uuid(), name_ar text not null, name_en text not null, address_ar text, address_en text, active boolean not null default true);
create table public.motorcycles(id uuid primary key default gen_random_uuid(), variant_id uuid references public.motorcycle_variants, branch_id uuid references public.branches, slug text unique not null, stock_ref text unique, vin text unique, name_ar text not null, name_en text not null, description_ar text, description_en text, condition text not null check(condition in ('new','used')), year int not null check(year between 1950 and 2100), price_egp numeric(12,2) not null check(price_egp>0), deposit_egp numeric(12,2) not null check(deposit_egp>0 and deposit_egp<=price_egp), image_url text, engine_cc int, horsepower numeric(7,2), mileage_km int check(mileage_km>=0), availability text not null default 'available' check(availability in ('available','reserved','sold','hidden')), specs jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table public.motorcycle_images(id uuid primary key default gen_random_uuid(), motorcycle_id uuid not null references public.motorcycles on delete cascade, url text not null, alt_ar text, alt_en text, sort_order int not null default 0);
create table public.used_motorcycle_details(motorcycle_id uuid primary key references public.motorcycles on delete cascade, owners_count int check(owners_count>=0), registration_year int, service_history text, accident_status text, paint_condition text, mechanical_condition text, inspection_status text, warranty_status text, modifications text, seller_source text, inspection_notes text, history_notes text);
create table public.fitment_rules(id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, variant_id uuid references public.motorcycle_variants on delete cascade, year_from int, year_to int, is_universal boolean not null default false, is_exclusion boolean not null default false, check(is_universal or variant_id is not null), check(year_to is null or year_from is null or year_to>=year_from));
create table public.garage_motorcycles(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, variant_id uuid not null references public.motorcycle_variants, year int not null, active boolean not null default false, created_at timestamptz not null default now(), unique(user_id,variant_id,year));
create unique index one_active_garage_bike on public.garage_motorcycles(user_id) where active;

create table public.addresses(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, name text not null, line1 text not null, line2 text, city text not null, governorate text not null, phone text not null, is_default boolean not null default false);
create table public.carts(id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users on delete cascade, updated_at timestamptz not null default now());
create table public.cart_items(id uuid primary key default gen_random_uuid(), cart_id uuid not null references public.carts on delete cascade, product_id uuid not null references public.products, variant_id uuid references public.product_variants, quantity int not null check(quantity between 1 and 99), unique nulls not distinct(cart_id,product_id,variant_id));
create table public.orders(id uuid primary key default gen_random_uuid(), order_number bigint generated always as identity unique, user_id uuid not null references auth.users, address_snapshot jsonb not null, status text not null default 'pending_payment' check(status in ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded')), subtotal_egp numeric(12,2) not null, discount_egp numeric(12,2) not null default 0, tax_egp numeric(12,2) not null default 0, shipping_egp numeric(12,2) not null default 0, total_egp numeric(12,2) not null, created_at timestamptz not null default now());
create table public.order_items(id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders on delete cascade, product_id uuid not null references public.products, variant_id uuid references public.product_variants, sku_snapshot text not null, name_ar_snapshot text not null, name_en_snapshot text not null, quantity int not null check(quantity>0), unit_price_egp numeric(12,2) not null, total_egp numeric(12,2) not null);
create table public.order_history(id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders on delete cascade, status text not null, actor_id uuid references auth.users, created_at timestamptz not null default now());
create table public.motorcycle_reservations(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users, motorcycle_id uuid not null references public.motorcycles, branch_id uuid not null references public.branches, status text not null default 'awaiting_payment' check(status in ('pending','awaiting_payment','deposit_paid','contacted','appointment_scheduled','completed','cancelled','expired','refunded')), deposit_egp numeric(12,2) not null check(deposit_egp>0), created_at timestamptz not null default now());
create unique index one_active_reservation_per_motorcycle on public.motorcycle_reservations(motorcycle_id) where status in ('pending','awaiting_payment','deposit_paid','contacted','appointment_scheduled');
create table public.reservation_history(id uuid primary key default gen_random_uuid(), reservation_id uuid not null references public.motorcycle_reservations on delete cascade, status text not null, actor_id uuid references auth.users, created_at timestamptz not null default now());
create table public.payments(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users, order_id uuid references public.orders, reservation_id uuid references public.motorcycle_reservations, provider text not null, method text not null check(method in ('card','instapay')), provider_reference text unique, amount_egp numeric(12,2) not null check(amount_egp>0), status text not null default 'pending' check(status in ('pending','authorized','captured','failed','cancelled','refunded','partially_refunded')), created_at timestamptz not null default now(), check(num_nonnulls(order_id,reservation_id)=1));
create table public.payment_events(id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments on delete cascade, event_type text not null, provider_event_id text unique, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table public.wishlist_items(user_id uuid not null references auth.users on delete cascade, product_id uuid references public.products on delete cascade, motorcycle_id uuid references public.motorcycles on delete cascade, created_at timestamptz not null default now(), check(num_nonnulls(product_id,motorcycle_id)=1));
create unique index wishlist_product_unique on public.wishlist_items(user_id,product_id) where product_id is not null;
create unique index wishlist_motorcycle_unique on public.wishlist_items(user_id,motorcycle_id) where motorcycle_id is not null;
create table public.reviews(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users, product_id uuid not null references public.products, order_id uuid not null references public.orders, rating int not null check(rating between 1 and 5), body text not null check(length(body) between 10 and 2000), status text not null default 'pending' check(status in ('pending','published','rejected')), created_at timestamptz not null default now(), unique(user_id,product_id,order_id));
create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, title_ar text not null, title_en text not null, body_ar text, body_en text, read_at timestamptz, created_at timestamptz not null default now());
create table public.audit_logs(id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users, action text not null, entity text not null, entity_id uuid, detail jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

create index products_category_idx on public.products(category_id,status);create index products_brand_idx on public.products(brand_id,status);create index motorcycles_condition_idx on public.motorcycles(condition,availability);create index fitment_product_idx on public.fitment_rules(product_id);create index fitment_variant_idx on public.fitment_rules(variant_id);create index orders_user_idx on public.orders(user_id,created_at desc);create index reservations_user_idx on public.motorcycle_reservations(user_id,created_at desc);create index notifications_user_idx on public.notifications(user_id,created_at desc);

create view public.public_products with (security_invoker=true) as select p.id,p.slug,p.sku,p.name_ar,p.name_en,p.description_ar,p.description_en,p.price_egp,p.sale_price_egp,p.stock,p.image_url,p.featured,p.category_id,p.brand_id,c.slug as category_slug,b.slug as brand_slug from public.products p left join public.categories c on c.id=p.category_id left join public.brands b on b.id=p.brand_id where p.status='active';
create view public.public_motorcycles with (security_invoker=true) as select id,slug,name_ar,name_en,description_ar,description_en,condition,year,price_egp,deposit_egp,image_url,engine_cc,horsepower,mileage_km,availability,specs,created_at from public.motorcycles where availability in ('available','reserved');

do $$declare t text;begin foreach t in array array['profiles','roles','permissions','role_permissions','staff_roles','brands','categories','products','product_variants','product_images','motorcycle_brands','motorcycle_models','motorcycle_variants','branches','motorcycles','motorcycle_images','used_motorcycle_details','fitment_rules','garage_motorcycles','addresses','carts','cart_items','orders','order_items','order_history','motorcycle_reservations','reservation_history','payments','payment_events','wishlist_items','reviews','notifications','audit_logs'] loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
create policy profiles_self on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy roles_read on public.roles for select to authenticated using(true);create policy permissions_read on public.permissions for select to authenticated using(true);
create policy staff_roles_read on public.staff_roles for select to authenticated using(user_id=auth.uid() or public.has_permission('staff.write'));
create policy brands_public on public.brands for select to anon,authenticated using(active);create policy categories_public on public.categories for select to anon,authenticated using(active);
create policy products_public on public.products for select to anon,authenticated using(status='active');create policy variants_public on public.product_variants for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.status='active'));
create policy product_images_public on public.product_images for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.status='active'));
create policy motorcycle_brands_public on public.motorcycle_brands for select to anon,authenticated using(true);create policy motorcycle_models_public on public.motorcycle_models for select to anon,authenticated using(true);create policy motorcycle_variants_public on public.motorcycle_variants for select to anon,authenticated using(true);
create policy branches_public on public.branches for select to anon,authenticated using(active);create policy motorcycles_public on public.motorcycles for select to anon,authenticated using(availability in ('available','reserved'));
create policy motorcycle_images_public on public.motorcycle_images for select to anon,authenticated using(exists(select 1 from public.motorcycles m where m.id=motorcycle_id and m.availability in ('available','reserved')));
create policy fitment_public on public.fitment_rules for select to anon,authenticated using(true);
create policy garage_own on public.garage_motorcycles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy addresses_own on public.addresses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy carts_own on public.carts for select to authenticated using(user_id=auth.uid());
create policy cart_items_own on public.cart_items for select to authenticated using(exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()));
create policy orders_own on public.orders for select to authenticated using(user_id=auth.uid() or public.has_permission('orders.read'));
create policy order_items_own on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_permission('orders.read'))));
create policy reservations_own on public.motorcycle_reservations for select to authenticated using(user_id=auth.uid() or public.has_permission('reservations.read'));
create policy payments_own on public.payments for select to authenticated using(user_id=auth.uid() or public.has_permission('payments.read'));
create policy wishlist_own on public.wishlist_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy reviews_read on public.reviews for select to anon,authenticated using(status='published' or user_id=auth.uid());
create policy notifications_own on public.notifications for select to authenticated using(user_id=auth.uid());
create policy audit_staff on public.audit_logs for select to authenticated using(public.has_permission('audit.read'));

create function public.add_cart_item(p_product uuid,p_quantity int default 1) returns void language plpgsql security definer set search_path=public as $$declare v_cart uuid;begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_quantity<1 or p_quantity>99 then raise exception 'Invalid quantity';end if;
  if not exists(select 1 from public.products where id=p_product and status='active' and stock>=p_quantity) then raise exception 'Product unavailable';end if;
  insert into public.carts(user_id) values(auth.uid()) on conflict(user_id) do update set updated_at=now() returning id into v_cart;
  insert into public.cart_items(cart_id,product_id,quantity) values(v_cart,p_product,p_quantity) on conflict(cart_id,product_id,variant_id) do update set quantity=least(99,public.cart_items.quantity+excluded.quantity);
end$$;
create function public.remove_cart_item(p_item uuid) returns void language plpgsql security definer set search_path=public as $$begin
  delete from public.cart_items ci using public.carts c where ci.id=p_item and ci.cart_id=c.id and c.user_id=auth.uid();
end$$;
create function public.reserve_motorcycle(p_motorcycle uuid,p_branch uuid) returns uuid language plpgsql security definer set search_path=public as $$declare v_deposit numeric;v_id uuid;begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  select deposit_egp into v_deposit from public.motorcycles where id=p_motorcycle and availability='available' for update;
  if v_deposit is null then raise exception 'Motorcycle unavailable';end if;
  if not exists(select 1 from public.branches where id=p_branch and active) then raise exception 'Invalid branch';end if;
  insert into public.motorcycle_reservations(user_id,motorcycle_id,branch_id,deposit_egp) values(auth.uid(),p_motorcycle,p_branch,v_deposit) returning id into v_id;
  insert into public.reservation_history(reservation_id,status,actor_id) values(v_id,'awaiting_payment',auth.uid());
  insert into public.payments(user_id,reservation_id,provider,method,amount_egp) values(auth.uid(),v_id,'pending','card',v_deposit);
  return v_id;
end$$;
create function public.place_order(p_address uuid,p_method text) returns uuid language plpgsql security definer set search_path=public as $$declare v_cart uuid;v_address jsonb;v_total numeric:=0;v_order uuid;v_row record;begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if p_method not in ('card','instapay') then raise exception 'Invalid payment method';end if;
  select to_jsonb(a) - 'user_id' into v_address from public.addresses a where id=p_address and user_id=auth.uid();
  if v_address is null then raise exception 'Address not found';end if;
  select id into v_cart from public.carts where user_id=auth.uid() for update;
  if v_cart is null or not exists(select 1 from public.cart_items where cart_id=v_cart) then raise exception 'Cart is empty';end if;
  for v_row in select ci.product_id,ci.quantity,p.stock,p.price_egp,p.sale_price_egp,p.sku,p.name_ar,p.name_en,p.status from public.cart_items ci join public.products p on p.id=ci.product_id where ci.cart_id=v_cart order by p.id for update of p loop
    if v_row.status<>'active' or v_row.stock<v_row.quantity then raise exception 'Stock changed for %',v_row.sku;end if;
    v_total:=v_total+coalesce(v_row.sale_price_egp,v_row.price_egp)*v_row.quantity;
  end loop;
  insert into public.orders(user_id,address_snapshot,subtotal_egp,total_egp) values(auth.uid(),v_address,v_total,v_total) returning id into v_order;
  for v_row in select ci.product_id,ci.quantity,p.price_egp,p.sale_price_egp,p.sku,p.name_ar,p.name_en from public.cart_items ci join public.products p on p.id=ci.product_id where ci.cart_id=v_cart loop
    insert into public.order_items(order_id,product_id,sku_snapshot,name_ar_snapshot,name_en_snapshot,quantity,unit_price_egp,total_egp) values(v_order,v_row.product_id,v_row.sku,v_row.name_ar,v_row.name_en,v_row.quantity,coalesce(v_row.sale_price_egp,v_row.price_egp),coalesce(v_row.sale_price_egp,v_row.price_egp)*v_row.quantity);
    update public.products set stock=stock-v_row.quantity where id=v_row.product_id;
  end loop;
  insert into public.order_history(order_id,status,actor_id) values(v_order,'pending_payment',auth.uid());
  insert into public.payments(user_id,order_id,provider,method,amount_egp) values(auth.uid(),v_order,'pending',p_method,v_total);
  delete from public.cart_items where cart_id=v_cart;
  return v_order;
end$$;
create function public.submit_review(p_product uuid,p_order uuid,p_rating int,p_body text) returns uuid language plpgsql security definer set search_path=public as $$declare v_id uuid;begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  if not exists(select 1 from public.orders o join public.order_items oi on oi.order_id=o.id where o.id=p_order and o.user_id=auth.uid() and o.status='delivered' and oi.product_id=p_product) then raise exception 'Verified purchase required';end if;
  insert into public.reviews(user_id,product_id,order_id,rating,body) values(auth.uid(),p_product,p_order,p_rating,p_body) returning id into v_id;
  return v_id;
end$$;
create function public.compatible_product_ids(p_variant uuid,p_year int) returns table(product_id uuid) language sql stable security invoker set search_path=public as $$
  select distinct f.product_id from public.fitment_rules f
  where not f.is_exclusion and (f.is_universal or f.variant_id=p_variant)
    and (f.year_from is null or p_year>=f.year_from) and (f.year_to is null or p_year<=f.year_to)
    and not exists(select 1 from public.fitment_rules x where x.product_id=f.product_id and x.is_exclusion and x.variant_id=p_variant and (x.year_from is null or p_year>=x.year_from) and (x.year_to is null or p_year<=x.year_to));
$$;
revoke all on function public.add_cart_item(uuid,int),public.remove_cart_item(uuid),public.reserve_motorcycle(uuid,uuid),public.place_order(uuid,text),public.submit_review(uuid,uuid,int,text) from public;
grant execute on function public.add_cart_item(uuid,int),public.remove_cart_item(uuid),public.reserve_motorcycle(uuid,uuid),public.place_order(uuid,text),public.submit_review(uuid,uuid,int,text) to authenticated;
