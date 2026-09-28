'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const schema = z.object({
  locale: z.enum(['ar', 'en']),
  key: z.enum([
    'contact_email',
    'contact_phone',
    'support_hours_ar',
    'support_hours_en',
    'announcement_ar',
    'announcement_en',
  ]),
  value: z.string().max(300),
});

export async function saveSiteSetting(form: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/settings?error=invalid');
  const { locale, key, value } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'settings.write',
  });
  if (!allowed) redirect(`/${locale}/admin`);
  const { error } = await db!.rpc('admin_save_site_setting', {
    p_key: key,
    p_value: value.trim(),
  });
  if (error) redirect(`/${locale}/admin/settings?error=save`);
  redirect(`/${locale}/admin/settings?saved=1`);
}

const checkoutRatesSchema = z.object({
  locale: z.enum(['ar', 'en']),
  shipping: z.coerce.number().min(0).max(10000).multipleOf(0.01),
  tax: z.coerce.number().min(0).max(100).multipleOf(0.01),
});

export async function saveCheckoutRates(form: FormData) {
  const parsed = checkoutRatesSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/settings?error=invalid');
  const { locale, shipping, tax } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('admin_set_checkout_rates', {
    p_shipping: shipping,
    p_tax_percent: tax,
  });
  if (error) redirect(`/${locale}/admin/settings?error=rates`);
  redirect(`/${locale}/admin/settings?saved=1`);
}
