'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const localeSchema = z.enum(['ar', 'en']);
const uuid = z.string().uuid();

export async function updateCustomerProfile(formData: FormData) {
  const parsed = z
    .object({
      locale: localeSchema,
      full_name: z.string().trim().min(2).max(100),
      phone: z.string().trim().max(20).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/profile?error=invalid');
  const { locale, full_name, phone } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('update_customer_profile', {
    p_full_name: full_name,
    p_phone: phone || null,
  });
  if (error) redirect(`/${locale}/account/profile?error=save`);
  revalidatePath(`/${locale}/account`);
  redirect(`/${locale}/account/profile?saved=1`);
}

export async function saveCustomerAddress(formData: FormData) {
  const parsed = z
    .object({
      locale: localeSchema,
      id: z.union([uuid, z.literal('')]).optional(),
      name: z.string().trim().min(2).max(100),
      line1: z.string().trim().min(5).max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(2).max(100),
      governorate: z.string().trim().min(2).max(100),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9 ]{8,20}$/),
      is_default: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/addresses?error=invalid');
  const { locale, id, is_default, ...fields } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('save_customer_address', {
    p_id: id || null,
    p_name: fields.name,
    p_line1: fields.line1,
    p_line2: fields.line2 || null,
    p_city: fields.city,
    p_governorate: fields.governorate,
    p_phone: fields.phone,
    p_default: is_default === 'on',
  });
  if (error) redirect(`/${locale}/account/addresses?error=save`);
  revalidatePath(`/${locale}/account/addresses`);
  redirect(`/${locale}/account/addresses?saved=1`);
}

export async function deleteCustomerAddress(formData: FormData) {
  const parsed = z
    .object({ id: uuid, locale: localeSchema })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/addresses?error=invalid');
  const { id, locale } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('delete_customer_address', { p_id: id });
  if (error) redirect(`/${locale}/account/addresses?error=delete`);
  revalidatePath(`/${locale}/account/addresses`);
  redirect(`/${locale}/account/addresses?saved=1`);
}

export async function makeDefaultAddress(formData: FormData) {
  const parsed = z
    .object({ id: uuid, locale: localeSchema })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/addresses?error=invalid');
  const { id, locale } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('set_default_address', { p_address: id });
  if (error) redirect(`/${locale}/account/addresses?error=default`);
  revalidatePath(`/${locale}/account/addresses`);
  redirect(`/${locale}/account/addresses?saved=1`);
}

export async function deleteGarageMotorcycle(formData: FormData) {
  const parsed = z
    .object({ id: uuid, locale: localeSchema })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/garage?error=invalid');
  const { id, locale } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('delete_own_garage_motorcycle', {
    p_garage: id,
  });
  if (error) redirect(`/${locale}/account/garage?error=delete`);
  revalidatePath(`/${locale}/account/garage`);
  revalidatePath(`/${locale}/shop`);
  redirect(`/${locale}/account/garage?saved=1`);
}

export async function updateOwnReview(formData: FormData) {
  const parsed = z
    .object({
      id: uuid,
      locale: localeSchema,
      rating: z.coerce.number().int().min(1).max(5),
      body: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/reviews?error=invalid');
  const { id, locale, rating, body } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('update_own_review', {
    p_review: id,
    p_rating: rating,
    p_body: body,
  });
  if (error) redirect(`/${locale}/account/reviews?error=update`);
  revalidatePath(`/${locale}/account/reviews`);
  redirect(`/${locale}/account/reviews?saved=1`);
}

export async function deleteOwnReview(formData: FormData) {
  const parsed = z
    .object({ id: uuid, locale: localeSchema })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/reviews?error=invalid');
  const { id, locale } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('delete_own_review', { p_review: id });
  if (error) redirect(`/${locale}/account/reviews?error=delete`);
  revalidatePath(`/${locale}/account/reviews`);
  redirect(`/${locale}/account/reviews?saved=1`);
}

export async function submitCustomerReview(formData: FormData) {
  const parsed = z
    .object({
      product: uuid,
      order: uuid,
      locale: localeSchema,
      rating: z.coerce.number().int().min(1).max(5),
      body: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/account/reviews?error=invalid');
  const { product, order, locale, rating, body } = parsed.data;
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { error } = await db!.rpc('submit_review', {
    p_product: product,
    p_order: order,
    p_rating: rating,
    p_body: body,
  });
  if (error) redirect(`/${locale}/account/reviews?error=submit`);
  revalidatePath(`/${locale}/account/reviews`);
  redirect(`/${locale}/account/reviews?saved=1`);
}
