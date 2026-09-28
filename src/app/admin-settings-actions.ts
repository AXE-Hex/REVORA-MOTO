'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

export async function saveSiteSettings(form: FormData) {
  const locale = z.enum(['ar', 'en']).safeParse(form.get('locale'));
  const keys = form.getAll('key');
  const values = form.getAll('value');
  const validKeys = new Set([
    'contact_email',
    'contact_phone',
    'support_hours_ar',
    'support_hours_en',
    'announcement_ar',
    'announcement_en',
  ]);
  if (
    !locale.success ||
    keys.length !== values.length ||
    keys.length !== validKeys.size
  ) {
    redirect('/ar/admin/settings?error=invalid');
  }
  const entries = keys.map((key, index) => ({ key, value: values[index] }));
  const parsed = z
    .array(
      z.object({
        key: z.string().refine((key) => validKeys.has(key)),
        value: z.string().max(300),
      }),
    )
    .safeParse(entries);
  if (
    !parsed.success ||
    new Set(parsed.data.map((entry) => entry.key)).size !== validKeys.size
  ) {
    redirect(`/${locale.data}/admin/settings?error=invalid`);
  }
  if (!(await currentUser())) redirect(`/${locale.data}/auth`);
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'settings.write',
  });
  if (!allowed) redirect(`/${locale.data}/admin`);
  for (const entry of parsed.data) {
    const { error } = await db!.rpc('admin_save_site_setting', {
      p_key: entry.key,
      p_value: entry.value.trim(),
    });
    if (error) redirect(`/${locale.data}/admin/settings?error=save`);
  }
  redirect(`/${locale.data}/admin/settings?saved=1`);
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
