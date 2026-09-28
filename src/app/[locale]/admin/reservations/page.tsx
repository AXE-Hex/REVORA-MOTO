import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import {
  adminTransitionReservation,
  adminRequestReservationRefund,
  adminRetryRefund,
} from '@/app/admin-actions';
import { StartRefund } from '@/components/start-refund';

const nextStatus: Record<string, string[]> = {
  pending: ['cancelled', 'expired'],
  awaiting_payment: ['cancelled', 'expired'],
  deposit_paid: ['contacted'],
  contacted: ['appointment_scheduled'],
  appointment_scheduled: ['completed'],
};

export default async function AdminReservations({
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
    p_permission: 'reservations.read',
  });
  if (!allowed) notFound();
  const [{ data: rows, error }, { data: canWrite }, { data: canReadPayments }] =
    await Promise.all([
      db!
        .from('motorcycle_reservations')
        .select('id,motorcycle_id,status,deposit_egp,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      db!.rpc('has_permission', { p_permission: 'reservations.write' }),
      db!.rpc('has_permission', { p_permission: 'payments.read' }),
    ]);
  const query = await searchParams;
  const { data: refunds } = canReadPayments
    ? await db!
        .from('refund_requests')
        .select('id,reservation_id,status')
        .not('reservation_id', 'is', null)
        .limit(100)
    : { data: [] };
  const refundByReservation = new Map(
    (refunds || []).map((row) => [row.reservation_id, row]),
  );
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / RESERVATIONS
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة الحجوزات', 'RESERVATION OPERATIONS')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحديث الحجز', 'Reservation update failed')}
        </p>
      )}
      {query.updated && (
        <p className="notice">
          {pick(locale, 'تم تحديث الحجز', 'Reservation updated')}
        </p>
      )}
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل الحجوزات', 'Could not load reservations')}
        </p>
      )}
      <div className="compare-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{pick(locale, 'التاريخ', 'DATE')}</th>
              <th>{pick(locale, 'الحالة', 'STATUS')}</th>
              <th>{pick(locale, 'العربون', 'DEPOSIT')}</th>
              <th>{pick(locale, 'الإجراء', 'ACTION')}</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => (
              <tr key={row.id}>
                <td>{row.id.slice(0, 8)}</td>
                <td>{new Date(row.created_at).toLocaleDateString(locale)}</td>
                <td>{row.status}</td>
                <td>{money(row.deposit_egp, locale)}</td>
                <td>
                  {canWrite &&
                    (nextStatus[row.status] || []).map((status) => (
                      <form
                        action={adminTransitionReservation}
                        key={status}
                        style={{ display: 'inline-block', marginInlineEnd: 8 }}
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="status" value={status} />
                        <button className="button button-ghost" type="submit">
                          {status}
                        </button>
                      </form>
                    ))}
                  {canWrite &&
                    canReadPayments &&
                    row.status === 'cancelled' &&
                    refundByReservation.get(row.id)?.status ===
                      'provider_required' &&
                    process.env.PAYMENT_PROVIDER === 'gateway' && (
                      <StartRefund
                        id={refundByReservation.get(row.id)!.id}
                        locale={locale}
                      />
                    )}
                  {canWrite &&
                    canReadPayments &&
                    row.status === 'cancelled' &&
                    refundByReservation.get(row.id)?.status === 'failed' && (
                      <form action={adminRetryRefund}>
                        <input type="hidden" name="locale" value={locale} />
                        <input
                          type="hidden"
                          name="id"
                          value={refundByReservation.get(row.id)!.id}
                        />
                        <input
                          type="hidden"
                          name="target"
                          value="reservations"
                        />
                        <button className="button button-ghost" type="submit">
                          {pick(
                            locale,
                            'إعادة محاولة الاسترداد',
                            'Retry refund',
                          )}
                        </button>
                      </form>
                    )}
                  {canWrite &&
                    canReadPayments &&
                    [
                      'deposit_paid',
                      'contacted',
                      'appointment_scheduled',
                    ].includes(row.status) && (
                      <form
                        action={adminRequestReservationRefund}
                        className="form-stack"
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          className="input"
                          name="reason"
                          minLength={5}
                          maxLength={500}
                          required
                          placeholder={pick(
                            locale,
                            'سبب رد العربون',
                            'Refund reason',
                          )}
                        />
                        <button className="button button-ghost" type="submit">
                          {pick(
                            locale,
                            'طلب رد العربون',
                            'Request deposit refund',
                          )}
                        </button>
                      </form>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows?.length && (
        <p>{pick(locale, 'لا توجد حجوزات', 'No reservations')}</p>
      )}
    </div>
  );
}
