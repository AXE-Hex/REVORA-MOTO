'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';

const uuid = z.string().uuid();
const schema = z.object({
  locale: z.enum(['ar', 'en']),
  id: z.union([uuid, z.literal('')]).optional(),
  code: z.string().max(40),
  name: z.string().trim().min(3).max(120),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().positive(),
  min_total: z.coerce.number().min(0),
  global_limit: z.union([z.literal(''), z.coerce.number().int().positive()]),
  customer_limit: z.union([z.literal(''), z.coerce.number().int().positive()]),
  starts: z.string().min(1),
  ends: z.string().min(1),
  active: z.enum(['true', 'false']),
});

export async function savePromotion(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const locale = formData.get('locale') === 'en' ? 'en' : 'ar';
  const fail = (message: string): never =>
    redirect(
      `/${locale}/admin/promotions?error=${encodeURIComponent(message)}`,
    );
  if (!parsed.success) return fail('Invalid promotion details');
  const input = parsed.data;
  if (input.type === 'percent' && input.value > 100)
    fail('Percentage cannot exceed 100');
  if (
    ![input.starts, input.ends].every((x) => /(?:Z|[+-]\d{2}:\d{2})$/.test(x))
  )
    fail(
      'Dates must include a timezone, for example 2026-10-01T09:00:00+03:00',
    );
  const starts = new Date(input.starts);
  const ends = new Date(input.ends);
  if (
    !Number.isFinite(starts.valueOf()) ||
    !Number.isFinite(ends.valueOf()) ||
    ends <= starts
  )
    fail('Invalid promotion dates');
  const targets = formData.getAll('targets').map((value) => {
    const [kind, id] = String(value).split(':');
    return { kind, id };
  });
  if (
    targets.length > 100 ||
    targets.some(
      (target) =>
        !['product', 'category', 'brand'].includes(target.kind) ||
        !uuid.safeParse(target.id).success,
    )
  )
    fail('Invalid promotion target');
  const db = await supabase();
  if (!db) fail('Database unavailable');
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'catalog.write',
  });
  if (!allowed) fail('Forbidden');
  const { error } = await db!.rpc('save_promotion', {
    p_id: input.id || null,
    p_code: input.code.trim().toUpperCase() || null,
    p_name: input.name,
    p_type: input.type,
    p_value: input.value,
    p_min_total: input.min_total,
    p_global_limit: input.global_limit === '' ? null : input.global_limit,
    p_customer_limit: input.customer_limit === '' ? null : input.customer_limit,
    p_starts: starts.toISOString(),
    p_ends: ends.toISOString(),
    p_active: input.active === 'true',
    p_targets: targets,
  });
  if (error) fail('operation');
  revalidatePath(`/${locale}/admin/promotions`);
  redirect(`/${locale}/admin/promotions?saved=1`);
}

export async function togglePromotion(formData: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      id: uuid,
      active: z.enum(['true', 'false']),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/admin/promotions?error=invalid');
  const { locale, id, active } = parsed.data;
  const db = await supabase();
  if (!db) redirect(`/${locale}/admin/promotions?error=database`);
  const { data: allowed } = await db.rpc('has_permission', {
    p_permission: 'catalog.write',
  });
  if (!allowed) redirect(`/${locale}/admin/promotions?error=forbidden`);
  const { error } = await db
    .from('promotions')
    .update({ active: active === 'true' })
    .eq('id', id);
  if (error) redirect(`/${locale}/admin/promotions?error=operation`);
  revalidatePath(`/${locale}/admin/promotions`);
  redirect(`/${locale}/admin/promotions?saved=1`);
}
