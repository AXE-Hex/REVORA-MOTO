'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const uuid = z.string().uuid();
const locale = z.enum(['ar', 'en']);
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

async function catalogDb(lang: 'ar' | 'en') {
  if (!(await currentUser())) redirect(`/${lang}/auth`);
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'catalog.write',
  });
  if (!allowed) redirect(`/${lang}/admin`);
  return db!;
}

export async function saveProduct(form: FormData) {
  const parsed = z
    .object({
      locale,
      id: z.union([uuid, z.literal('')]),
      slug,
      sku: z.string().trim().min(2).max(80),
      name_ar: z.string().trim().min(2).max(200),
      name_en: z.string().trim().min(2).max(200),
      description_ar: z.string().trim().max(4000),
      description_en: z.string().trim().max(4000),
      category_id: z.union([uuid, z.literal('')]),
      brand_id: z.union([uuid, z.literal('')]),
      price_egp: z.coerce.number().min(0).max(100000000),
      sale_price_egp: z.union([
        z.literal(''),
        z.coerce.number().min(0).max(100000000),
      ]),
      status: z.enum(['draft', 'active', 'archived']),
      featured: z.enum(['true', 'false']),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/products?error=invalid');
  const input = parsed.data;
  if (input.sale_price_egp !== '' && input.sale_price_egp > input.price_egp)
    redirect(`/${input.locale}/admin/products?error=sale`);
  const db = await catalogDb(input.locale);
  const values = {
    slug: input.slug,
    sku: input.sku,
    name_ar: input.name_ar,
    name_en: input.name_en,
    description_ar: input.description_ar || null,
    description_en: input.description_en || null,
    category_id: input.category_id || null,
    brand_id: input.brand_id || null,
    price_egp: input.price_egp,
    sale_price_egp: input.sale_price_egp === '' ? null : input.sale_price_egp,
    status: input.status,
    featured: input.featured === 'true',
  };
  const result = input.id
    ? await db.from('products').update(values).eq('id', input.id)
    : await db.from('products').insert({ ...values, stock: 0 });
  if (result.error) redirect(`/${input.locale}/admin/products?error=save`);
  redirect(`/${input.locale}/admin/products?saved=1`);
}

export async function saveVariant(form: FormData) {
  const parsed = z
    .object({
      locale,
      id: z.union([uuid, z.literal('')]),
      product_id: uuid,
      sku: z.string().trim().min(2).max(80),
      size: z.string().trim().max(80),
      color: z.string().trim().max(80),
      price_egp: z.coerce.number().min(0).max(100000000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/products?error=invalid');
  const input = parsed.data;
  const db = await catalogDb(input.locale);
  const attributes = {
    ...(input.size ? { size: input.size } : {}),
    ...(input.color ? { color: input.color } : {}),
  };
  const values = {
    product_id: input.product_id,
    sku: input.sku,
    attributes,
    price_egp: input.price_egp,
  };
  const result = input.id
    ? await db
        .from('product_variants')
        .update(values)
        .eq('id', input.id)
        .eq('product_id', input.product_id)
    : await db.from('product_variants').insert({ ...values, stock: 0 });
  if (result.error) redirect(`/${input.locale}/admin/products?error=variant`);
  redirect(`/${input.locale}/admin/products?edit=${input.product_id}&saved=1`);
}

export async function saveBrand(form: FormData) {
  const parsed = z
    .object({
      locale,
      id: z.union([uuid, z.literal('')]),
      slug,
      name: z.string().trim().min(2).max(120),
      active: z.enum(['true', 'false']),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/brands?error=invalid');
  const input = parsed.data;
  const db = await catalogDb(input.locale);
  const values = {
    slug: input.slug,
    name: input.name,
    active: input.active === 'true',
  };
  const result = input.id
    ? await db.from('brands').update(values).eq('id', input.id)
    : await db.from('brands').insert(values);
  if (result.error) redirect(`/${input.locale}/admin/brands?error=save`);
  redirect(`/${input.locale}/admin/brands?saved=1`);
}

export async function saveCategory(form: FormData) {
  const parsed = z
    .object({
      locale,
      id: z.union([uuid, z.literal('')]),
      parent_id: z.union([uuid, z.literal('')]),
      slug,
      name_ar: z.string().trim().min(2).max(120),
      name_en: z.string().trim().min(2).max(120),
      active: z.enum(['true', 'false']),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/categories?error=invalid');
  const input = parsed.data;
  if (input.id && input.id === input.parent_id)
    redirect(`/${input.locale}/admin/categories?error=parent`);
  const db = await catalogDb(input.locale);
  const values = {
    parent_id: input.parent_id || null,
    slug: input.slug,
    name_ar: input.name_ar,
    name_en: input.name_en,
    active: input.active === 'true',
  };
  const result = input.id
    ? await db.from('categories').update(values).eq('id', input.id)
    : await db.from('categories').insert(values);
  if (result.error) redirect(`/${input.locale}/admin/categories?error=save`);
  redirect(`/${input.locale}/admin/categories?saved=1`);
}
