import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { ConfirmSubmit } from '@/components/confirm-submit';
import {
  DirtyActionBar,
  EditorSectionNav,
} from '@/components/admin-editor-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/format';
import { saveMotorcycle, saveUsedDetails } from '@/app/admin-vehicle-actions';
import {
  removeCatalogImage,
  setPrimaryCatalogImage,
  uploadCatalogImage,
} from '@/app/admin-media-actions';

function motorcyclePageHref(
  locale: 'ar' | 'en',
  query: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const key of ['q', 'condition', 'availability', 'sort'] as const)
    if (query[key]) params.set(key, query[key]!);
  params.set('page', String(page));
  return `/${locale}/admin/motorcycles?${params.toString()}`;
}

export default async function AdminMotorcycles({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    edit?: string;
    error?: string;
    saved?: string;
    q?: string;
    condition?: string;
    availability?: string;
    sort?: string;
    page?: string;
  }>;
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
  const pageNum =
    Number.isSafeInteger(Number(query.page)) && Number(query.page) > 0
      ? Math.min(Number(query.page), 10000)
      : 1;
  const pageSize = 20;
  const search = (query.q || '')
    .trim()
    .slice(0, 80)
    .replace(/[%,()]/g, '');
  let bikeQuery = db!
    .from('motorcycles')
    .select(
      'id,variant_id,branch_id,slug,name_ar,name_en,description_ar,description_en,condition,year,price_egp,deposit_egp,engine_cc,horsepower,mileage_km,availability,image_url,created_at',
      { count: 'exact' },
    );
  if (search)
    bikeQuery = bikeQuery.or(
      `name_ar.ilike.%${search}%,name_en.ilike.%${search}%,slug.ilike.%${search}%`,
    );
  if (query.condition === 'new' || query.condition === 'used')
    bikeQuery = bikeQuery.eq('condition', query.condition);
  if (
    ['available', 'reserved', 'sold', 'hidden'].includes(
      query.availability || '',
    )
  )
    bikeQuery = bikeQuery.eq('availability', query.availability);
  if (query.sort === 'price_asc')
    bikeQuery = bikeQuery.order('price_egp', { ascending: true });
  else bikeQuery = bikeQuery.order('created_at', { ascending: false });
  bikeQuery = bikeQuery.range((pageNum - 1) * pageSize, pageNum * pageSize - 1);
  const [
    { data: bikes, count: bikeCount, error: bikesError },
    { data: variants },
    { data: models },
    { data: brands },
    { data: branches },
  ] = await Promise.all([
    bikeQuery,
    db!.from('motorcycle_variants').select('id,model_id,name').order('name'),
    db!.from('motorcycle_models').select('id,brand_id,name'),
    db!.from('motorcycle_brands').select('id,name'),
    db!
      .from('branches')
      .select('id,name_ar,name_en,address_ar,address_en,active')
      .order('name_en'),
  ]);
  const selectedInPage = (bikes || []).find((bike) => bike.id === query.edit);
  const { data: selected } =
    query.edit && !selectedInPage
      ? await db!
          .from('motorcycles')
          .select(
            'id,variant_id,branch_id,slug,name_ar,name_en,description_ar,description_en,condition,year,price_egp,deposit_egp,engine_cc,horsepower,mileage_km,availability,image_url,created_at',
          )
          .eq('id', query.edit)
          .maybeSingle()
      : { data: selectedInPage };
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
  const { data: canReadAudit } = selected
    ? await db!.rpc('has_permission', { p_permission: 'audit.read' })
    : { data: false };
  const { data: history } =
    selected && canReadAudit
      ? await db!
          .from('audit_logs')
          .select('id,action,created_at')
          .eq('entity', 'motorcycles')
          .eq('entity_id', selected.id)
          .order('created_at', { ascending: false })
          .limit(10)
      : { data: [] };
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
      {bikesError && (
        <p className="notice error" role="alert">
          {pick(locale, 'تعذر تحميل الدراجات.', 'Could not load motorcycles.')}
        </p>
      )}
      {selected && (
        <EditorSectionNav
          locale={locale}
          items={[
            {
              id: 'motorcycle-overview',
              label: pick(locale, 'الأساسيات', 'Overview'),
            },
            {
              id: 'motorcycle-specifications',
              label: pick(locale, 'المواصفات', 'Specifications'),
            },
            {
              id: 'motorcycle-pricing',
              label: pick(locale, 'التسعير', 'Pricing'),
            },
            {
              id: 'motorcycle-condition',
              label: pick(locale, 'الحالة', 'Condition'),
            },
            { id: 'motorcycle-media', label: pick(locale, 'الوسائط', 'Media') },
            { id: 'motorcycle-branch', label: pick(locale, 'الفرع', 'Branch') },
            {
              id: 'motorcycle-reservation',
              label: pick(locale, 'الحجز', 'Reservation'),
            },
            {
              id: 'motorcycle-history',
              label: pick(locale, 'السجل', 'History'),
            },
          ]}
        />
      )}
      <div className="two-column">
        <div className="panel">
          <div className="admin-table-heading">
            <h2>{pick(locale, 'الدراجات', 'MOTORCYCLES')}</h2>
            <span>
              {pick(
                locale,
                `${bikeCount || 0} نتيجة`,
                `${bikeCount || 0} results`,
              )}
            </span>
          </div>
          <form
            className="admin-table-toolbar"
            action={`/${locale}/admin/motorcycles`}
          >
            <label>
              <span>{pick(locale, 'بحث', 'Search')}</span>
              <input
                className="input"
                name="q"
                maxLength={80}
                defaultValue={query.q || ''}
                placeholder={pick(locale, 'الاسم أو الرابط', 'Name or slug')}
              />
            </label>
            <label>
              <span>{pick(locale, 'الحالة', 'Condition')}</span>
              <select
                className="input"
                name="condition"
                defaultValue={query.condition || ''}
              >
                <option value="">{pick(locale, 'الكل', 'All')}</option>
                <option value="new">{pick(locale, 'جديدة', 'New')}</option>
                <option value="used">
                  {pick(locale, 'مستعملة', 'Pre-owned')}
                </option>
              </select>
            </label>
            <label>
              <span>{pick(locale, 'التوفر', 'Availability')}</span>
              <select
                className="input"
                name="availability"
                defaultValue={query.availability || ''}
              >
                <option value="">{pick(locale, 'الكل', 'All')}</option>
                <option value="available">
                  {pick(locale, 'متاحة', 'Available')}
                </option>
                <option value="reserved">
                  {pick(locale, 'محجوزة', 'Reserved')}
                </option>
                <option value="sold">{pick(locale, 'مباعة', 'Sold')}</option>
              </select>
            </label>
            <label>
              <span>{pick(locale, 'ترتيب', 'Sort')}</span>
              <select
                className="input"
                name="sort"
                defaultValue={query.sort || 'newest'}
              >
                <option value="newest">
                  {pick(locale, 'الأحدث', 'Newest')}
                </option>
                <option value="price_asc">
                  {pick(locale, 'السعر الأقل', 'Price: low to high')}
                </option>
              </select>
            </label>
            <button className="button button-primary" type="submit">
              {pick(locale, 'تطبيق', 'Apply')}
            </button>
            <Link
              className="button button-ghost"
              href={`/${locale}/admin/motorcycles`}
            >
              {pick(locale, 'مسح', 'Clear')}
            </Link>
          </form>
          <div className="compare-scroll admin-motorcycle-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{pick(locale, 'الدراجة', 'MOTORCYCLE')}</th>
                  <th>{pick(locale, 'التوفر', 'Availability')}</th>
                  <th>{pick(locale, 'الحالة', 'Condition')}</th>
                  <th>{pick(locale, 'السعر', 'PRICE')}</th>
                  <th>{pick(locale, 'تاريخ الإضافة', 'Created')}</th>
                  <th>{pick(locale, 'الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(bikes || []).map((bike) => (
                  <tr key={bike.id}>
                    <td>
                      <div className="admin-table-product">
                        {bike.image_url ? (
                          <Image
                            src={bike.image_url}
                            alt=""
                            width={52}
                            height={52}
                            className="admin-table-image"
                          />
                        ) : null}
                        <span>
                          {pick(locale, bike.name_ar, bike.name_en)}
                          <small>{bike.year}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={bike.availability} locale={locale} />
                    </td>
                    <td>
                      {bike.condition === 'used'
                        ? pick(locale, 'مستعملة', 'Pre-owned')
                        : pick(locale, 'جديدة', 'New')}
                    </td>
                    <td>{money(bike.price_egp, locale)}</td>
                    <td>{formatDate(bike.created_at, locale)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Link
                          href={`/${locale}/admin/motorcycles?edit=${bike.id}`}
                        >
                          {pick(locale, 'تعديل', 'Edit')}
                        </Link>
                        <Link
                          href={`/${locale}/motorcycles/${bike.slug}`}
                          target="_blank"
                        >
                          {pick(locale, 'معاينة', 'Preview')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-motorcycle-mobile-list">
            {(bikes || []).map((bike) => (
              <article className="admin-mobile-record-card" key={bike.id}>
                {bike.image_url ? (
                  <Image
                    src={bike.image_url}
                    alt=""
                    width={84}
                    height={84}
                    className="admin-table-image"
                  />
                ) : null}
                <div>
                  <h3>{pick(locale, bike.name_ar, bike.name_en)}</h3>
                  <p>
                    {bike.year} ·{' '}
                    {bike.condition === 'used'
                      ? pick(locale, 'مستعملة', 'Pre-owned')
                      : pick(locale, 'جديدة', 'New')}
                  </p>
                  <StatusBadge status={bike.availability} locale={locale} />
                  <strong>{money(bike.price_egp, locale)}</strong>
                  <Link
                    className="button button-secondary"
                    href={`/${locale}/admin/motorcycles?edit=${bike.id}`}
                  >
                    {pick(locale, 'تعديل', 'Edit')}
                  </Link>
                  <Link
                    className="button button-ghost"
                    href={`/${locale}/motorcycles/${bike.slug}`}
                    target="_blank"
                  >
                    {pick(locale, 'معاينة', 'Preview')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <nav
            className="admin-pagination"
            aria-label={pick(locale, 'صفحات الدراجات', 'Motorcycle pages')}
          >
            <span>
              {pick(
                locale,
                `صفحة ${pageNum} من ${Math.max(1, Math.ceil((bikeCount || 0) / pageSize))}`,
                `Page ${pageNum} of ${Math.max(1, Math.ceil((bikeCount || 0) / pageSize))}`,
              )}
            </span>
            {pageNum > 1 && (
              <Link
                className="button button-secondary"
                href={motorcyclePageHref(locale, query, pageNum - 1)}
              >
                {pick(locale, 'السابق', 'Previous')}
              </Link>
            )}
            {pageNum * pageSize < (bikeCount || 0) && (
              <Link
                className="button button-secondary"
                href={motorcyclePageHref(locale, query, pageNum + 1)}
              >
                {pick(locale, 'التالي', 'Next')}
              </Link>
            )}
          </nav>
        </div>
        <form
          action={saveMotorcycle}
          className="panel form-stack admin-motorcycle-editor"
        >
          <h2>
            {selected
              ? pick(locale, 'تعديل الدراجة', 'Edit motorcycle')
              : pick(locale, 'دراجة جديدة', 'New motorcycle')}
          </h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={selected?.id || ''} />
          <fieldset className="admin-editor-section" id="motorcycle-overview">
            <legend>{pick(locale, 'الأساسيات', 'Overview')}</legend>
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
              {pick(locale, 'النسخة', 'Variant')}
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
              {pick(locale, 'الفرع', 'Branch')}
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
              {pick(locale, 'الاسم بالعربية', 'Arabic name')}
              <input
                className="input"
                name="name_ar"
                required
                defaultValue={selected?.name_ar || ''}
              />
            </label>
            <label className="field-label">
              {pick(locale, 'الاسم بالإنجليزية', 'English name')}
              <input
                className="input"
                name="name_en"
                required
                defaultValue={selected?.name_en || ''}
              />
            </label>
            <label className="field-label">
              {pick(locale, 'الوصف بالعربية', 'Arabic description')}
              <textarea
                className="input"
                name="description_ar"
                defaultValue={selected?.description_ar || ''}
              />
            </label>
            <label className="field-label">
              {pick(locale, 'الوصف بالإنجليزية', 'English description')}
              <textarea
                className="input"
                name="description_en"
                defaultValue={selected?.description_en || ''}
              />
            </label>
          </fieldset>
          <fieldset
            className="admin-editor-section"
            id="motorcycle-specifications"
          >
            <legend>{pick(locale, 'المواصفات', 'Specifications')}</legend>
            <label className="field-label">
              {pick(locale, 'سنة الصنع', 'Year')}
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
              {pick(locale, 'سعة المحرك (سم³)', 'Engine (cc)')}
              <input
                className="input"
                name="engine_cc"
                type="number"
                min="1"
                defaultValue={selected?.engine_cc || ''}
              />
            </label>
            <label className="field-label">
              {pick(locale, 'القوة الحصانية', 'Power (hp)')}
              <input
                className="input"
                name="horsepower"
                type="number"
                min="0"
                step="0.01"
                defaultValue={selected?.horsepower || ''}
              />
            </label>
          </fieldset>
          <fieldset className="admin-editor-section" id="motorcycle-pricing">
            <legend>{pick(locale, 'التسعير', 'Pricing')}</legend>
            <label className="field-label">
              {pick(locale, 'السعر بالجنيه', 'Price (EGP)')}
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
              {pick(locale, 'العربون بالجنيه', 'Deposit (EGP)')}
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
          </fieldset>
          <fieldset className="admin-editor-section" id="motorcycle-condition">
            <legend>{pick(locale, 'الحالة', 'Condition')}</legend>
            <label className="field-label">
              {pick(locale, 'نوع الدراجة', 'Motorcycle condition')}
              <select
                className="input"
                name="condition"
                defaultValue={selected?.condition || 'new'}
              >
                <option value="new">{pick(locale, 'جديدة', 'New')}</option>
                <option value="used">
                  {pick(locale, 'مستعملة', 'Pre-owned')}
                </option>
              </select>
            </label>
            <label className="field-label">
              {pick(locale, 'المسافة المقطوعة (كم)', 'Mileage (km)')}
              <input
                className="input"
                name="mileage_km"
                type="number"
                min="0"
                defaultValue={selected?.mileage_km ?? ''}
              />
            </label>
            {selected && (
              <p>
                {pick(
                  locale,
                  'حالة الحجز الحالية',
                  'Current reservation availability',
                )}
                : <StatusBadge status={selected.availability} locale={locale} />
              </p>
            )}
          </fieldset>
          <DirtyActionBar
            locale={locale}
            saveLabel={pick(locale, 'حفظ الدراجة', 'Save motorcycle')}
          />
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
          <DirtyActionBar
            locale={locale}
            saveLabel={pick(locale, 'حفظ التقرير', 'Save details')}
          />
        </form>
      )}
      {selected && (
        <div className="panel" style={{ marginTop: 28 }} id="motorcycle-media">
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
      {selected && (
        <>
          <section className="panel admin-editor-extra" id="motorcycle-branch">
            <h2>{pick(locale, 'الفرع', 'Branch')}</h2>
            <p>
              {pick(
                locale,
                'الفرع المحدد للدراجة محفوظ ضمن قسم الأساسيات.',
                'The motorcycle branch is selected and saved in Overview.',
              )}
            </p>
            <a className="button button-secondary" href="#motorcycle-overview">
              {pick(locale, 'تعديل الفرع', 'Edit branch')}
            </a>
          </section>
          <section
            className="panel admin-editor-extra"
            id="motorcycle-reservation"
          >
            <h2>{pick(locale, 'الحجوزات', 'Reservations')}</h2>
            <p>
              {pick(
                locale,
                'تُدار حالة التوفر تلقائياً مع دورة حياة الحجز. افتح شاشة الحجوزات لمتابعة العملاء وتحديث الحالات المسموحة.',
                'Availability follows the reservation lifecycle. Open Reservations to track customers and apply allowed status transitions.',
              )}
            </p>
            <Link
              className="button button-secondary"
              href={`/${locale}/admin/reservations`}
            >
              {pick(locale, 'إدارة الحجوزات', 'Manage reservations')}
            </Link>
          </section>
          <section className="panel admin-editor-extra" id="motorcycle-history">
            <h2>{pick(locale, 'سجل التغييرات', 'Change history')}</h2>
            {!canReadAudit ? (
              <p>
                {pick(
                  locale,
                  'تتطلب قراءة السجل صلاحية التدقيق.',
                  'Audit permission is required to view change history.',
                )}
              </p>
            ) : !history?.length ? (
              <p>
                {pick(
                  locale,
                  'لا توجد تغييرات مسجلة لهذه الدراجة.',
                  'No recorded changes for this motorcycle.',
                )}
              </p>
            ) : (
              history.map((entry) => (
                <div className="spec-row" key={entry.id}>
                  <span>
                    {entry.action === 'INSERT'
                      ? pick(locale, 'إنشاء', 'Created')
                      : entry.action === 'DELETE'
                        ? pick(locale, 'حذف', 'Deleted')
                        : pick(locale, 'تحديث', 'Updated')}
                  </span>
                  <time>{formatDate(entry.created_at, locale)}</time>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
