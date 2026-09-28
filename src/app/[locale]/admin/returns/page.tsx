import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { advanceReturn } from '@/app/admin-service-actions';
import { StartRefund } from '@/components/start-refund';
import { adminRetryRefund } from '@/app/admin-actions';

const nextStatus: Record<string, string[]> = {
  requested: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['received'],
  received: ['inspected'],
  inspected: ['refund_pending'],
  refunded: ['completed'],
};

export default async function AdminReturns({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'orders.read',
  });
  if (!allowed) notFound();
  const [{ data: cases }, { data: canWrite }, { data: canReadPayments }] =
    await Promise.all([
      db!
        .from('return_requests')
        .select(
          'id,order_id,reason,customer_notes,admin_notes,inspection_notes,refund_amount_egp,status,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      db!.rpc('has_permission', { p_permission: 'orders.write' }),
      db!.rpc('has_permission', { p_permission: 'payments.read' }),
    ]);
  const { data: refunds } = canReadPayments
    ? await db!
        .from('refund_requests')
        .select('id,return_id,status')
        .not('return_id', 'is', null)
        .limit(100)
    : { data: [] };
  const refundByReturn = new Map(
    (refunds || []).map((row) => [row.return_id, row]),
  );
  const query = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / RETURNS
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة المرتجعات', 'RETURN OPERATIONS')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحديث المرتجع', 'Return update failed')}
        </p>
      )}
      {query.updated && (
        <p className="notice">
          {pick(locale, 'تم تحديث المرتجع', 'Return updated')}
        </p>
      )}
      {(cases || []).map((entry) => (
        <div className="panel" key={entry.id} style={{ marginBottom: 16 }}>
          <h2>
            {entry.id.slice(0, 8)} · {entry.status}
          </h2>
          <p>{entry.reason}</p>
          {entry.customer_notes && <p>{entry.customer_notes}</p>}
          <div className="spec-row">
            <span>
              {pick(locale, 'مبلغ الاسترداد المتوقع', 'EXPECTED REFUND')}
            </span>
            <strong>{money(entry.refund_amount_egp || 0, locale)}</strong>
          </div>
          {entry.inspection_notes && (
            <p>
              {pick(locale, 'ملاحظات الفحص', 'INSPECTION')}:{' '}
              {entry.inspection_notes}
            </p>
          )}
          {entry.status === 'refund_pending' && (
            <div className="notice">
              {pick(locale, 'حالة طلب الاسترداد', 'Refund request status')}:{' '}
              {refundByReturn.get(entry.id)?.status || 'provider_required'}
              {canWrite &&
                canReadPayments &&
                refundByReturn.get(entry.id)?.status === 'provider_required' &&
                process.env.PAYMENT_PROVIDER === 'gateway' && (
                  <StartRefund
                    id={refundByReturn.get(entry.id)!.id}
                    locale={locale}
                  />
                )}
              {canWrite &&
                canReadPayments &&
                refundByReturn.get(entry.id)?.status === 'failed' && (
                  <form action={adminRetryRefund}>
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="id"
                      value={refundByReturn.get(entry.id)!.id}
                    />
                    <input type="hidden" name="target" value="returns" />
                    <button className="button button-ghost" type="submit">
                      {pick(locale, 'إعادة محاولة الاسترداد', 'Retry refund')}
                    </button>
                  </form>
                )}
            </div>
          )}
          {canWrite &&
            (nextStatus[entry.status] || []).map((status) => (
              <form
                action={advanceReturn}
                className="form-stack"
                key={status}
                style={{ marginTop: 12 }}
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={entry.id} />
                <input type="hidden" name="status" value={status} />
                <input
                  className="input"
                  name="note"
                  maxLength={2000}
                  placeholder={pick(locale, 'ملاحظات الإدارة', 'Admin notes')}
                />
                {status === 'refund_pending' && (
                  <textarea
                    className="input"
                    name="inspection"
                    required
                    minLength={5}
                    maxLength={2000}
                    placeholder={pick(
                      locale,
                      'ملاحظات الفحص',
                      'Inspection notes',
                    )}
                  />
                )}
                <button className="button button-ghost" type="submit">
                  {status}
                </button>
              </form>
            ))}
        </div>
      ))}
      {!cases?.length && <p>{pick(locale, 'لا توجد مرتجعات', 'No returns')}</p>}
    </div>
  );
}
