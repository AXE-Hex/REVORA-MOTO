import { supabase } from './supabase/server';

export type Product = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price_egp: number;
  sale_price_egp: number | null;
  brand_id: string | null;
  category_id: string | null;
  image_url: string | null;
  featured: boolean;
  stock: number;
  sku: string;
  is_demo: boolean;
};
export type Motorcycle = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  condition: 'new' | 'used';
  year: number;
  price_egp: number;
  deposit_egp: number;
  image_url: string | null;
  engine_cc: number | null;
  horsepower: number | null;
  mileage_km: number | null;
  availability: string;
  description_ar: string | null;
  description_en: string | null;
  specs: Record<string, string | number | boolean> | null;
  is_demo: boolean;
};
export type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
};
export type Brand = { id: string; slug: string; name: string };

export async function productListing(
  filters: {
    q?: string;
    category?: string;
    brand?: string;
    ids?: string[];
    limit?: number;
    offset?: number;
    sort?: 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'name';
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  } = {},
) {
  const db = await supabase();
  if (!db) return { items: [] as Product[], total: 0 };
  const limit = Math.min(Math.max(filters.limit || 60, 1), 100);
  const offset = Math.max(filters.offset || 0, 0);
  let query = db
    .from('public_products')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  if (filters.sort === 'price_asc')
    query = query.order('effective_price_egp', { ascending: true });
  else if (filters.sort === 'price_desc')
    query = query.order('effective_price_egp', { ascending: false });
  else if (filters.sort === 'name')
    query = query.order('name_en', { ascending: true });
  else if (filters.sort === 'newest')
    query = query.order('created_at', { ascending: false });
  else query = query.order('featured', { ascending: false }).order('id');
  if (filters.q)
    query = query.or(
      `name_en.ilike.%${safeSearch(filters.q)}%,name_ar.ilike.%${safeSearch(filters.q)}%,sku.ilike.%${safeSearch(filters.q)}%`,
    );
  if (filters.category) query = query.eq('category_slug', filters.category);
  if (filters.brand) query = query.eq('brand_slug', filters.brand);
  if (
    filters.minPrice !== undefined &&
    Number.isFinite(filters.minPrice) &&
    filters.minPrice >= 0
  )
    query = query.gte('effective_price_egp', filters.minPrice);
  if (
    filters.maxPrice !== undefined &&
    Number.isFinite(filters.maxPrice) &&
    filters.maxPrice >= 0
  )
    query = query.lte('effective_price_egp', filters.maxPrice);
  if (filters.inStock) query = query.gt('stock', 0);
  if (filters.ids) {
    if (!filters.ids.length) return { items: [] as Product[], total: 0 };
    query = query.in('id', filters.ids);
  }
  const { data, count, error } = await query;
  if (error) {
    console.error('Catalog query failed', error.code);
    return { items: [] as Product[], total: 0 };
  }
  return { items: data as Product[], total: count || 0 };
}
export async function products(
  filters: Parameters<typeof productListing>[0] = {},
) {
  return (await productListing(filters)).items;
}
export async function product(slug: string) {
  const db = await supabase();
  if (!db) return null;
  const { data } = await db
    .from('public_products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return data as Product | null;
}
export async function motorcycleListing(
  filters: {
    condition?: 'new' | 'used';
    q?: string;
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
    minCc?: number;
    maxCc?: number;
    year?: number;
    availability?: 'available' | 'reserved';
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'year_desc';
  } = {},
) {
  const db = await supabase();
  if (!db) return { items: [] as Motorcycle[], total: 0 };
  const limit = Math.min(Math.max(filters.limit || 60, 1), 100);
  const offset = Math.max(filters.offset || 0, 0);
  let query = db
    .from('public_motorcycles')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  if (filters.sort === 'price_asc')
    query = query.order('price_egp', { ascending: true });
  else if (filters.sort === 'price_desc')
    query = query.order('price_egp', { ascending: false });
  else if (filters.sort === 'year_desc')
    query = query.order('year', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  query = query.order('id');
  if (filters.condition) query = query.eq('condition', filters.condition);
  if (filters.availability)
    query = query.eq('availability', filters.availability);
  if (filters.year) query = query.eq('year', filters.year);
  if (filters.minCc !== undefined)
    query = query.gte('engine_cc', filters.minCc);
  if (filters.maxCc !== undefined)
    query = query.lte('engine_cc', filters.maxCc);
  if (filters.minPrice !== undefined)
    query = query.gte('price_egp', filters.minPrice);
  if (filters.maxPrice !== undefined)
    query = query.lte('price_egp', filters.maxPrice);
  if (filters.q)
    query = query.or(
      `name_en.ilike.%${safeSearch(filters.q)}%,name_ar.ilike.%${safeSearch(filters.q)}%`,
    );
  const { data, count, error } = await query;
  if (error) {
    console.error('Motorcycle query failed', error.code);
    return { items: [] as Motorcycle[], total: 0 };
  }
  return { items: data as Motorcycle[], total: count || 0 };
}
export async function motorcycles(
  filters: Parameters<typeof motorcycleListing>[0] = {},
) {
  return (await motorcycleListing(filters)).items;
}
export async function motorcycle(slug: string) {
  const db = await supabase();
  if (!db) return null;
  const { data } = await db
    .from('public_motorcycles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return data as Motorcycle | null;
}
export async function categories() {
  const db = await supabase();
  if (!db) return [] as Category[];
  const { data } = await db
    .from('categories')
    .select('id,slug,name_ar,name_en,parent_id')
    .eq('active', true)
    .order('sort_order');
  return (data || []) as Category[];
}
export async function brands() {
  const db = await supabase();
  if (!db) return [] as Brand[];
  const { data } = await db
    .from('brands')
    .select('id,slug,name')
    .eq('active', true)
    .order('name');
  return (data || []) as Brand[];
}
function safeSearch(q: string) {
  return q.slice(0, 80).replace(/[%(),.]/g, '');
}
