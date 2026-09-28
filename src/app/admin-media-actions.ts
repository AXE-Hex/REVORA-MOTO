'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { CATALOG_IMAGE_LIMIT, validateImageFile } from '@/lib/image-upload';
import { currentUser, supabase } from '@/lib/supabase/server';

const fields = z.object({
  locale: z.enum(['ar', 'en']),
  kind: z.enum(['products', 'motorcycles']),
  item_id: z.string().uuid(),
  alt_ar: z.string().trim().min(2).max(200),
  alt_en: z.string().trim().min(2).max(200),
  sort_order: z.coerce.number().int().min(0).max(1000),
});

const imageFields = fields
  .pick({ locale: true, kind: true, item_id: true })
  .extend({
    image_id: z.string().uuid(),
  });

const variantFields = z.object({
  locale: z.enum(['ar', 'en']),
  product_id: z.string().uuid(),
  variant_id: z.string().uuid(),
});

function target(locale: string, kind: string, id: string, status: string) {
  return `/${locale}/admin/${kind}?edit=${id}&${status}`;
}

async function staffDb(locale: 'ar' | 'en', kind: 'products' | 'motorcycles') {
  if (!(await currentUser())) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: kind === 'products' ? 'catalog.write' : 'motorcycles.write',
  });
  if (!allowed) redirect(`/${locale}/admin`);
  return db!;
}

function tables(kind: 'products' | 'motorcycles') {
  return kind === 'products'
    ? ({
        parent: 'products',
        images: 'product_images',
        foreign: 'product_id',
      } as const)
    : ({
        parent: 'motorcycles',
        images: 'motorcycle_images',
        foreign: 'motorcycle_id',
      } as const);
}

export async function uploadCatalogImage(form: FormData) {
  const parsed = fields.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin?error=invalid-media');
  const input = parsed.data;
  const db = await staffDb(input.locale, input.kind);
  const image = await validateImageFile(form.get('image'), CATALOG_IMAGE_LIMIT);
  if (!image)
    redirect(
      target(input.locale, input.kind, input.item_id, 'error=image-file'),
    );
  const { parent, images, foreign } = tables(input.kind);
  const { data: item, error: itemError } = await db
    .from(parent)
    .select('id,image_url')
    .eq('id', input.item_id)
    .maybeSingle();
  if (itemError || !item)
    redirect(target(input.locale, input.kind, input.item_id, 'error=missing'));
  const path = `${input.kind}/${input.item_id}/${randomUUID()}.${image.extension}`;
  const uploaded = await db.storage
    .from('catalog-media')
    .upload(path, image.file, {
      contentType: image.mime,
      upsert: false,
      cacheControl: '31536000',
    });
  if (uploaded.error)
    redirect(target(input.locale, input.kind, input.item_id, 'error=upload'));
  const url = db.storage.from('catalog-media').getPublicUrl(path)
    .data.publicUrl;
  const created = await db.from(images).insert({
    [foreign]: input.item_id,
    url,
    alt_ar: input.alt_ar,
    alt_en: input.alt_en,
    sort_order: input.sort_order,
  });
  if (created.error) {
    await db.storage.from('catalog-media').remove([path]);
    redirect(target(input.locale, input.kind, input.item_id, 'error=record'));
  }
  if (!item.image_url) {
    const updated = await db
      .from(parent)
      .update({ image_url: url })
      .eq('id', input.item_id);
    if (updated.error)
      redirect(
        target(input.locale, input.kind, input.item_id, 'error=primary'),
      );
  }
  revalidatePath(
    `/${input.locale}/${input.kind === 'products' ? 'shop' : 'motorcycles'}`,
  );
  redirect(target(input.locale, input.kind, input.item_id, 'saved=1'));
}

export async function setPrimaryCatalogImage(form: FormData) {
  const parsed = imageFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin?error=invalid-media');
  const input = parsed.data;
  const db = await staffDb(input.locale, input.kind);
  const { parent, images, foreign } = tables(input.kind);
  const { data: image } = await db
    .from(images)
    .select('url')
    .eq('id', input.image_id)
    .eq(foreign, input.item_id)
    .maybeSingle();
  if (!image)
    redirect(target(input.locale, input.kind, input.item_id, 'error=missing'));
  const { error } = await db
    .from(parent)
    .update({ image_url: image.url })
    .eq('id', input.item_id);
  if (error)
    redirect(target(input.locale, input.kind, input.item_id, 'error=primary'));
  revalidatePath(
    `/${input.locale}/${input.kind === 'products' ? 'shop' : 'motorcycles'}`,
  );
  redirect(target(input.locale, input.kind, input.item_id, 'saved=1'));
}

export async function removeCatalogImage(form: FormData) {
  const parsed = imageFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin?error=invalid-media');
  const input = parsed.data;
  const db = await staffDb(input.locale, input.kind);
  const { parent, images, foreign } = tables(input.kind);
  const [{ data: item }, { data: image }] = await Promise.all([
    db.from(parent).select('image_url').eq('id', input.item_id).maybeSingle(),
    db
      .from(images)
      .select('url')
      .eq('id', input.image_id)
      .eq(foreign, input.item_id)
      .maybeSingle(),
  ]);
  if (!item || !image)
    redirect(target(input.locale, input.kind, input.item_id, 'error=missing'));
  const { error } = await db
    .from(images)
    .delete()
    .eq('id', input.image_id)
    .eq(foreign, input.item_id);
  if (error)
    redirect(target(input.locale, input.kind, input.item_id, 'error=delete'));
  if (item.image_url === image.url) {
    const { data: next } = await db
      .from(images)
      .select('url')
      .eq(foreign, input.item_id)
      .order('sort_order')
      .limit(1)
      .maybeSingle();
    const updated = await db
      .from(parent)
      .update({ image_url: next?.url || null })
      .eq('id', input.item_id);
    if (updated.error)
      redirect(
        target(input.locale, input.kind, input.item_id, 'error=primary'),
      );
  }
  const marker = '/storage/v1/object/public/catalog-media/';
  const path = image.url.split(marker)[1];
  if (
    path &&
    /^(?:products|motorcycles)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(
      path,
    )
  )
    await db.storage.from('catalog-media').remove([path]);
  revalidatePath(
    `/${input.locale}/${input.kind === 'products' ? 'shop' : 'motorcycles'}`,
  );
  redirect(target(input.locale, input.kind, input.item_id, 'saved=1'));
}

export async function uploadVariantImage(form: FormData) {
  const parsed = variantFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/products?error=invalid-media');
  const input = parsed.data;
  const db = await staffDb(input.locale, 'products');
  const image = await validateImageFile(form.get('image'), CATALOG_IMAGE_LIMIT);
  if (!image)
    redirect(
      target(input.locale, 'products', input.product_id, 'error=image-file'),
    );
  const { data: variant } = await db
    .from('product_variants')
    .select('id,image_url')
    .eq('id', input.variant_id)
    .eq('product_id', input.product_id)
    .maybeSingle();
  if (!variant)
    redirect(
      target(input.locale, 'products', input.product_id, 'error=missing'),
    );
  const path =
    'variants/' + input.variant_id + '/' + randomUUID() + '.' + image.extension;
  const uploaded = await db.storage
    .from('catalog-media')
    .upload(path, image.file, {
      contentType: image.mime,
      upsert: false,
      cacheControl: '31536000',
    });
  if (uploaded.error)
    redirect(
      target(input.locale, 'products', input.product_id, 'error=upload'),
    );
  const url = db.storage.from('catalog-media').getPublicUrl(path)
    .data.publicUrl;
  const { error } = await db
    .from('product_variants')
    .update({ image_url: url })
    .eq('id', input.variant_id)
    .eq('product_id', input.product_id);
  if (error) {
    await db.storage.from('catalog-media').remove([path]);
    redirect(
      target(input.locale, 'products', input.product_id, 'error=record'),
    );
  }
  const marker = '/storage/v1/object/public/catalog-media/';
  const previousPath = variant.image_url?.split(marker)[1];
  if (
    previousPath &&
    /^variants\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(
      previousPath,
    )
  )
    await db.storage.from('catalog-media').remove([previousPath]);
  revalidatePath('/' + input.locale + '/shop');
  redirect(target(input.locale, 'products', input.product_id, 'saved=1'));
}
