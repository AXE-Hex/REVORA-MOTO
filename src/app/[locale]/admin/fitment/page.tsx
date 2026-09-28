import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { addFitmentRule } from '@/app/admin-vehicle-actions';

export default async function AdminFitment({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'catalog.write',
  });
  if (!allowed) notFound();
  const [{ data: products }, { data: variants }, { data: rules }] =
    await Promise.all([
      db!
        .from('products')
        .select('id,sku,name_ar,name_en')
        .order('name_en')
        .limit(500),
      db!.from('motorcycle_variants').select('id,name,model_id').order('name'),
      db!
        .from('fitment_rules')
        .select(
          'id,product_id,variant_id,year_from,year_to,is_universal,is_exclusion',
        )
        .limit(100),
    ]);
  const productById = new Map(
    (products || []).map((product) => [product.id, product]),
  );
  const variantById = new Map(
    (variants || []).map((variant) => [variant.id, variant]),
  );
  const query = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / FITMENT
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة التوافق', 'FITMENT MANAGEMENT')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ القاعدة', 'Could not save rule')}
        </p>
      )}
      {query.saved && (
        <p className="notice">{pick(locale, 'تم الحفظ', 'Saved')}</p>
      )}
      <div className="two-column">
        <div className="panel">
          <h2>{pick(locale, 'قواعد التوافق', 'FITMENT RULES')}</h2>
          <div className="compare-scroll admin-fitment-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>{pick(locale, 'النسخة', 'VARIANT')}</th>
                  <th>{pick(locale, 'السنوات', 'YEARS')}</th>
                  <th>{pick(locale, 'النوع', 'TYPE')}</th>
                </tr>
              </thead>
              <tbody>
                {(rules || []).map((rule) => (
                  <tr key={rule.id}>
                    <td>{productById.get(rule.product_id)?.sku || '—'}</td>
                    <td>
                      {rule.is_universal
                        ? pick(locale, 'عام', 'Universal')
                        : variantById.get(rule.variant_id)?.name || '—'}
                    </td>
                    <td>
                      {rule.year_from || '—'}–{rule.year_to || '—'}
                    </td>
                    <td>
                      {rule.is_exclusion
                        ? pick(locale, 'استثناء', 'Exclusion')
                        : rule.is_universal
                          ? pick(locale, 'عام', 'Universal')
                          : pick(locale, 'مطابقة محددة', 'Exact fit')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-fitment-mobile-cards">
            {(rules || []).map((rule) => (
              <article
                className="admin-mobile-data-card"
                key={`fitment-mobile-${rule.id}`}
              >
                <h3>{productById.get(rule.product_id)?.sku || '—'}</h3>
                <dl>
                  <div>
                    <dt>{pick(locale, 'النسخة', 'Variant')}</dt>
                    <dd>
                      {rule.is_universal
                        ? pick(locale, 'عام', 'Universal')
                        : variantById.get(rule.variant_id)?.name || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{pick(locale, 'السنوات', 'Years')}</dt>
                    <dd>
                      {rule.year_from || '—'}–{rule.year_to || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{pick(locale, 'النوع', 'Type')}</dt>
                    <dd>
                      {rule.is_exclusion
                        ? pick(locale, 'استثناء', 'Exclusion')
                        : rule.is_universal
                          ? pick(locale, 'عام', 'Universal')
                          : pick(locale, 'مطابقة محددة', 'Exact fit')}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
            {!rules?.length && (
              <p>
                {pick(
                  locale,
                  'لا توجد قواعد توافق بعد',
                  'No fitment rules yet',
                )}
              </p>
            )}
          </div>
        </div>
        <form action={addFitmentRule} className="panel form-stack">
          <h2>{pick(locale, 'قاعدة جديدة', 'NEW FITMENT RULE')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'المنتج', 'PRODUCT')}
            <select className="input" name="product_id" required>
              <option value="">—</option>
              {(products || []).map((product) => (
                <option value={product.id} key={product.id}>
                  {product.sku} ·{' '}
                  {pick(locale, product.name_ar, product.name_en)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'النوع', 'RULE TYPE')}
            <select className="input" name="kind">
              <option value="exact">
                {pick(locale, 'مطابقة محددة', 'Exact fit')}
              </option>
              <option value="universal">
                {pick(locale, 'عام', 'Universal')}
              </option>
              <option value="exclusion">
                {pick(locale, 'استثناء', 'Exclusion')}
              </option>
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'النسخة', 'VARIANT')}
            <select className="input" name="variant_id">
              <option value="">—</option>
              {(variants || []).map((variant) => (
                <option value={variant.id} key={variant.id}>
                  {variant.name} · {variant.model_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'من سنة', 'YEAR FROM')}
            <input
              className="input"
              name="year_from"
              type="number"
              min="1950"
              max="2100"
            />
          </label>
          <label className="field-label">
            {pick(locale, 'إلى سنة', 'YEAR TO')}
            <input
              className="input"
              name="year_to"
              type="number"
              min="1950"
              max="2100"
            />
          </label>
          <button className="button button-accent" type="submit">
            {pick(locale, 'إضافة القاعدة', 'ADD RULE')}
          </button>
        </form>
      </div>
    </div>
  );
}
