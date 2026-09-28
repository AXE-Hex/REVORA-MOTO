'use server';

import { redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale } from '@/lib/i18n';

export async function setActiveGarage(formData: FormData) {
  const rawLocale = String(formData.get('locale') || 'ar');
  const locale = isLocale(rawLocale) ? rawLocale : 'ar';
  const id = String(formData.get('garage') || '');
  if (!/^[0-9a-f-]{36}$/i.test(id))
    redirect(`/${locale}/fitment?error=invalid`);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/fitment`);
  const db = await supabase();
  const { error } = await db!.rpc('set_active_garage', { p_garage: id });
  if (error) redirect(`/${locale}/fitment?error=garage`);
  redirect(`/${locale}/shop?compatible=1`);
}
