'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

export async function setNotificationRead(formData: FormData) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      locale: z.enum(['ar', 'en']),
      read: z.enum(['true', 'false']),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/notifications?error=invalid');
  const { id, locale, read } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('set_notification_read', {
    p_notification: id,
    p_read: read === 'true',
  });
  if (error) redirect(`/${locale}/account/notifications?error=update`);
  revalidatePath(`/${locale}/account/notifications`);
}
