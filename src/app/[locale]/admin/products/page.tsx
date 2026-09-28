import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { saveProduct, saveVariant } from '@/app/admin-catalog-actions';
import { ConfirmSubmit } from '@/components/confirm-submit';
import {
  removeCatalogImage,
  setPrimaryCatalogImage,
  uploadCatalogImage,
  uploadVariantImage,
} from '@/app/admin-media-actions';

export default async function AdminProducts({
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
    p_permission: 'catalog.write',
  });
  if (!allowed) notFound();
  const query = await searchParams;
  const [{ data: rows }, { data: categories }, { data: brands }] =
    await Promise.all([
      db!
        .from('products')
        .select(
          'id,slug,sku,name_ar,name_en,description_ar,description_en,category_id,brand_id,price_egp,sale_price_egp,stock,status,featured,image_url',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      db!.from('categories').select('id,name_ar,name_en').order('name_en'),
      db!.from('brands').select('id,name').order('name'),
    ]);
  const selected = (rows || []).find((row) => row.id === query.edit);
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
      <div className="two-column">
        <div className="panel">
          <h2>{pick(locale, 'المنتجات', 'PRODUCTS')}</h2>
          <div className="compare-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>{pick(locale, 'الاسم', 'NAME')}</th>
                  <th>{pick(locale, 'الحالة', 'STATUS')}</th>
                  <th>{pick(locale, 'السعر', 'PRICE')}</th>
                  <th>{pick(locale, 'المخزون', 'STOCK')}</th>
                </tr>
              </thead>
              <tbody>
                {(rows || []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/${locale}/admin/products?edit=${row.id}`}>
                        {row.sku}
                      </Link>
                    </td>
                    <td>{pick(locale, row.name_ar, row.name_en)}</td>
                    <td>{row.status}</td>
                    <td>{money(row.price_egp, locale)}</td>
                    <td>{row.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form action={saveProduct} className="panel form-stack">
          <h2>
            {selected
              ? pick(locale, 'تعديل المنتج', 'EDIT PRODUCT')
              : pick(locale, 'منتج جديد', 'NEW PRODUCT')}
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
            SKU
            <input
              className="input"
              name="sku"
              required
              defaultValue={selected?.sku || ''}
            />
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
            {pick(locale, 'الفئة', 'CATEGORY')}
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
            {pick(locale, 'العلامة', 'BRAND')}
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
          <label className="field-label">
            {pick(locale, 'السعر بالجنيه', 'PRICE EGP')}
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
            {pick(locale, 'سعر العرض', 'SALE PRICE')}
            <input
              className="input"
              name="sale_price_egp"
              type="number"
              min="0"
              step="0.01"
              defaultValue={selected?.sale_price_egp ?? ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الحالة', 'STATUS')}
            <select
              className="input"
              name="status"
              defaultValue={selected?.status || 'draft'}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'مميز', 'FEATURED')}
            <select
              className="input"
              name="featured"
              defaultValue={selected?.featured ? 'true' : 'false'}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <button className="button button-accent" type="submit">
            {pick(locale, 'حفظ المنتج', 'SAVE PRODUCT')}
          </button>
          <p>
            {pick(
              locale,
              'تُدار الكميات من صفحة المخزون لتسجيل كل حركة.',
              'Manage quantities in Inventory so every change is recorded.',
            )}
          </p>
        </form>
      </div>
      {selected && (
        <section className="panel" style={{ marginTop: 28 }}>
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
        <section className="panel form-stack" style={{ marginTop: 28 }}>
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
    </div>
  );
}
