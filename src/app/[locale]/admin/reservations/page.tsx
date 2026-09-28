import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { StatusBadge, localizedStatus } from '@/components/ui/status-badge';
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
  searchParams: Promise<{
    error?: string;
    updated?: string;
    status?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'reservations.read',
  });
  if (!allowed) notFound();
  const query = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page || '1', 10) || 1),
  );
  const pageSize = 25;
  const statuses = [
    'pending',
    'awaiting_payment',
    'deposit_paid',
    'contacted',
    'appointment_scheduled',
    'completed',
    'cancelled',
    'expired',
    'refunded',
  ];
  const search = (query.q || '').trim();
  const validSearch = !search || /^[0-9a-f-]{36}$/i.test(search);
  let reservationsQuery = db!
    .from('motorcycle_reservations')
    .select('id,motorcycle_id,status,deposit_egp,created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });
  if (statuses.includes(query.status || ''))
    reservationsQuery = reservationsQuery.eq('status', query.status);
  if (/^[0-9a-f-]{36}$/i.test(search))
    reservationsQuery = reservationsQuery.eq('id', search);
  const [
    { data: rows, error, count },
    { data: canWrite },
    { data: canReadPayments },
  ] = await Promise.all([
    reservationsQuery.range((page - 1) * pageSize, page * pageSize - 1),
    db!.rpc('has_permission', { p_permission: 'reservations.write' }),
    db!.rpc('has_permission', { p_permission: 'payments.read' }),
  ]);
  const { data: refunds } = canReadPayments
    ? await db!
        .from('refund_requests')
        .select('id,reservation_id,status')
        .in(
          'reservation_id',
          (rows || []).map((row) => row.id),
        )
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
      <form
        className="admin-table-toolbar admin-workflow-filter"
        action={`/${locale}/admin/reservations`}
      >
        <label>
          <span>{pick(locale, 'رقم الحجز', 'Reservation ID')}</span>
          <input
            className="input"
            name="q"
            maxLength={36}
            defaultValue={search}
          />
        </label>
        <label>
          <span>{pick(locale, 'الحالة', 'Status')}</span>
          <select
            className="input"
            name="status"
            defaultValue={query.status || ''}
          >
            <option value="">
              {pick(locale, 'كل الحالات', 'All statuses')}
            </option>
            {statuses.map((status) => (
              <option value={status} key={status}>
                {localizedStatus(status, locale)}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary" type="submit">
          {pick(locale, 'تطبيق', 'Apply')}
        </button>
        <Link
          className="button button-ghost"
          href={`/${locale}/admin/reservations`}
        >
          {pick(locale, 'مسح', 'Clear')}
        </Link>
        <span>
          {pick(locale, `${count || 0} نتيجة`, `${count || 0} results`)}
        </span>
      </form>
      {!validSearch && (
        <p className="notice error" role="alert">
          {pick(
            locale,
            'أدخل رقم الحجز كاملاً.',
            'Enter the full reservation ID.',
          )}
        </p>
      )}
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل الحجوزات', 'Could not load reservations')}
        </p>
      )}
      <div className="compare-scroll admin-reservation-table">
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
                <td>
                  <StatusBadge status={row.status} locale={locale} />
                </td>
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
                          {localizedStatus(status, locale)}
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
      <div className="admin-reservation-mobile-list">
        {(rows || []).map((row) => (
          <article className="admin-reservation-mobile-card panel" key={row.id}>
            <header>
              <code dir="ltr">{row.id.slice(0, 8)}</code>
              <StatusBadge status={row.status} locale={locale} />
            </header>
            <p>{new Date(row.created_at).toLocaleDateString(locale)}</p>
            <strong>{money(row.deposit_egp, locale)}</strong>
            {canWrite &&
              (nextStatus[row.status] || []).map((status) => (
                <form action={adminTransitionReservation} key={status}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value={status} />
                  <button className="button button-secondary" type="submit">
                    {localizedStatus(status, locale)}
                  </button>
                </form>
              ))}
            {canWrite &&
              canReadPayments &&
              ['deposit_paid', 'contacted', 'appointment_scheduled'].includes(
                row.status,
              ) && (
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
                    {pick(locale, 'طلب رد العربون', 'Request deposit refund')}
                  </button>
                </form>
              )}
          </article>
        ))}
      </div>
      {!rows?.length && (
        <p>{pick(locale, 'لا توجد حجوزات', 'No reservations')}</p>
      )}
      <nav
        className="admin-pagination"
        aria-label={pick(locale, 'صفحات الحجوزات', 'Reservation pages')}
      >
        <span>{pick(locale, `صفحة ${page}`, `Page ${page}`)}</span>
        {page > 1 && (
          <Link
            className="button button-secondary"
            href={`/${locale}/admin/reservations?${new URLSearchParams({ ...(query.status ? { status: query.status } : {}), ...(search ? { q: search } : {}), page: String(page - 1) })}`}
          >
            {pick(locale, 'السابق', 'Previous')}
          </Link>
        )}
        {(rows || []).length === pageSize && (
          <Link
            className="button button-secondary"
            href={`/${locale}/admin/reservations?${new URLSearchParams({ ...(query.status ? { status: query.status } : {}), ...(search ? { q: search } : {}), page: String(page + 1) })}`}
          >
            {pick(locale, 'التالي', 'Next')}
          </Link>
        )}
      </nav>
    </div>
  );
}
