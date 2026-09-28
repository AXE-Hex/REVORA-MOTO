import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  archiveProduct,
  saveProduct,
  saveVariant,
} from '@/app/admin-catalog-actions';
import { ConfirmSubmit } from '@/components/confirm-submit';
import {
  DirtyActionBar,
  EditorSectionNav,
} from '@/components/admin-editor-controls';
import { formatDate } from '@/lib/format';
import {
  removeCatalogImage,
  setPrimaryCatalogImage,
  uploadCatalogImage,
  uploadVariantImage,
} from '@/app/admin-media-actions';

function productPageHref(
  locale: 'ar' | 'en',
  query: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const key of [
    'q',
    'category',
    'brand',
    'status',
    'stock',
    'sort',
  ] as const) {
    if (query[key]) params.set(key, query[key]!);
  }
  params.set('page', String(page));
  return `/${locale}/admin/products?${params.toString()}`;
}

export default async function AdminProducts({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    edit?: string;
    error?: string;
    saved?: string;
    q?: string;
    category?: string;
    brand?: string;
    status?: string;
    stock?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'catalog.write',
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
  let listQuery = db!
    .from('products')
    .select(
      'id,slug,sku,name_ar,name_en,description_ar,description_en,category_id,brand_id,price_egp,sale_price_egp,stock,status,featured,image_url,created_at',
      { count: 'exact' },
    );
  if (search)
    listQuery = listQuery.or(
      `name_ar.ilike.%${search}%,name_en.ilike.%${search}%,sku.ilike.%${search}%`,
    );
  if (query.category) listQuery = listQuery.eq('category_id', query.category);
  if (query.brand) listQuery = listQuery.eq('brand_id', query.brand);
  if (['draft', 'active', 'archived'].includes(query.status || ''))
    listQuery = listQuery.eq('status', query.status);
  if (query.stock === 'out') listQuery = listQuery.eq('stock', 0);
  if (query.stock === 'available') listQuery = listQuery.gt('stock', 0);
  if (query.sort === 'price_asc')
    listQuery = listQuery.order('price_egp', { ascending: true });
  else if (query.sort === 'name')
    listQuery = listQuery.order('name_en', { ascending: true });
  else listQuery = listQuery.order('created_at', { ascending: false });
  listQuery = listQuery.range((pageNum - 1) * pageSize, pageNum * pageSize - 1);
  const [
    { data: rows, error: rowsError, count: resultCount },
    { data: categories, error: categoriesError },
    { data: brands, error: brandsError },
  ] = await Promise.all([
    listQuery,
    db!.from('categories').select('id,name_ar,name_en').order('name_en'),
    db!.from('brands').select('id,name').order('name'),
  ]);
  const selectedInPage = (rows || []).find((row) => row.id === query.edit);
  const { data: selectedResult } =
    query.edit && !selectedInPage
      ? await db!
          .from('products')
          .select(
            'id,slug,sku,name_ar,name_en,description_ar,description_en,category_id,brand_id,price_egp,sale_price_egp,stock,status,featured,image_url,created_at',
          )
          .eq('id', query.edit)
          .maybeSingle()
      : { data: selectedInPage };
  const selected = selectedResult;
  const categoryById = new Map(
    (categories || []).map((item) => [item.id, item]),
  );
  const { data: variants } = selected
    ? await db!
        .from('product_variants')
        .select('id,sku,attributes,price_egp,stock,image_url')
        .eq('product_id', selected.id)
        .order('sku')
    : { data: [] };
  const { data: images } = selected
    ? await db!
        .from('product_images')
        .select('id,url,alt_ar,alt_en,sort_order')
        .eq('product_id', selected.id)
        .order('sort_order')
    : { data: [] };
  const { data: canReadAudit } = selected
    ? await db!.rpc('has_permission', { p_permission: 'audit.read' })
    : { data: false };
  const { data: history } =
    selected && canReadAudit
      ? await db!
          .from('audit_logs')
          .select('id,action,created_at')
          .eq('entity', 'products')
          .eq('entity_id', selected.id)
          .order('created_at', { ascending: false })
          .limit(10)
      : { data: [] };
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / PRODUCTS
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة المنتجات', 'PRODUCT MANAGEMENT')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ البيانات', 'Could not save changes')}
        </p>
      )}
      {query.saved && (
        <p className="notice">
          {pick(locale, 'تم حفظ البيانات', 'Changes saved')}
        </p>
      )}
      {[rowsError, categoriesError, brandsError].some(Boolean) && (
        <p className="notice error" role="alert">
          {pick(
            locale,
            'تعذر تحميل بعض بيانات الكتالوج. حاول تحديث الصفحة.',
            'Some catalog data could not load. Refresh and try again.',
          )}
        </p>
      )}
      <EditorSectionNav
        locale={locale}
        items={[
          {
            id: 'product-overview',
            label: pick(locale, 'الأساسيات', 'Overview'),
          },
          { id: 'product-pricing', label: pick(locale, 'التسعير', 'Pricing') },
          {
            id: 'product-inventory',
            label: pick(locale, 'المخزون', 'Inventory'),
          },
          ...(selected
            ? [
                {
                  id: 'product-variants',
                  label: pick(locale, 'الخيارات', 'Variants'),
                },
                {
                  id: 'product-media',
                  label: pick(locale, 'الوسائط', 'Media'),
                },
                {
                  id: 'product-fitment',
                  label: pick(locale, 'التوافق', 'Fitment'),
                },
                { id: 'product-seo', label: 'SEO' },
                {
                  id: 'product-history',
                  label: pick(locale, 'السجل', 'History'),
                },
              ]
            : []),
        ]}
      />
      <div className="two-column">
        <div className="panel">
          <div className="admin-table-heading">
            <h2>{pick(locale, 'المنتجات', 'PRODUCTS')}</h2>
            <span>
              {pick(
                locale,
                `${resultCount || 0} نتيجة`,
                `${resultCount || 0} results`,
              )}
            </span>
          </div>
          <form
            className="admin-table-toolbar"
            action={`/${locale}/admin/products`}
          >
            <label>
              <span>{pick(locale, 'بحث', 'Search')}</span>
              <input
                className="input"
                name="q"
                defaultValue={query.q || ''}
                maxLength={80}
                placeholder={pick(locale, 'الاسم أو SKU', 'Name or SKU')}
              />
            </label>
            <label>
              <span>{pick(locale, 'الفئة', 'Category')}</span>
              <select
                className="input"
                name="category"
                defaultValue={query.category || ''}
              >
                <option value="">
                  {pick(locale, 'كل الفئات', 'All categories')}
                </option>
                {(categories || []).map((item) => (
                  <option value={item.id} key={item.id}>
                    {pick(locale, item.name_ar, item.name_en)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{pick(locale, 'العلامة', 'Brand')}</span>
              <select
                className="input"
                name="brand"
                defaultValue={query.brand || ''}
              >
                <option value="">
                  {pick(locale, 'كل العلامات', 'All brands')}
                </option>
                {(brands || []).map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{pick(locale, 'الحالة', 'Status')}</span>
              <select
                className="input"
                name="status"
                defaultValue={query.status || ''}
              >
                <option value="">
                  {pick(locale, 'كل الحالات', 'All states')}
                </option>
                <option value="active">{pick(locale, 'نشط', 'Active')}</option>
                <option value="draft">{pick(locale, 'مسودة', 'Draft')}</option>
                <option value="archived">
                  {pick(locale, 'مؤرشف', 'Archived')}
                </option>
              </select>
            </label>
            <label>
              <span>{pick(locale, 'المخزون', 'Stock')}</span>
              <select
                className="input"
                name="stock"
                defaultValue={query.stock || ''}
              >
                <option value="">{pick(locale, 'الكل', 'All')}</option>
                <option value="available">
                  {pick(locale, 'متوفر', 'Available')}
                </option>
                <option value="out">
                  {pick(locale, 'نفد', 'Out of stock')}
                </option>
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
                <option value="name">{pick(locale, 'الاسم', 'Name')}</option>
              </select>
            </label>
            <button className="button button-primary" type="submit">
              {pick(locale, 'تطبيق', 'Apply')}
            </button>
            <Link
              className="button button-ghost"
              href={`/${locale}/admin/products`}
            >
              {pick(locale, 'مسح', 'Clear')}
            </Link>
          </form>
          <div className="compare-scroll admin-product-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{pick(locale, 'الصورة', 'Image')}</th>
                  <th>{pick(locale, 'الاسم', 'NAME')}</th>
                  <th>SKU</th>
                  <th>{pick(locale, 'الفئة', 'Category')}</th>
                  <th>{pick(locale, 'السعر', 'Price')}</th>
                  <th>{pick(locale, 'المخزون', 'Stock')}</th>
                  <th>{pick(locale, 'الحالة', 'STATUS')}</th>
                  <th>{pick(locale, 'تاريخ الإضافة', 'Created')}</th>
                  <th>{pick(locale, 'الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(rows || []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.image_url ? (
                        <Image
                          src={row.image_url}
                          alt=""
                          width={48}
                          height={48}
                          className="admin-table-image"
                        />
                      ) : (
                        <span className="admin-table-image-fallback">R/</span>
                      )}
                    </td>
                    <td>{pick(locale, row.name_ar, row.name_en)}</td>
                    <td>
                      <code dir="ltr">{row.sku}</code>
                    </td>
                    <td>
                      {pick(
                        locale,
                        categoryById.get(row.category_id)?.name_ar || '—',
                        categoryById.get(row.category_id)?.name_en || '—',
                      )}
                    </td>
                    <td>
                      {money(row.sale_price_egp ?? row.price_egp, locale)}
                    </td>
                    <td>{row.stock}</td>
                    <td>
                      <StatusBadge status={row.status} locale={locale} />
                    </td>
                    <td>{formatDate(row.created_at, locale)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Link href={`/${locale}/admin/products?edit=${row.id}`}>
                          {pick(locale, 'تعديل', 'Edit')}
                        </Link>
                        <Link
                          href={`/${locale}/shop/${row.slug}`}
                          target="_blank"
                        >
                          {pick(locale, 'معاينة', 'Preview')}
                        </Link>
                        {row.status !== 'archived' && (
                          <form action={archiveProduct}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={row.id} />
                            <ConfirmSubmit
                              label={pick(locale, 'أرشفة', 'Archive')}
                              confirmation={pick(
                                locale,
                                'أرشفة هذا المنتج؟',
                                'Archive this product?',
                              )}
                            />
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rowsError && !rows?.length && (
            <div className="admin-empty-table">
              <h3>{pick(locale, 'لا توجد منتجات بعد', 'No products yet')}</h3>
              <p>
                {pick(
                  locale,
                  'أضف أول منتج حقيقي من النموذج المجاور.',
                  'Add your first real product with the form.',
                )}
              </p>
            </div>
          )}
          <div className="admin-product-mobile-list">
            {(rows || []).map((row) => (
              <article className="admin-product-mobile-card" key={row.id}>
                <div className="admin-product-mobile-heading">
                  <span>{row.sku}</span>
                  <StatusBadge status={row.status} locale={locale} />
                </div>
                <h3>{pick(locale, row.name_ar, row.name_en)}</h3>
                {row.image_url ? (
                  <Image
                    src={row.image_url}
                    alt=""
                    width={72}
                    height={72}
                    className="admin-table-image"
                  />
                ) : null}
                <p>
                  {pick(
                    locale,
                    categoryById.get(row.category_id)?.name_ar || '—',
                    categoryById.get(row.category_id)?.name_en || '—',
                  )}
                </p>
                <dl>
                  <div>
                    <dt>{pick(locale, 'السعر', 'Price')}</dt>
                    <dd>{money(row.price_egp, locale)}</dd>
                  </div>
                  <div>
                    <dt>{pick(locale, 'المخزون', 'Stock')}</dt>
                    <dd>{row.stock}</dd>
                  </div>
                </dl>
                <Link
                  className="button button-secondary"
                  href={`/${locale}/admin/products?edit=${row.id}`}
                >
                  {pick(locale, 'تعديل المنتج', 'Edit product')}
                </Link>
                <Link
                  className="button button-ghost"
                  href={`/${locale}/shop/${row.slug}`}
                  target="_blank"
                >
                  {pick(locale, 'معاينة', 'Preview')}
                </Link>
                {row.status !== 'archived' && (
                  <form action={archiveProduct}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={row.id} />
                    <ConfirmSubmit
                      label={pick(locale, 'أرشفة', 'Archive')}
                      confirmation={pick(
                        locale,
                        'أرشفة هذا المنتج؟',
                        'Archive this product?',
                      )}
                    />
                  </form>
                )}
              </article>
            ))}
          </div>
          <nav
            className="admin-pagination"
            aria-label={pick(locale, 'صفحات المنتجات', 'Product pages')}
          >
            <span>
              {pick(
                locale,
                `صفحة ${pageNum} من ${Math.max(1, Math.ceil((resultCount || 0) / pageSize))}`,
                `Page ${pageNum} of ${Math.max(1, Math.ceil((resultCount || 0) / pageSize))}`,
              )}
            </span>
            {pageNum > 1 && (
              <Link
                className="button button-secondary"
                href={productPageHref(locale, query, pageNum - 1)}
              >
                {pick(locale, 'السابق', 'Previous')}
              </Link>
            )}
            {pageNum * pageSize < (resultCount || 0) && (
              <Link
                className="button button-secondary"
                href={productPageHref(locale, query, pageNum + 1)}
              >
                {pick(locale, 'التالي', 'Next')}
              </Link>
            )}
          </nav>
        </div>
        <form
          action={saveProduct}
          className="panel form-stack admin-product-editor"
        >
          <h2>
            {selected
              ? pick(locale, 'تعديل المنتج', 'EDIT PRODUCT')
              : pick(locale, 'منتج جديد', 'NEW PRODUCT')}
          </h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={selected?.id || ''} />
          <fieldset className="admin-editor-section" id="product-overview">
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
              SKU
              <input
                className="input"
                name="sku"
                required
                defaultValue={selected?.sku || ''}
              />
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
            <label className="field-label">
              {pick(locale, 'الفئة', 'Category')}
              <select
                className="input"
                name="category_id"
                defaultValue={selected?.category_id || ''}
              >
                <option value="">—</option>
                {(categories || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {pick(locale, category.name_ar, category.name_en)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              {pick(locale, 'العلامة', 'Brand')}
              <select
                className="input"
                name="brand_id"
                defaultValue={selected?.brand_id || ''}
              >
                <option value="">—</option>
                {(brands || []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <fieldset className="admin-editor-section" id="product-pricing">
            <legend>{pick(locale, 'التسعير', 'Pricing')}</legend>
            <label className="field-label">
              {pick(locale, 'السعر بالجنيه', 'Price (EGP)')}
              <input
                className="input"
                name="price_egp"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={selected?.price_egp ?? ''}
              />
            </label>
            <label className="field-label">
              {pick(locale, 'سعر العرض', 'Sale price')}
              <input
                className="input"
                name="sale_price_egp"
                type="number"
                min="0"
                step="0.01"
                defaultValue={selected?.sale_price_egp ?? ''}
              />
            </label>
          </fieldset>
          <fieldset className="admin-editor-section" id="product-publishing">
            <legend>{pick(locale, 'النشر', 'Publishing')}</legend>
            <label className="field-label">
              {pick(locale, 'الحالة', 'Status')}
              <select
                className="input"
                name="status"
                defaultValue={selected?.status || 'draft'}
              >
                <option value="draft">{pick(locale, 'مسودة', 'Draft')}</option>
                <option value="active">{pick(locale, 'نشط', 'Active')}</option>
                <option value="archived">
                  {pick(locale, 'مؤرشف', 'Archived')}
                </option>
              </select>
            </label>
            <label className="field-label">
              {pick(locale, 'منتج مميز', 'Featured')}
              <select
                className="input"
                name="featured"
                defaultValue={selected?.featured ? 'true' : 'false'}
              >
                <option value="false">{pick(locale, 'لا', 'No')}</option>
                <option value="true">{pick(locale, 'نعم', 'Yes')}</option>
              </select>
            </label>
          </fieldset>
          <fieldset className="admin-editor-section" id="product-inventory">
            <legend>{pick(locale, 'المخزون', 'Inventory')}</legend>
            <p>
              {pick(
                locale,
                'تُدار الكميات من صفحة المخزون حتى يُسجل كل تعديل وحركة تحويل.',
                'Stock quantities are changed in Inventory so each adjustment and transfer is recorded.',
              )}
            </p>
            <Link
              className="button button-secondary"
              href={`/${locale}/admin/inventory`}
            >
              {pick(locale, 'فتح إدارة المخزون', 'Open inventory')}
            </Link>
          </fieldset>
          <DirtyActionBar
            locale={locale}
            saveLabel={pick(locale, 'حفظ المنتج', 'Save product')}
          />
        </form>
      </div>
      {selected && (
        <section
          className="panel"
          style={{ marginTop: 28 }}
          id="product-variants"
        >
          <h2>{pick(locale, 'المقاسات والألوان', 'VARIANTS')}</h2>
          {(variants || []).map((variant) => (
            <form
              action={saveVariant}
              className="toolbar"
              key={variant.id}
              style={{ marginBottom: 12 }}
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={variant.id} />
              <input type="hidden" name="product_id" value={selected.id} />
              <input
                className="input"
                name="sku"
                aria-label="SKU"
                required
                defaultValue={variant.sku}
              />
              <input
                className="input"
                name="size"
                aria-label="Size"
                placeholder="Size"
                defaultValue={String(variant.attributes?.size || '')}
              />
              <input
                className="input"
                name="color"
                aria-label="Color"
                placeholder="Color"
                defaultValue={String(variant.attributes?.color || '')}
              />
              <input
                className="input"
                name="price_egp"
                aria-label="Price EGP"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={variant.price_egp}
              />
              <span>{variant.stock}</span>
              <button className="button button-ghost" type="submit">
                {pick(locale, 'حفظ', 'SAVE')}
              </button>
            </form>
          ))}
          <form action={saveVariant} className="toolbar">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value="" />
            <input type="hidden" name="product_id" value={selected.id} />
            <input
              className="input"
              name="sku"
              aria-label="New SKU"
              placeholder="SKU"
              required
            />
            <input
              className="input"
              name="size"
              aria-label="New size"
              placeholder="Size"
            />
            <input
              className="input"
              name="color"
              aria-label="New color"
              placeholder="Color"
            />
            <input
              className="input"
              name="price_egp"
              aria-label="New price EGP"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Price EGP"
            />
            <button className="button button-accent" type="submit">
              {pick(locale, 'إضافة خيار', 'ADD VARIANT')}
            </button>
          </form>
          {!!variants?.length && (
            <h3>{pick(locale, 'صور الخيارات', 'VARIANT IMAGES')}</h3>
          )}
          {(variants || []).map((variant) => (
            <form
              action={uploadVariantImage}
              className="toolbar"
              key={'image-' + variant.id}
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="product_id" value={selected.id} />
              <input type="hidden" name="variant_id" value={variant.id} />
              <span>{variant.sku}</span>
              {variant.image_url && (
                <Image
                  src={variant.image_url}
                  alt={variant.sku}
                  width={72}
                  height={54}
                  style={{ objectFit: 'cover' }}
                />
              )}
              <input
                className="input"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={pick(locale, 'صورة الخيار', 'Variant image')}
                required
              />
              <button className="button button-ghost" type="submit">
                {pick(locale, 'رفع صورة', 'Upload image')}
              </button>
            </form>
          ))}
        </section>
      )}
      {selected && (
        <section
          className="panel form-stack"
          style={{ marginTop: 28 }}
          id="product-media"
        >
          <h2>{pick(locale, 'صور المنتج', 'PRODUCT IMAGES')}</h2>
          {!images?.length && (
            <p>{pick(locale, 'لا توجد صور بعد', 'No images yet')}</p>
          )}
          {(images || []).map((image) => (
            <div className="spec-row" key={image.id}>
              <Image
                src={image.url}
                alt={pick(
                  locale,
                  image.alt_ar || 'صورة المنتج',
                  image.alt_en || 'Product image',
                )}
                width={96}
                height={72}
                style={{ objectFit: 'cover' }}
              />
              <a href={image.url} target="_blank" rel="noopener noreferrer">
                {pick(
                  locale,
                  image.alt_ar || 'صورة المنتج',
                  image.alt_en || 'Product image',
                )}
              </a>
              <span>#{image.sort_order}</span>
              {selected.image_url === image.url ? (
                <strong>{pick(locale, 'الصورة الأساسية', 'Primary')}</strong>
              ) : (
                <form action={setPrimaryCatalogImage}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="kind" value="products" />
                  <input type="hidden" name="item_id" value={selected.id} />
                  <input type="hidden" name="image_id" value={image.id} />
                  <button className="button button-ghost" type="submit">
                    {pick(locale, 'اجعلها أساسية', 'Make primary')}
                  </button>
                </form>
              )}
              <form action={removeCatalogImage}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="kind" value="products" />
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
          <form action={uploadCatalogImage} className="form-stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="products" />
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
              {pick(locale, 'وصف الصورة بالعربية', 'Arabic alt text')}
              <input
                className="input"
                name="alt_ar"
                required
                minLength={2}
                maxLength={200}
              />
            </label>
            <label className="field-label">
              {pick(locale, 'وصف الصورة بالإنجليزية', 'English alt text')}
              <input
                className="input"
                name="alt_en"
                required
                minLength={2}
                maxLength={200}
              />
            </label>
            <label className="field-label">
              {pick(locale, 'الترتيب', 'Order')}
              <input
                className="input"
                name="sort_order"
                type="number"
                min="0"
                max="1000"
                defaultValue={(images || []).length}
                required
              />
            </label>
            <button className="button button-accent" type="submit">
              {pick(locale, 'رفع الصورة', 'Upload image')}
            </button>
          </form>
        </section>
      )}
      {selected && (
        <>
          <section className="panel admin-editor-extra" id="product-fitment">
            <h2>
              {pick(locale, 'التوافق مع الدراجات', 'Motorcycle compatibility')}
            </h2>
            <p>
              {pick(
                locale,
                'تُدار قواعد التوافق من شاشة الملاءمة مع اختيار المنتج والدراجة والسنة.',
                'Manage compatibility rules in Fitment by selecting this product, the motorcycle, and year range.',
              )}
            </p>
            <Link
              className="button button-secondary"
              href={`/${locale}/admin/fitment`}
            >
              {pick(locale, 'فتح قواعد الملاءمة', 'Open fitment rules')}
            </Link>
          </section>
          <section className="panel admin-editor-extra" id="product-seo">
            <h2>SEO</h2>
            <p>
              {pick(
                locale,
                'يستخدم عنوان المنتج ووصفه ورابطه في بيانات صفحة المنتج. لا يحتوي مخطط المنتج الحالي على حقول SEO منفصلة.',
                'The product name, description, and slug provide the product page metadata. The current product schema has no separate SEO fields.',
              )}
            </p>
          </section>
          <section className="panel admin-editor-extra" id="product-history">
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
                  'لا توجد تغييرات مسجلة لهذا المنتج.',
                  'No recorded changes for this product.',
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
