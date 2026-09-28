-- RLS limits rows. These grants also limit sensitive columns in otherwise public rows.
revoke all on public.products from anon, authenticated;
grant select(id,category_id,brand_id,slug,sku,barcode,name_ar,name_en,description_ar,description_en,price_egp,sale_price_egp,stock,low_stock_threshold,image_url,featured,status,specifications,created_at) on public.products to anon,authenticated;
grant insert,update on public.products to authenticated;
revoke all on public.motorcycles from anon, authenticated;
grant select(id,variant_id,branch_id,slug,name_ar,name_en,description_ar,description_en,condition,year,price_egp,deposit_egp,image_url,engine_cc,horsepower,mileage_km,availability,specs,created_at) on public.motorcycles to anon,authenticated;
grant insert,update on public.motorcycles to authenticated;
