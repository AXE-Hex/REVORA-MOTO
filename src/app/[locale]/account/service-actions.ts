'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { EVIDENCE_IMAGE_LIMIT, validateImageFile } from '@/lib/image-upload';

const uuid = z.string().uuid();
const localeSchema = z.enum(['ar', 'en']);
type Database = NonNullable<Awaited<ReturnType<typeof supabase>>>;

async function customer(locale: string) {
  const db = await supabase();
  if (!db) redirect(`/${locale}/auth`);
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);
  return { db, user };
}

function failure(
  locale: string,
  section: 'returns' | 'warranties',
  message: string,
) {
  redirect(
    `/${locale}/account/${section}?error=${encodeURIComponent(message)}`,
  );
}

async function uploadEvidence(
  db: Database,
  userId: string,
  kind: 'returns' | 'claims',
  caseId: string,
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const image = await validateImageFile(file, EVIDENCE_IMAGE_LIMIT);
  if (!image)
    return 'Only genuine JPEG, PNG or WebP images up to 5 MB are accepted';
  const path = `${userId}/${kind}/${caseId}/${randomUUID()}.${image.extension}`;
  const { error: uploadError } = await db.storage
    .from('case-evidence')
    .upload(path, image.file, { contentType: image.mime, upsert: false });
  if (uploadError) return uploadError.message;
  const { error } = await db.rpc('register_case_attachment', {
    p_case: caseId,
    p_kind: kind,
    p_path: path,
    p_mime: image.mime,
    p_size: image.file.size,
  });
  if (error) {
    await db.storage.from('case-evidence').remove([path]);
    return error.message;
  }
  return null;
}

export async function requestReturn(formData: FormData) {
  const parsed = z
    .object({
      locale: localeSchema,
      order_item: uuid,
      quantity: z.coerce.number().int().min(1).max(99),
      reason: z.string().trim().min(5).max(500),
      customer_notes: z.string().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/returns?error=invalid');
  const { locale, order_item, quantity, reason, customer_notes } = parsed.data;
  const evidence = formData.get('evidence');
  if (
    evidence instanceof File &&
    evidence.size > 0 &&
    !(await validateImageFile(evidence, EVIDENCE_IMAGE_LIMIT))
  )
    failure(locale, 'returns', 'Invalid evidence image');
  const { db, user } = await customer(locale);
  const { data, error } = await db.rpc('request_return', {
    p_order_item: order_item,
    p_quantity: quantity,
    p_reason: reason,
    p_customer_notes: customer_notes || null,
  });
  if (error || !data)
    failure(locale, 'returns', error?.message || 'Could not create return');
  const imageError = await uploadEvidence(
    db,
    user.id,
    'returns',
    data,
    evidence,
  );
  revalidatePath(`/${locale}/account/returns`);
  if (imageError)
    failure(
      locale,
      'returns',
      `Return created, but image upload failed: ${imageError}`,
    );
  redirect(`/${locale}/account/returns`);
}

export async function registerWarranty(formData: FormData) {
  const parsed = z
    .object({
      locale: localeSchema,
      registration: z.string().max(50),
      serial: z.string().max(120).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/warranties?error=invalid');
  const { locale, registration, serial } = parsed.data;
  const [order_item, unitText] = registration.split(':');
  const unit = Number(unitText);
  if (
    !uuid.safeParse(order_item).success ||
    !Number.isInteger(unit) ||
    unit < 1 ||
    unit > 99
  )
    failure(locale, 'warranties', 'Invalid unit');
  const { db } = await customer(locale);
  const { error } = await db.rpc('register_warranty', {
    p_order_item: order_item,
    p_serial: serial || null,
    p_unit: unit,
  });
  if (error) failure(locale, 'warranties', error.message);
  revalidatePath(`/${locale}/account/warranties`);
  redirect(`/${locale}/account/warranties`);
}

export async function requestWarrantyClaim(formData: FormData) {
  const parsed = z
    .object({
      locale: localeSchema,
      warranty: uuid,
      details: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/warranties?error=invalid');
  const { locale, warranty, details } = parsed.data;
  const evidence = formData.get('evidence');
  if (
    evidence instanceof File &&
    evidence.size > 0 &&
    !(await validateImageFile(evidence, EVIDENCE_IMAGE_LIMIT))
  )
    failure(locale, 'warranties', 'Invalid evidence image');
  const { db, user } = await customer(locale);
  const { data, error } = await db.rpc('request_warranty_claim', {
    p_warranty: warranty,
    p_details: details,
  });
  if (error || !data)
    failure(locale, 'warranties', error?.message || 'Could not create claim');
  const imageError = await uploadEvidence(
    db,
    user.id,
    'claims',
    data,
    evidence,
  );
  revalidatePath(`/${locale}/account/warranties`);
  if (imageError)
    failure(
      locale,
      'warranties',
      `Claim created, but image upload failed: ${imageError}`,
    );
  redirect(`/${locale}/account/warranties`);
}
