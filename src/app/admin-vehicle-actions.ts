'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { currentUser, supabase } from '@/lib/supabase/server';

const uuid = z.string().uuid();
const locale = z.enum(['ar', 'en']);
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(120);

async function vehicleDb(lang: 'ar' | 'en', permission = 'motorcycles.write') {
  if (!(await currentUser())) redirect(`/${lang}/auth`);
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: permission,
  });
  if (!allowed) redirect(`/${lang}/admin`);
  return db!;
}

export async function saveMotorcycle(form: FormData) {
  const parsed = z
    .object({
      locale,
      id: z.union([uuid, z.literal('')]),
      variant_id: uuid,
      branch_id: uuid,
      slug,
      name_ar: z.string().trim().min(2).max(200),
      name_en: z.string().trim().min(2).max(200),
      description_ar: z.string().trim().max(4000),
      description_en: z.string().trim().max(4000),
      condition: z.enum(['new', 'used']),
      year: z.coerce.number().int().min(1950).max(2100),
      price_egp: z.coerce.number().positive().max(1000000000),
      deposit_egp: z.coerce.number().positive().max(1000000000),
      engine_cc: z.union([z.literal(''), z.coerce.number().int().positive()]),
      horsepower: z.union([z.literal(''), z.coerce.number().positive()]),
      mileage_km: z.union([z.literal(''), z.coerce.number().int().min(0)]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/motorcycles?error=invalid');
  const input = parsed.data;
  if (input.deposit_egp > input.price_egp)
    redirect(`/${input.locale}/admin/motorcycles?error=deposit`);
  const db = await vehicleDb(input.locale);
  const values = {
    variant_id: input.variant_id,
    branch_id: input.branch_id,
    slug: input.slug,
    name_ar: input.name_ar,
    name_en: input.name_en,
    description_ar: input.description_ar || null,
    description_en: input.description_en || null,
    condition: input.condition,
    year: input.year,
    price_egp: input.price_egp,
    deposit_egp: input.deposit_egp,
    engine_cc: input.engine_cc === '' ? null : input.engine_cc,
    horsepower: input.horsepower === '' ? null : input.horsepower,
    mileage_km: input.mileage_km === '' ? null : input.mileage_km,
  };
  const result = input.id
    ? await db.from('motorcycles').update(values).eq('id', input.id)
    : await db.from('motorcycles').insert(values);
  if (result.error) redirect(`/${input.locale}/admin/motorcycles?error=save`);
  redirect(`/${input.locale}/admin/motorcycles?saved=1`);
}

export async function saveUsedDetails(form: FormData) {
  const parsed = z
    .object({
      locale,
      motorcycle_id: uuid,
      owners_count: z.union([
        z.literal(''),
        z.coerce.number().int().min(0).max(100),
      ]),
      service_history: z.string().max(4000),
      accident_status: z.string().max(500),
      mechanical_condition: z.string().max(1000),
      inspection_notes: z.string().max(4000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/motorcycles?error=invalid');
  const input = parsed.data;
  const db = await vehicleDb(input.locale);
  const { data: motorcycle } = await db
    .from('motorcycles')
    .select('condition')
    .eq('id', input.motorcycle_id)
    .maybeSingle();
  if (motorcycle?.condition !== 'used')
    redirect(`/${input.locale}/admin/motorcycles?error=condition`);
  const { error } = await db.from('used_motorcycle_details').upsert({
    motorcycle_id: input.motorcycle_id,
    owners_count: input.owners_count === '' ? null : input.owners_count,
    service_history: input.service_history || null,
    accident_status: input.accident_status || null,
    mechanical_condition: input.mechanical_condition || null,
    inspection_notes: input.inspection_notes || null,
  });
  if (error) redirect(`/${input.locale}/admin/motorcycles?error=used`);
  redirect(
    `/${input.locale}/admin/motorcycles?edit=${input.motorcycle_id}&saved=1`,
  );
}

export async function saveBranch(form: FormData) {
  const parsed = z
    .object({
      locale,
      id: z.union([uuid, z.literal('')]),
      name_ar: z.string().trim().min(2).max(200),
      name_en: z.string().trim().min(2).max(200),
      address_ar: z.string().trim().max(500),
      address_en: z.string().trim().max(500),
      active: z.enum(['true', 'false']),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/branches?error=invalid');
  const input = parsed.data;
  const db = await vehicleDb(input.locale);
  const values = {
    name_ar: input.name_ar,
    name_en: input.name_en,
    address_ar: input.address_ar || null,
    address_en: input.address_en || null,
    active: input.active === 'true',
  };
  const result = input.id
    ? await db.from('branches').update(values).eq('id', input.id)
    : await db.from('branches').insert(values);
  if (result.error) redirect(`/${input.locale}/admin/branches?error=save`);
  redirect(`/${input.locale}/admin/branches?saved=1`);
}

export async function addFitmentRule(form: FormData) {
  const parsed = z
    .object({
      locale,
      product_id: uuid,
      variant_id: z.union([uuid, z.literal('')]),
      year_from: z.union([
        z.literal(''),
        z.coerce.number().int().min(1950).max(2100),
      ]),
      year_to: z.union([
        z.literal(''),
        z.coerce.number().int().min(1950).max(2100),
      ]),
      kind: z.enum(['exact', 'universal', 'exclusion']),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/ar/admin/fitment?error=invalid');
  const input = parsed.data;
  if (input.kind !== 'universal' && !input.variant_id)
    redirect(`/${input.locale}/admin/fitment?error=variant`);
  if (
    input.year_from !== '' &&
    input.year_to !== '' &&
    input.year_to < input.year_from
  )
    redirect(`/${input.locale}/admin/fitment?error=year`);
  const db = await vehicleDb(input.locale, 'catalog.write');
  const { error } = await db.from('fitment_rules').insert({
    product_id: input.product_id,
    variant_id: input.kind === 'universal' ? null : input.variant_id,
    year_from: input.year_from === '' ? null : input.year_from,
    year_to: input.year_to === '' ? null : input.year_to,
    is_universal: input.kind === 'universal',
    is_exclusion: input.kind === 'exclusion',
  });
  if (error) redirect(`/${input.locale}/admin/fitment?error=save`);
  redirect(`/${input.locale}/admin/fitment?saved=1`);
}
