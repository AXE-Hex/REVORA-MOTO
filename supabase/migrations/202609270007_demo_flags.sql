alter table public.products add column is_demo boolean not null default false;
alter table public.motorcycles add column is_demo boolean not null default false;
grant select(is_demo) on public.products to anon,authenticated;
grant select(is_demo) on public.motorcycles to anon,authenticated;
create or replace view public.public_products with (security_invoker=true) as select p.id,p.slug,p.sku,p.name_ar,p.name_en,p.description_ar,p.description_en,p.price_egp,p.sale_price_egp,p.stock,p.image_url,p.featured,p.category_id,p.brand_id,c.slug as category_slug,b.slug as brand_slug,p.is_demo from public.products p left join public.categories c on c.id=p.category_id left join public.brands b on b.id=p.brand_id where p.status='active';
create or replace view public.public_motorcycles with (security_invoker=true) as select id,slug,name_ar,name_en,description_ar,description_en,condition,year,price_egp,deposit_egp,image_url,engine_cc,horsepower,mileage_km,availability,specs,created_at,is_demo from public.motorcycles where availability in ('available','reserved');
