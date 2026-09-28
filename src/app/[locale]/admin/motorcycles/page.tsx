import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { saveMotorcycle, saveUsedDetails } from '@/app/admin-vehicle-actions';
import {
  removeCatalogImage,
  setPrimaryCatalogImage,
  uploadCatalogImage,
} from '@/app/admin-media-actions';

export default async function AdminMotorcycles({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'motorcycles.write',
  });
  if (!allowed) notFound();
  const query = await searchParams;
  const [
    { data: bikes },
    { data: variants },
    { data: models },
    { data: brands },
    { data: branches },
  ] = await Promise.all([
    db!
      .from('motorcycles')
      .select(
        'id,variant_id,branch_id,slug,name_ar,name_en,description_ar,description_en,condition,year,price_egp,deposit_egp,engine_cc,horsepower,mileage_km,availability,image_url',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    db!.from('motorcycle_variants').select('id,model_id,name').order('name'),
    db!.from('motorcycle_models').select('id,brand_id,name'),
    db!.from('motorcycle_brands').select('id,name'),
    db!.from('branches').select('id,name_ar,name_en,active').order('name_en'),
  ]);
  const selected = (bikes || []).find((bike) => bike.id === query.edit);
  const [{ data: used }, { data: images }] = selected
    ? await Promise.all([
        db!
          .from('used_motorcycle_details')
          .select(
            'owners_count,service_history,accident_status,mechanical_condition,inspection_notes',
          )
          .eq('motorcycle_id', selected.id)
          .maybeSingle(),
        db!
          .from('motorcycle_images')
          .select('id,url,alt_ar,alt_en,sort_order')
          .eq('motorcycle_id', selected.id)
          .order('sort_order'),
      ])
    : [{ data: null }, { data: [] }];
  const modelById = new Map((models || []).map((model) => [model.id, model]));
  const brandById = new Map((brands || []).map((brand) => [brand.id, brand]));
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / MOTORCYCLES
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة الدراجات', 'MOTORCYCLE MANAGEMENT')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ البيانات', 'Could not save changes')}
        </p>
      )}
      {query.saved && (
        <p className="notice">{pick(locale, 'تم الحفظ', 'Saved')}</p>
      )}
      <div className="two-column">
        <div className="panel">
          <h2>{pick(locale, 'الدراجات', 'MOTORCYCLES')}</h2>
          <div className="compare-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{pick(locale, 'الدراجة', 'MOTORCYCLE')}</th>
                  <th>{pick(locale, 'الحالة', 'STATUS')}</th>
                  <th>{pick(locale, 'النوع', 'CONDITION')}</th>
                  <th>{pick(locale, 'السعر', 'PRICE')}</th>
                </tr>
              </thead>
              <tbody>
                {(bikes || []).map((bike) => (
                  <tr key={bike.id}>
                    <td>
                      <Link
                        href={`/${locale}/admin/motorcycles?edit=${bike.id}`}
                      >
                        {pick(locale, bike.name_ar, bike.name_en)}
                      </Link>
                    </td>
                    <td>{bike.availability}</td>
                    <td>{bike.condition}</td>
                    <td>{money(bike.price_egp, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form action={saveMotorcycle} className="panel form-stack">
          <h2>
            {selected
              ? pick(locale, 'تعديل الدراجة', 'EDIT MOTORCYCLE')
              : pick(locale, 'دراجة جديدة', 'NEW MOTORCYCLE')}
          </h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={selected?.id || ''} />
          <label className="field-label">
            Slug
            <input
              className="input"
              name="slug"
              required
              defaultValue={selected?.slug || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'النسخة', 'VARIANT')}
            <select
              className="input"
              name="variant_id"
              required
              defaultValue={selected?.variant_id || ''}
            >
              <option value="">—</option>
              {(variants || []).map((variant) => {
                const model = modelById.get(variant.model_id);
                const brand = model ? brandById.get(model.brand_id) : null;
                return (
                  <option key={variant.id} value={variant.id}>
                    {brand?.name} {model?.name} · {variant.name}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'الفرع', 'BRANCH')}
            <select
              className="input"
              name="branch_id"
              required
              defaultValue={selected?.branch_id || ''}
            >
              <option value="">—</option>
              {(branches || []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {pick(locale, branch.name_ar, branch.name_en)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'الاسم بالعربية', 'ARABIC NAME')}
            <input
              className="input"
              name="name_ar"
              required
              defaultValue={selected?.name_ar || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الاسم بالإنجليزية', 'ENGLISH NAME')}
            <input
              className="input"
              name="name_en"
              required
              defaultValue={selected?.name_en || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الوصف بالعربية', 'ARABIC DESCRIPTION')}
            <textarea
              className="input"
              name="description_ar"
              defaultValue={selected?.description_ar || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الوصف بالإنجليزية', 'ENGLISH DESCRIPTION')}
            <textarea
              className="input"
              name="description_en"
              defaultValue={selected?.description_en || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'النوع', 'CONDITION')}
            <select
              className="input"
              name="condition"
              defaultValue={selected?.condition || 'new'}
            >
              <option value="new">new</option>
              <option value="used">used</option>
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'السنة', 'YEAR')}
            <input
              className="input"
              name="year"
              type="number"
              min="1950"
              max="2100"
              required
              defaultValue={selected?.year || new Date().getFullYear()}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'السعر بالجنيه', 'PRICE EGP')}
            <input
              className="input"
              name="price_egp"
              type="number"
              min="1"
              step="0.01"
              required
              defaultValue={selected?.price_egp || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'العربون بالجنيه', 'DEPOSIT EGP')}
            <input
              className="input"
              name="deposit_egp"
              type="number"
              min="1"
              step="0.01"
              required
              defaultValue={selected?.deposit_egp || ''}
            />
          </label>
          <label className="field-label">
            CC
            <input
              className="input"
              name="engine_cc"
              type="number"
              min="1"
              defaultValue={selected?.engine_cc || ''}
            />
          </label>
          <label className="field-label">
            HP
            <input
              className="input"
              name="horsepower"
              type="number"
              min="0"
              step="0.01"
              defaultValue={selected?.horsepower || ''}
            />
          </label>
          <label className="field-label">
            KM
            <input
              className="input"
              name="mileage_km"
              type="number"
              min="0"
              defaultValue={selected?.mileage_km ?? ''}
            />
          </label>
          <button className="button button-accent" type="submit">
            {pick(locale, 'حفظ الدراجة', 'SAVE MOTORCYCLE')}
          </button>
        </form>
      </div>
      {selected?.condition === 'used' && (
        <form
          action={saveUsedDetails}
          className="panel form-stack"
          style={{ marginTop: 28 }}
        >
          <h2>
            {pick(
              locale,
              'تقرير الدراجة المستعملة الداخلي',
              'USED MOTORCYCLE INTERNAL DETAILS',
            )}
          </h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="motorcycle_id" value={selected.id} />
          <label className="field-label">
            {pick(locale, 'عدد الملاك', 'OWNERS')}
            <input
              className="input"
              name="owners_count"
              type="number"
              min="0"
              defaultValue={used?.owners_count ?? ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'سجل الصيانة', 'SERVICE HISTORY')}
            <textarea
              className="input"
              name="service_history"
              defaultValue={used?.service_history || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الحوادث', 'ACCIDENT STATUS')}
            <input
              className="input"
              name="accident_status"
              defaultValue={used?.accident_status || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الحالة الميكانيكية', 'MECHANICAL CONDITION')}
            <textarea
              className="input"
              name="mechanical_condition"
              defaultValue={used?.mechanical_condition || ''}
            />
          </label>
          <label className="field-label">
            {pick(
              locale,
              'ملاحظات الفحص الداخلية',
              'INTERNAL INSPECTION NOTES',
            )}
            <textarea
              className="input"
              name="inspection_notes"
              defaultValue={used?.inspection_notes || ''}
            />
          </label>
          <button className="button button-accent" type="submit">
            {pick(locale, 'حفظ التقرير', 'SAVE DETAILS')}
          </button>
        </form>
      )}
      {selected && (
        <div className="panel" style={{ marginTop: 28 }}>
          <h2>{pick(locale, 'معرض الصور', 'GALLERY')}</h2>
          {!images?.length && (
            <p>{pick(locale, 'لا توجد صور بعد', 'No images yet')}</p>
          )}
          {(images || []).map((image) => (
            <div className="spec-row" key={image.id}>
              <Image
                src={image.url}
                alt={pick(
                  locale,
                  image.alt_ar || 'صورة الدراجة',
                  image.alt_en || 'Motorcycle image',
                )}
                width={96}
                height={72}
                style={{ objectFit: 'cover' }}
              />
              <a href={image.url} target="_blank" rel="noopener noreferrer">
                {pick(
                  locale,
                  image.alt_ar || 'صورة الدراجة',
                  image.alt_en || 'Motorcycle image',
                )}
              </a>
              <span>#{image.sort_order}</span>
              {selected.image_url === image.url ? (
                <strong>{pick(locale, 'الصورة الأساسية', 'Primary')}</strong>
              ) : (
                <form action={setPrimaryCatalogImage}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="kind" value="motorcycles" />
                  <input type="hidden" name="item_id" value={selected.id} />
                  <input type="hidden" name="image_id" value={image.id} />
                  <button className="button button-ghost" type="submit">
                    {pick(locale, 'اجعلها أساسية', 'Make primary')}
                  </button>
                </form>
              )}
              <form action={removeCatalogImage}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="kind" value="motorcycles" />
                <input type="hidden" name="item_id" value={selected.id} />
                <input type="hidden" name="image_id" value={image.id} />
                <ConfirmSubmit
                  label={pick(locale, 'حذف', 'Remove')}
                  confirmation={pick(
                    locale,
                    'هل تريد حذف الصورة؟',
                    'Remove this image?',
                  )}
                />
              </form>
            </div>
          ))}
          <form
            action={uploadCatalogImage}
            className="form-stack"
            style={{ marginTop: 16 }}
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="motorcycles" />
            <input type="hidden" name="item_id" value={selected.id} />
            <label className="field-label">
              {pick(
                locale,
                'صورة JPEG أو PNG أو WebP حتى 8 ميجابايت',
                'JPEG, PNG or WebP image up to 8 MB',
              )}
              <input
                className="input"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <label className="field-label">
              {pick(locale, 'وصف الصورة بالعربية', 'ARABIC ALT TEXT')}
              <input className="input" name="alt_ar" required />
            </label>
            <label className="field-label">
              {pick(locale, 'وصف الصورة بالإنجليزية', 'ENGLISH ALT TEXT')}
              <input className="input" name="alt_en" required />
            </label>
            <label className="field-label">
              {pick(locale, 'الترتيب', 'ORDER')}
              <input
                className="input"
                name="sort_order"
                type="number"
                min="0"
                defaultValue={(images || []).length}
              />
            </label>
            <button className="button button-ghost" type="submit">
              {pick(locale, 'إضافة صورة', 'ADD IMAGE')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
