'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';

type Result = { error?: string; success?: boolean };
const uuid = z.string().uuid();
async function authorized() {
  const db = await supabase();
  if (!db) return null;
  const {
    data: { user },
  } = await db.auth.getUser();
  return user ? db : null;
}
export async function addToCart(
  productId: string,
  locale: string,
  variantId?: string,
): Promise<Result> {
  if (
    !isLocale(locale) ||
    !uuid.safeParse(productId).success ||
    (variantId && !uuid.safeParse(variantId).success)
  )
    return { error: 'Invalid request' };
  const db = await authorized();
  if (!db) return { error: 'Please sign in first' };
  const { error } = await db.rpc('add_cart_item', {
    p_product: productId,
    p_quantity: 1,
    p_variant: variantId || null,
  });
  if (error)
    return {
      error: pick(locale, 'تعذر تحديث السلة.', 'Could not update the cart.'),
    };
  revalidatePath(`/${locale}/cart`);
  return { success: true };
}
export async function removeFromCart(
  itemId: string,
  locale: string,
): Promise<Result> {
  if (!isLocale(locale) || !uuid.safeParse(itemId).success)
    return { error: 'Invalid request' };
  const db = await authorized();
  if (!db) return { error: 'Please sign in first' };
  const { error } = await db.rpc('remove_cart_item', { p_item: itemId });
  if (error)
    return {
      error: pick(locale, 'تعذر تحديث السلة.', 'Could not update the cart.'),
    };
  revalidatePath(`/${locale}/cart`);
  return { success: true };
}
export async function updateCartQuantity(
  itemId: string,
  quantity: number,
  locale: string,
): Promise<Result> {
  if (
    !isLocale(locale) ||
    !uuid.safeParse(itemId).success ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  )
    return { error: 'Invalid request' };
  const db = await authorized();
  if (!db) return { error: 'Please sign in first' };
  const { error } = await db.rpc('update_cart_item_quantity', {
    p_item: itemId,
    p_quantity: quantity,
  });
  if (error)
    return {
      error: pick(
        locale,
        'لا تتوفر هذه الكمية حالياً. تحقق من المخزون وحاول مرة أخرى.',
        'That quantity is not currently available. Check stock and try again.',
      ),
    };
  revalidatePath(`/${locale}/cart`);
  revalidatePath(`/${locale}/checkout`);
  return { success: true };
}
export async function reserve(formData: FormData) {
  const parsed = z
    .object({ motorcycle: uuid, branch: uuid, locale: z.enum(['ar', 'en']) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/motorcycles');
  const { motorcycle, branch, locale } = parsed.data;
  const db = await authorized();
  if (!db) redirect(`/${locale}/auth?next=/${locale}/reserve/${motorcycle}`);
  const { data, error } = await db.rpc('reserve_motorcycle', {
    p_motorcycle: motorcycle,
    p_branch: branch,
  });
  if (error) redirect(`/${locale}/reservations?error=operation`);
  redirect(`/${locale}/reservations/${data}?created=1`);
}
export async function cancelReservation(formData: FormData) {
  const parsed = z
    .object({ id: uuid, locale: z.enum(['ar', 'en']) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/reservations?error=invalid');
  const { id, locale } = parsed.data;
  const db = await authorized();
  if (!db) redirect(`/${locale}/auth`);
  const { error } = await db.rpc('cancel_unpaid_reservation', {
    p_reservation: id,
  });
  if (error) redirect(`/${locale}/reservations/${id}?error=cancel`);
  redirect(`/${locale}/reservations/${id}?updated=1`);
}
export async function placeOrder(formData: FormData) {
  const parsed = z
    .object({
      address: uuid,
      method: z.enum(['card', 'instapay']),
      locale: z.enum(['ar', 'en']),
      coupon: z.string().max(40).optional(),
      requestKey: uuid,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/cart?error=invalid');
  const { address, method, locale, coupon, requestKey } = parsed.data;
  const db = await authorized();
  if (!db) redirect(`/${locale}/auth`);
  const { data, error } = await db.rpc('place_order', {
    p_address: address,
    p_method: method,
    p_code: coupon?.trim() || null,
    p_request_key: requestKey,
  });
  if (error) redirect(`/${locale}/cart?error=operation`);
  redirect(`/${locale}/orders/${data}`);
}
export async function addGarage(formData: FormData) {
  const parsed = z
    .object({
      locale: z.enum(['ar', 'en']),
      variant: uuid,
      year: z.coerce.number().int().min(1950).max(2100),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/fitment?error=invalid');
  const { locale, variant, year } = parsed.data;
  const db = await authorized();
  if (!db) redirect(`/${locale}/auth`);
  const {
    data: { user },
  } = await db.auth.getUser();
  const { error } = await db
    .from('garage_motorcycles')
    .insert({ user_id: user!.id, variant_id: variant, year });
  if (error) redirect(`/${locale}/fitment?error=operation`);
  revalidatePath(`/${locale}/fitment`);
  redirect(`/${locale}/fitment`);
}
export async function toggleWishlist(
  id: string,
  kind: 'product' | 'motorcycle',
  locale: string,
): Promise<Result> {
  if (
    !uuid.safeParse(id).success ||
    !isLocale(locale) ||
    !['product', 'motorcycle'].includes(kind)
  )
    return { error: 'Invalid request' };
  const db = await authorized();
  if (!db) return { error: 'Please sign in first' };
  const {
    data: { user },
  } = await db.auth.getUser();
  const column = kind === 'product' ? 'product_id' : 'motorcycle_id';
  const { data: existing } = await db
    .from('wishlist_items')
    .select(column)
    .eq('user_id', user!.id)
    .eq(column, id)
    .maybeSingle();
  const { error } = existing
    ? await db
        .from('wishlist_items')
        .delete()
        .eq('user_id', user!.id)
        .eq(column, id)
    : await db
        .from('wishlist_items')
        .insert({ user_id: user!.id, [column]: id });
  if (error)
    return {
      error: pick(locale, 'تعذر تحديث المفضلة.', 'Could not update wishlist.'),
    };
  revalidatePath(`/${locale}/account/wishlist`);
  return { success: true };
}
export async function submitReview(formData: FormData) {
  const parsed = z
    .object({
      product: uuid,
      order: uuid,
      rating: z.coerce.number().int().min(1).max(5),
      body: z.string().min(10).max(2000),
      locale: z.enum(['ar', 'en']),
      slug: z.string().min(1).max(150),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/ar/shop?error=invalid');
  const { product, order, rating, body, locale, slug } = parsed.data;
  const db = await authorized();
  if (!db) redirect(`/${locale}/auth`);
  const { error } = await db.rpc('submit_review', {
    p_product: product,
    p_order: order,
    p_rating: rating,
    p_body: body,
  });
  if (error) redirect(`/${locale}/shop/${slug}?review_error=operation`);
  revalidatePath(`/${locale}/shop/${slug}`);
  redirect(`/${locale}/shop/${slug}?review=pending`);
}
