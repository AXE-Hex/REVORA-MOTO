import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { operationFailed } from '@/lib/action-feedback';
import { savePromotion, togglePromotion } from './actions';

type Promotion = {
  id: string;
  code: string | null;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  min_total_egp: number;
  usage_limit: number | null;
  per_customer_limit: number | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
};

type Target = {
  promotion_id: string;
  product_id: string | null;
  category_id: string | null;
  brand_id: string | null;
};

function PromotionForm({
  locale,
  promotion,
  targetValues,
  options,
}: {
  locale: 'ar' | 'en';
  promotion?: Promotion;
  targetValues: string[];
  options: { value: string; label: string }[];
}) {
  return (
    <form action={savePromotion} className="form-stack">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={promotion?.id || ''} />
      <label className="field-label">
        {pick(locale, 'اسم العرض', 'PROMOTION NAME')}
        <input
          className="input"
          name="name"
          required
          minLength={3}
          maxLength={120}
          defaultValue={promotion?.name || ''}
        />
      </label>
      <label className="field-label">
        {pick(
          locale,
          'رمز القسيمة، اتركه فارغاً لتطبيق العرض تلقائياً',
          'COUPON CODE — leave blank for automatic promotion',
        )}
        <input
          className="input"
          name="code"
          maxLength={40}
          pattern="[A-Za-z0-9_-]{3,40}"
          defaultValue={promotion?.code || ''}
        />
      </label>
      <div className="two-column">
        <label className="field-label">
          {pick(locale, 'نوع الخصم', 'DISCOUNT TYPE')}
          <select
            className="input"
            name="type"
            defaultValue={promotion?.type || 'percent'}
          >
            <option value="percent">
              {pick(locale, 'نسبة مئوية', 'Percentage')}
            </option>
            <option value="fixed">
              {pick(locale, 'قيمة ثابتة بالجنيه', 'Fixed EGP')}
            </option>
          </select>
        </label>
        <label className="field-label">
          {pick(locale, 'القيمة', 'VALUE')}
          <input
            className="input"
            name="value"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={promotion?.value || ''}
          />
        </label>
      </div>
      <label className="field-label">
        {pick(
          locale,
          'المنتجات أو الفئات أو العلامات المستهدفة؛ اتركها فارغة لتطبيق العرض على كل السلة',
          'TARGETS — leave empty for the entire cart',
        )}
        <select
          className="input"
          name="targets"
          multiple
          size={7}
          defaultValue={targetValues}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="two-column">
        <label className="field-label">
          {pick(locale, 'الحد الأدنى للطلب', 'MINIMUM ORDER (EGP)')}
          <input
            className="input"
            name="min_total"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={promotion?.min_total_egp ?? 0}
          />
        </label>
        <label className="field-label">
          {pick(locale, 'الحد الإجمالي للاستخدام', 'GLOBAL USE LIMIT')}
          <input
            className="input"
            name="global_limit"
            type="number"
            min="1"
            step="1"
            defaultValue={promotion?.usage_limit ?? ''}
          />
        </label>
      </div>
      <label className="field-label">
        {pick(locale, 'حد الاستخدام لكل عميل', 'USES PER CUSTOMER')}
        <input
          className="input"
          name="customer_limit"
          type="number"
          min="1"
          step="1"
          defaultValue={promotion?.per_customer_limit ?? ''}
        />
      </label>
      <div className="two-column">
        <label className="field-label">
          {pick(
            locale,
            'بداية العرض مع المنطقة الزمنية',
            'START — include timezone',
          )}
          <input
            className="input"
            name="starts"
            required
            placeholder="2026-10-01T09:00:00+03:00"
            defaultValue={promotion?.starts_at || ''}
          />
        </label>
        <label className="field-label">
          {pick(
            locale,
            'نهاية العرض مع المنطقة الزمنية',
            'END — include timezone',
          )}
          <input
            className="input"
            name="ends"
            required
            placeholder="2026-10-31T23:59:00+02:00"
            defaultValue={promotion?.ends_at || ''}
          />
        </label>
      </div>
      <label className="field-label">
        {pick(locale, 'الحالة', 'STATUS')}
        <select
          className="input"
          name="active"
          defaultValue={String(promotion?.active ?? true)}
        >
          <option value="true">{pick(locale, 'نشط', 'Active')}</option>
          <option value="false">{pick(locale, 'متوقف', 'Inactive')}</option>
        </select>
      </label>
      <button className="button button-accent" type="submit">
        {pick(
          locale,
          promotion ? 'حفظ التغييرات' : 'إنشاء العرض',
          promotion ? 'SAVE CHANGES' : 'CREATE PROMOTION',
        )}
      </button>
    </form>
  );
}

export default async function PromotionsAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) notFound();
  const db = await supabase();
  if (!db) notFound();
  const { data: allowed } = await db.rpc('has_permission', {
    p_permission: 'catalog.write',
  });
  if (!allowed) notFound();
  const [
    promotionsResult,
    targetsResult,
    productsResult,
    categoriesResult,
    brandsResult,
    usageResult,
  ] = await Promise.all([
    db
      .from('promotions')
      .select(
        'id,code,name,type,value,min_total_egp,usage_limit,per_customer_limit,starts_at,ends_at,active',
      )
      .order('starts_at', { ascending: false })
      .limit(100),
    db
      .from('promotion_targets')
      .select('promotion_id,product_id,category_id,brand_id'),
    db
      .from('public_products')
      .select('id,name_ar,name_en')
      .order('name_en')
      .limit(200),
    db
      .from('categories')
      .select('id,name_ar,name_en')
      .order('name_en')
      .limit(200),
    db.from('brands').select('id,name').order('name').limit(100),
    db
      .from('coupon_usage')
      .select('id,promotion_id,user_id,order_id,used_at')
      .order('used_at', { ascending: false })
      .limit(100),
  ]);
  const promotions = (promotionsResult.data || []) as Promotion[];
  const targets = (targetsResult.data || []) as Target[];
  const options = [
    ...(productsResult.data || []).map((p) => ({
      value: `product:${p.id}`,
      label: `${pick(locale, p.name_ar, p.name_en)} · Product`,
    })),
    ...(categoriesResult.data || []).map((c) => ({
      value: `category:${c.id}`,
      label: `${pick(locale, c.name_ar, c.name_en)} · Category`,
    })),
    ...(brandsResult.data || []).map((b) => ({
      value: `brand:${b.id}`,
      label: `${b.name} · Brand`,
    })),
  ];
  const targetValues = (promotionId: string) =>
    targets
      .filter((t) => t.promotion_id === promotionId)
      .map((t) =>
        t.product_id
          ? `product:${t.product_id}`
          : t.category_id
            ? `category:${t.category_id}`
            : `brand:${t.brand_id}`,
      );
  const { error, saved } = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / PROMOTIONS
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة العروض', 'PROMOTIONS')}
      </h1>
      {error && <p className="notice error">{operationFailed(locale)}</p>}
      {saved && (
        <p className="notice">
          {pick(locale, 'تم حفظ العرض.', 'Promotion saved.')}
        </p>
      )}
      <div className="panel" style={{ marginBottom: 30 }}>
        <h2>{pick(locale, 'عرض جديد', 'NEW PROMOTION')}</h2>
        <PromotionForm locale={locale} targetValues={[]} options={options} />
      </div>
      <div className="panel">
        <h2>{pick(locale, 'العروض الحالية', 'CURRENT PROMOTIONS')}</h2>
        {!promotions.length && (
          <p>{pick(locale, 'لا توجد عروض بعد.', 'No promotions yet.')}</p>
        )}
        {promotions.map((promotion) => {
          return (
            <details
              key={promotion.id}
              style={{
                padding: '14px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <summary style={{ cursor: 'pointer' }}>
                <strong>{promotion.name}</strong> ·{' '}
                {promotion.code || pick(locale, 'تلقائي', 'Automatic')} ·{' '}
                {promotion.type === 'percent'
                  ? `${promotion.value}%`
                  : money(promotion.value, locale)}{' '}
                ·{' '}
                {promotion.active
                  ? pick(locale, 'نشط', 'Active')
                  : pick(locale, 'متوقف', 'Inactive')}
              </summary>
              <div style={{ marginTop: 16 }}>
                <form action={togglePromotion} style={{ marginBottom: 20 }}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={promotion.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={String(!promotion.active)}
                  />
                  <button className="button" type="submit">
                    {pick(
                      locale,
                      promotion.active ? 'إيقاف العرض' : 'تنشيط العرض',
                      promotion.active ? 'DEACTIVATE' : 'ACTIVATE',
                    )}
                  </button>
                </form>
                <PromotionForm
                  locale={locale}
                  promotion={promotion}
                  targetValues={targetValues(promotion.id)}
                  options={options}
                />
              </div>
            </details>
          );
        })}
      </div>
      <div className="panel admin-promotion-usage" style={{ marginTop: 30 }}>
        <h2>{pick(locale, 'سجل الاستخدام الأخير', 'RECENT USAGE')}</h2>
        <table className="data-table admin-promotion-usage-table">
          <thead>
            <tr>
              <th>{pick(locale, 'العرض', 'PROMOTION')}</th>
              <th>{pick(locale, 'الطلب', 'ORDER')}</th>
              <th>{pick(locale, 'التاريخ', 'DATE')}</th>
            </tr>
          </thead>
          <tbody>
            {usageResult.data?.map((use) => (
              <tr key={use.id}>
                <td>
                  {promotions.find((p) => p.id === use.promotion_id)?.name ||
                    use.promotion_id}
                </td>
                <td>{use.order_id}</td>
                <td>
                  {new Date(use.used_at).toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-promotion-usage-cards">
          {usageResult.data?.map((use) => (
            <article className="admin-mobile-data-card" key={`usage-${use.id}`}>
              <h3>
                {promotions.find(
                  (promotion) => promotion.id === use.promotion_id,
                )?.name || use.promotion_id}
              </h3>
              <dl>
                <div>
                  <dt>{pick(locale, 'الطلب', 'Order')}</dt>
                  <dd dir="ltr">{use.order_id}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'التاريخ', 'Date')}</dt>
                  <dd>
                    {new Date(use.used_at).toLocaleString(
                      locale === 'ar' ? 'ar-EG' : 'en-GB',
                    )}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
          {!usageResult.data?.length && (
            <p>{pick(locale, 'لا يوجد استخدام بعد.', 'No usage yet.')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
