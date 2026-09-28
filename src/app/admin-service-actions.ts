'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const inputSchema = z.object({
  locale: z.enum(['ar', 'en']),
  id: z.string().uuid(),
  status: z.string().min(1),
  note: z.string().max(2000).optional(),
  inspection: z.string().max(2000).optional(),
});

export async function advanceReturn(formData: FormData) {
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/admin/returns?error=invalid');
  const { locale, id, status, note, inspection } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('advance_return', {
    p_return: id,
    p_status: status,
    p_admin_notes: note || null,
    p_inspection_notes: inspection || null,
  });
  if (error) redirect(`/${locale}/admin/returns?error=transition`);
  redirect(`/${locale}/admin/returns?updated=1`);
}

export async function advanceWarrantyClaim(formData: FormData) {
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/admin/warranties?error=invalid');
  const { locale, id, status, note } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('advance_warranty_claim', {
    p_claim: id,
    p_status: status,
    p_note: note || null,
  });
  if (error) redirect(`/${locale}/admin/warranties?error=transition`);
  redirect(`/${locale}/admin/warranties?updated=1`);
}
