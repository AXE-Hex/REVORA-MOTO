'use server';

import { redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale } from '@/lib/i18n';
import { z } from 'zod';

function actionInput(formData: FormData) {
  const raw = String(formData.get('locale') || 'ar');
  return {
    locale: isLocale(raw) ? raw : 'ar',
    id: String(formData.get('id') || ''),
    status: String(formData.get('status') || ''),
  };
}

export async function adminTransitionOrder(formData: FormData) {
  const { locale, id, status } = actionInput(formData);
  const path = `/${locale}/admin/orders`;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(`${path}?error=invalid`);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('admin_transition_order', {
    p_order: id,
    p_status: status,
  });
  if (error) redirect(`${path}?error=transition`);
  redirect(`${path}?updated=1`);
}

const shipmentSchema = z.object({
  locale: z.enum(['ar', 'en']),
  id: z.string().uuid(),
  carrier: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[^\x00-\x1f\x7f]+$/),
  tracking: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[^\x00-\x1f\x7f]+$/),
});

export async function adminShipOrder(formData: FormData) {
  const parsed = shipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/admin/orders?error=invalid');
  const { locale, id, carrier, tracking } = parsed.data;
  const path = `/${locale}/admin/orders/${id}`;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('admin_ship_order', {
    p_order: id,
    p_carrier: carrier,
    p_tracking: tracking,
  });
  if (error) redirect(`${path}?error=shipment`);
  redirect(`${path}?updated=1`);
}

export async function adminTransitionReservation(formData: FormData) {
  const { locale, id, status } = actionInput(formData);
  const path = `/${locale}/admin/reservations`;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(`${path}?error=invalid`);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('admin_transition_reservation', {
    p_reservation: id,
    p_status: status,
  });
  if (error) redirect(`${path}?error=transition`);
  redirect(`${path}?updated=1`);
}

export async function adminRequestReservationRefund(formData: FormData) {
  const { locale, id } = actionInput(formData);
  const path = `/${locale}/admin/reservations`;
  const reason = String(formData.get('reason') || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || reason.length < 5 || reason.length > 500)
    redirect(`${path}?error=invalid`);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('request_reservation_refund', {
    p_reservation: id,
    p_reason: reason,
  });
  if (error) redirect(`${path}?error=refund`);
  redirect(`${path}?updated=1`);
}

export async function adminRetryRefund(formData: FormData) {
  const { locale, id } = actionInput(formData);
  const target = String(formData.get('target') || 'returns');
  const path = `/${locale}/admin/${target === 'reservations' ? 'reservations' : 'returns'}`;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(`${path}?error=invalid`);
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('retry_failed_refund', { p_refund: id });
  if (error) redirect(`${path}?error=refund`);
  redirect(`${path}?updated=1`);
}

export async function adminModerateReview(formData: FormData) {
  const { locale, id, status } = actionInput(formData);
  const path = `/${locale}/admin/reviews`;
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !['published', 'rejected'].includes(status)
  )
    redirect(`${path}?error=invalid`);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'content.write',
  });
  if (!allowed) redirect(`${path}?error=forbidden`);
  const { error } = await db!
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .eq('status', 'pending');
  if (error) redirect(`${path}?error=transition`);
  redirect(`${path}?updated=1`);
}
