'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const schema = z.object({
  locale: z.enum(['ar', 'en']),
  id: z.string().uuid(),
});

export async function cancelOwnOrder(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/orders?error=invalid');
  const { locale, id } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('cancel_own_unpaid_order', { p_order: id });
  if (error) redirect(`/${locale}/orders/${id}?error=cancel`);
  redirect(`/${locale}/orders/${id}?updated=1`);
}
