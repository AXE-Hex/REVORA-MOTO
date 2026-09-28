'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';

async function staffDb(locale: string) {
  const db = await supabase();
  if (!db) redirect(`/${locale}/admin/suppliers?error=unavailable`);
  const { data: allowed } = await db.rpc('has_permission', {
    p_permission: 'inventory.write',
  });
  if (!allowed) redirect(`/${locale}/admin`);
  return db;
}

export async function createSupplier(form: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      name: z.string().trim().min(2).max(120),
      contact_name: z.string().trim().max(120),
      email: z.union([z.literal(''), z.string().email().max(200)]),
      phone: z.string().trim().max(40),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/suppliers?error=invalid');
  const { locale, ...supplier } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.from('suppliers').insert({
    ...supplier,
    email: supplier.email || null,
  });
  if (error)
    redirect(
      `/${locale}/admin/suppliers?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/${locale}/admin/suppliers`);
  redirect(`/${locale}/admin/suppliers?success=supplier`);
}

export async function linkSupplierProduct(form: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      supplier: z.string().uuid(),
      product: z.string().uuid(),
      supplier_sku: z.string().trim().min(1).max(100),
      cost: z.coerce.number().min(0).max(100000000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/suppliers?error=invalid');
  const { locale, supplier, product, supplier_sku, cost } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.from('supplier_products').upsert(
    {
      supplier_id: supplier,
      product_id: product,
      supplier_sku,
      cost_egp: cost,
    },
    { onConflict: 'supplier_id,product_id' },
  );
  if (error)
    redirect(
      `/${locale}/admin/suppliers?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/${locale}/admin/suppliers`);
  redirect(`/${locale}/admin/suppliers?success=linked`);
}

export async function createPurchaseOrder(form: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      supplier: z.string().uuid(),
      warehouse: z.string().uuid(),
      product: z.string().uuid(),
      variant: z.union([z.literal(''), z.string().uuid()]),
      quantity: z.coerce.number().int().positive().max(100000),
      unit_cost: z.coerce.number().min(0).max(100000000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/suppliers?error=invalid');
  const { locale, supplier, warehouse, product, variant, quantity, unit_cost } =
    parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.rpc('create_purchase_order', {
    p_supplier: supplier,
    p_warehouse: warehouse,
    p_product: product,
    p_variant: variant || null,
    p_quantity: quantity,
    p_unit_cost: unit_cost,
  });
  if (error)
    redirect(
      `/${locale}/admin/suppliers?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/${locale}/admin/suppliers`);
  revalidatePath(`/${locale}/admin/inventory`);
  redirect(`/${locale}/admin/suppliers?success=ordered`);
}

export async function receiveItem(form: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      item: z.string().uuid(),
      quantity: z.coerce.number().int().positive().max(100000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/suppliers?error=invalid');
  const { locale, item, quantity } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.rpc('receive_purchase_order_item', {
    p_item: item,
    p_quantity: quantity,
  });
  if (error)
    redirect(
      `/${locale}/admin/suppliers?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/${locale}/admin/suppliers`);
  revalidatePath(`/${locale}/admin/inventory`);
  redirect(`/${locale}/admin/suppliers?success=received`);
}
