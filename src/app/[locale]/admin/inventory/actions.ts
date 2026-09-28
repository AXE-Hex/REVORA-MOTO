'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';

const base = z.object({
  locale: z.enum(['ar', 'en']),
  inventory: z.string().uuid(),
  reason: z.string().trim().min(5).max(200),
});

async function staffDb(locale: string) {
  const db = await supabase();
  if (!db) redirect(`/${locale}/admin/inventory?error=unavailable`);
  const { data: allowed } = await db.rpc('has_permission', {
    p_permission: 'inventory.write',
  });
  if (!allowed) redirect(`/${locale}/admin`);
  return db;
}

export async function adjustStock(form: FormData) {
  const parsed = base
    .extend({ delta: z.coerce.number().int().min(-100000).max(100000) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success || parsed.data.delta === 0)
    redirect('/ar/admin/inventory?error=invalid');
  const { locale, inventory, delta, reason } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.rpc('adjust_inventory', {
    p_inventory: inventory,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) redirect(`/${locale}/admin/inventory?error=operation`);
  revalidatePath(`/${locale}/admin/inventory`);
  redirect(`/${locale}/admin/inventory?success=adjusted`);
}

export async function transferStock(form: FormData) {
  const parsed = base
    .extend({
      destination: z.string().uuid(),
      quantity: z.coerce.number().int().positive().max(100000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/inventory?error=invalid');
  const { locale, inventory, destination, quantity, reason } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.rpc('transfer_inventory', {
    p_inventory: inventory,
    p_destination: destination,
    p_quantity: quantity,
    p_reason: reason,
  });
  if (error) redirect(`/${locale}/admin/inventory?error=operation`);
  revalidatePath(`/${locale}/admin/inventory`);
  redirect(`/${locale}/admin/inventory?success=transferred`);
}

export async function createWarehouse(form: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      name: z.string().trim().min(3).max(120),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/inventory?error=invalid');
  const { locale, name } = parsed.data;
  const db = await staffDb(locale);
  const { error } = await db.from('warehouses').insert({ name });
  if (error) redirect(`/${locale}/admin/inventory?error=operation`);
  revalidatePath(`/${locale}/admin/inventory`);
  redirect(`/${locale}/admin/inventory?success=warehouse`);
}
