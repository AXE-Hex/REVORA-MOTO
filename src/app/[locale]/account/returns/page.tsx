import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { requestReturn } from '../service-actions';

export default async function Returns({
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
  const ids = (orders || []).map((o) => o.id);
  const { data: items } = ids.length
    ? await db
        .from('order_items')
        .select('id,order_id,name_ar_snapshot,name_en_snapshot,quantity')
        .in('order_id', ids)
    : { data: [] };
  const { data: cases } = await db
    .from('return_requests')
    .select(
      'id,reason,customer_notes,admin_notes,inspection_notes,status,refund_amount_egp,created_at,order_id,return_items(order_item_id,quantity),return_history(from_status,to_status,note,created_at),case_attachments(storage_path)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const { error } = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/account`}>ACCOUNT</Link> / RETURNS
      </div>
      <h1 className="page-title">{pick(locale, 'المرتجعات', 'RETURNS')}</h1>
      {error && <div className="notice error">{error}</div>}
      <div className="two-column">
        <div>
          <h2>{pick(locale, 'طلبات الإرجاع', 'RETURN REQUESTS')}</h2>
          {cases?.map(async (c) => {
            const imageLinks = await Promise.all(
              (c.case_attachments || []).map(async (a) => {
                const { data } = await db.storage
                  .from('case-evidence')
                  .createSignedUrl(a.storage_path, 300);
                return data?.signedUrl || null;
              }),
            );
            return (
              <div className="panel" key={c.id} style={{ marginBottom: 12 }}>
                <strong>{c.reason}</strong>{' '}
                <span className="status">{c.status}</span>
                <p>
                  {pick(
                    locale,
                    'المبلغ المتوقع بعد المراجعة',
                    'Estimated refund after review',
                  )}
                  :{' '}
                  {c.refund_amount_egp != null
                    ? money(c.refund_amount_egp, locale)
                    : '—'}
                </p>
                {c.customer_notes && <p>{c.customer_notes}</p>}
                {c.admin_notes && (
                  <p>
                    {pick(locale, 'ملاحظات الإدارة', 'Staff notes')}:{' '}
                    {c.admin_notes}
                  </p>
                )}
                {c.inspection_notes && (
                  <p>
                    {pick(locale, 'نتيجة الفحص', 'Inspection')}:{' '}
                    {c.inspection_notes}
                  </p>
                )}
                <small>
                  {new Date(c.created_at).toLocaleDateString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </small>
                <ul>
                  {c.return_history?.map((h) => (
                    <li key={`${h.created_at}-${h.to_status}`}>
                      {h.to_status} ·{' '}
                      {new Date(h.created_at).toLocaleString(
                        locale === 'ar' ? 'ar-EG' : 'en-GB',
                      )}
                      {h.note ? ` · ${h.note}` : ''}
                    </li>
                  ))}
                </ul>
                {imageLinks.filter(Boolean).map((url, index) => (
                  <a key={index} href={url!} target="_blank" rel="noreferrer">
                    {pick(locale, 'عرض صورة الدليل', 'View evidence')}{' '}
                    {index + 1} ↗
                  </a>
                ))}
              </div>
            );
          })}
          {!cases?.length && (
            <p>
              {pick(locale, 'لا توجد طلبات إرجاع', 'No return requests yet')}
            </p>
          )}
        </div>
        <form action={requestReturn} className="form-stack panel">
          <h2>{pick(locale, 'طلب إرجاع', 'REQUEST A RETURN')}</h2>
          <p>
            {pick(
              locale,
              'تتوفر المنتجات من الطلبات المسلّمة فقط. يخضع المبلغ النهائي للمراجعة.',
              'Only items from delivered orders qualify. The final amount is subject to review.',
            )}
          </p>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'المنتج', 'PRODUCT')}
            <select className="input" name="order_item" required>
              {items?.map((i) => (
                <option value={i.id} key={i.id}>
                  #{orders?.find((o) => o.id === i.order_id)?.order_number} ·{' '}
                  {pick(locale, i.name_ar_snapshot, i.name_en_snapshot)} (
                  {i.quantity})
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'الكمية', 'QUANTITY')}
            <input
              className="input"
              name="quantity"
              type="number"
              min="1"
              max="99"
              defaultValue="1"
              required
            />
          </label>
          <label className="field-label">
            {pick(locale, 'السبب', 'REASON')}
            <input
              className="input"
              name="reason"
              minLength={5}
              maxLength={500}
              required
            />
          </label>
          <label className="field-label">
            {pick(locale, 'ملاحظاتك', 'YOUR NOTES')}
            <textarea
              className="input"
              name="customer_notes"
              maxLength={2000}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'صورة دليل (اختياري)', 'EVIDENCE IMAGE (OPTIONAL)')}
            <input
              className="input"
              type="file"
              name="evidence"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
          <button className="button button-accent" disabled={!items?.length}>
            {pick(locale, 'إرسال الطلب', 'SUBMIT REQUEST')}
          </button>
        </form>
      </div>
    </div>
  );
}
