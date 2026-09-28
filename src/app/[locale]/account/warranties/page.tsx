import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { operationFailed } from '@/lib/action-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { registerWarranty, requestWarrantyClaim } from '../service-actions';

export default async function Warranties({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = (await supabase())!;
  const { data: orders } = await db
    .from('orders')
    .select('id,order_number')
    .eq('user_id', user.id)
    .eq('status', 'delivered');
  const orderIds = (orders || []).map((o) => o.id);
  const { data: items } = orderIds.length
    ? await db
        .from('order_items')
        .select(
          'id,order_id,product_id,quantity,name_ar_snapshot,name_en_snapshot',
        )
        .in('order_id', orderIds)
    : { data: [] };
  const productIds = [...new Set((items || []).map((i) => i.product_id))];
  const { data: terms } = productIds.length
    ? await db
        .from('products')
        .select('id,warranty_months')
        .in('id', productIds)
        .not('warranty_months', 'is', null)
    : { data: [] };
  const { data: warranties } = await db
    .from('warranties')
    .select(
      'id,order_item_id,unit_number,serial_number,starts_at,ends_at,status,registered_at',
    )
    .eq('user_id', user.id)
    .order('registered_at', { ascending: false });
  const { data: claims } = await db
    .from('warranty_claims')
    .select(
      'id,warranty_id,details,status,created_at,warranty_claim_history(from_status,to_status,created_at),case_attachments(storage_path)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const eligible = (items || []).flatMap((item) =>
    terms?.some((term) => term.id === item.product_id)
      ? Array.from({ length: item.quantity }, (_, index) => ({
          item,
          unit: index + 1,
        })).filter(
          ({ unit }) =>
            !warranties?.some(
              (w) => w.order_item_id === item.id && w.unit_number === unit,
            ),
        )
      : [],
  );
  const { error } = await searchParams;
  return (
    <section className="account-warranties-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'خدمة ما بعد البيع', 'AFTER-SALES')}
        </span>
        <h2 className="page-title">{pick(locale, 'الضمان', 'Warranties')}</h2>
      </div>
      {error && <div className="notice error">{operationFailed(locale)}</div>}
      <div className="two-column">
        <div>
          <h3>{pick(locale, 'ضماناتي', 'My warranties')}</h3>
          {warranties?.map((w) => {
            const item = items?.find((i) => i.id === w.order_item_id);
            const expired =
              w.status === 'expired' ||
              w.ends_at < new Date().toISOString().slice(0, 10);
            return (
              <article className="panel account-service-card" key={w.id}>
                <div className="account-service-card-heading">
                  <strong>
                    {item
                      ? pick(
                          locale,
                          item.name_ar_snapshot,
                          item.name_en_snapshot,
                        )
                      : pick(locale, 'منتج من طلبك', 'Purchased product')}{' '}
                    · #{w.unit_number}
                  </strong>
                  <StatusBadge
                    status={expired ? 'expired' : w.status}
                    locale={locale}
                  />
                </div>
                <p className="muted">
                  {pick(locale, 'مدة الضمان', 'Warranty period')}:{' '}
                  {formatDate(w.starts_at, locale)} –{' '}
                  {formatDate(w.ends_at, locale)}
                </p>
                {w.serial_number && (
                  <small>
                    {pick(locale, 'الرقم التسلسلي', 'Serial')}:{' '}
                    {w.serial_number}
                  </small>
                )}
                {!expired && w.status === 'active' && (
                  <form
                    action={requestWarrantyClaim}
                    className="form-stack account-warranty-claim-form"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="warranty" value={w.id} />
                    <label className="field-label">
                      {pick(locale, 'تفاصيل المطالبة', 'CLAIM DETAILS')}
                      <textarea
                        className="input"
                        name="details"
                        minLength={10}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <label className="field-label">
                      {pick(locale, 'صورة (اختياري)', 'IMAGE (OPTIONAL)')}
                      <input
                        className="input"
                        type="file"
                        name="evidence"
                        accept="image/jpeg,image/png,image/webp"
                      />
                    </label>
                    <button className="button button-primary">
                      {pick(locale, 'طلب مطالبة', 'FILE CLAIM')}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
          {!warranties?.length && (
            <div className="panel account-empty-state">
              <h4>
                {pick(
                  locale,
                  'لا توجد ضمانات مسجلة',
                  'No registered warranties',
                )}
              </h4>
              <p className="muted">
                {pick(
                  locale,
                  'يمكنك تسجيل ضمان المنتجات المؤهلة بعد تسليم الطلب.',
                  'Eligible product warranties can be registered after delivery.',
                )}
              </p>
            </div>
          )}
          <h3>{pick(locale, 'مطالبات الضمان', 'Warranty claims')}</h3>
          {claims?.map(async (c) => {
            const imageLinks = await Promise.all(
              (c.case_attachments || []).map(async (a) => {
                const { data } = await db.storage
                  .from('case-evidence')
                  .createSignedUrl(a.storage_path, 300);
                return data?.signedUrl || null;
              }),
            );
            return (
              <article className="panel account-service-card" key={c.id}>
                <div className="account-service-card-heading">
                  <strong>{c.details}</strong>
                  <StatusBadge status={c.status} locale={locale} />
                </div>
                <time dateTime={c.created_at}>
                  {formatDate(c.created_at, locale)}
                </time>
                <ul className="account-service-history">
                  {c.warranty_claim_history?.map((h) => (
                    <li key={`${h.created_at}-${h.to_status}`}>
                      <StatusBadge status={h.to_status} locale={locale} />
                      <time dateTime={h.created_at}>
                        {formatDate(h.created_at, locale)}
                      </time>
                    </li>
                  ))}
                </ul>
                <div className="account-service-attachments">
                  {imageLinks.filter(Boolean).map((url, index) => (
                    <a key={index} href={url!} target="_blank" rel="noreferrer">
                      {pick(locale, 'عرض الصورة', 'View image')} {index + 1} ↗
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <form
          action={registerWarranty}
          className="form-stack panel account-service-form"
        >
          <h2>{pick(locale, 'تسجيل ضمان', 'REGISTER WARRANTY')}</h2>
          <p>
            {pick(
              locale,
              'تظهر المنتجات المسلّمة التي حُددت لها مدة ضمان فقط.',
              'Only delivered products with configured warranty terms are shown.',
            )}
          </p>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'المنتج', 'PRODUCT')}
            <select className="input" name="registration" required>
              {eligible.map(({ item: i, unit }) => (
                <option value={`${i.id}:${unit}`} key={`${i.id}:${unit}`}>
                  #{orders?.find((o) => o.id === i.order_id)?.order_number} ·{' '}
                  {pick(locale, i.name_ar_snapshot, i.name_en_snapshot)} · #
                  {unit} ·{' '}
                  {terms?.find((t) => t.id === i.product_id)?.warranty_months}{' '}
                  {pick(locale, 'شهر', 'months')}
                </option>
              ))}
            </select>
          </label>
          {!eligible.length && (
            <p className="muted">
              {pick(
                locale,
                'لا توجد منتجات مؤهلة لتسجيل ضمان حالياً.',
                'There are no products eligible for warranty registration yet.',
              )}
            </p>
          )}
          <label className="field-label">
            {pick(locale, 'الرقم التسلسلي (إن وجد)', 'SERIAL NUMBER (IF ANY)')}
            <input className="input" name="serial" maxLength={120} />
          </label>
          <button className="button button-primary" disabled={!eligible.length}>
            {pick(locale, 'تسجيل', 'REGISTER')}
          </button>
        </form>
      </div>
    </section>
  );
}
