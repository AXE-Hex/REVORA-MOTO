import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { StatusBadge } from '@/components/ui/status-badge';
import { StartPayment } from '@/components/start-payment';
import { cancelReservation } from '@/app/actions';
import { AccountFrame } from '@/components/account-frame';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { formatDate } from '@/lib/format';
export default async function Reservation({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; updated?: string; created?: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: r } = await db!
    .from('motorcycle_reservations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!r) notFound();
  const query = await searchParams;
  const [
    { data: bike },
    { data: branch },
    { data: payment },
    { data: history },
  ] = await Promise.all([
    db!
      .from('public_motorcycles')
      .select('name_ar,name_en,slug,year,condition,image_url')
      .eq('id', r.motorcycle_id)
      .maybeSingle(),
    db!
      .from('branches')
      .select('name_ar,name_en')
      .eq('id', r.branch_id)
      .maybeSingle(),
    db!
      .from('payments')
      .select('id,status,method,provider_reference')
      .eq('reservation_id', id)
      .maybeSingle(),
    db!
      .from('reservation_history')
      .select('id,status,created_at')
      .eq('reservation_id', id)
      .order('created_at', { ascending: true }),
  ]);
  return (
    <AccountFrame locale={locale}>
      <section className="account-detail-page">
        <div className="breadcrumbs">
          <Link href={`/${locale}/account/reservations`}>
            {pick(locale, 'حجوزاتي', 'My reservations')}
          </Link>{' '}
          / {id.slice(0, 8)}
        </div>
        <h1 className="page-title">
          {query.created
            ? pick(locale, 'تم تسجيل حجزك', 'Reservation successful')
            : pick(locale, 'تفاصيل الحجز', 'RESERVATION DETAILS')}
        </h1>
        {query.created && (
          <section className="reservation-success panel" role="status">
            <div className="reservation-success-mark" aria-hidden="true">
              ✓
            </div>
            <span className="section-index">
              {pick(locale, 'تم إنشاء الحجز', 'RESERVATION CREATED')}
            </span>
            <h2>
              {pick(
                locale,
                'تم تسجيل حجزك بنجاح',
                'Your reservation is confirmed',
              )}
            </h2>
            <p>{pick(locale, 'رقم الحجز', 'Reservation reference')}</p>
            <strong className="reservation-reference" dir="ltr">
              RV-R-{id.slice(0, 8).toUpperCase()}
            </strong>
            <div className="reservation-success-details">
              <div>
                <span>{pick(locale, 'الدراجة', 'Motorcycle')}</span>
                <b>
                  {bike
                    ? pick(locale, bike.name_ar, bike.name_en)
                    : pick(locale, 'دراجة نارية', 'Motorcycle')}{' '}
                  {bike?.year || ''}
                </b>
              </div>
              <div>
                <span>{pick(locale, 'الفرع', 'Branch')}</span>
                <b>
                  {branch ? pick(locale, branch.name_ar, branch.name_en) : '—'}
                </b>
              </div>
              <div>
                <span>{pick(locale, 'العربون', 'Deposit')}</span>
                <b>{money(r.deposit_egp, locale)}</b>
              </div>
              <div>
                <span>{pick(locale, 'الحالة الحالية', 'Current status')}</span>
                <StatusBadge status={r.status} locale={locale} />
              </div>
            </div>
            <p className="notice">
              {pick(
                locale,
                'سيتواصل معك فريق المبيعات. لا يتم تأكيد الدفع حتى التحقق من مزود الدفع.',
                'Our sales team will contact you. Payment is not confirmed until verified by the payment provider.',
              )}
            </p>
            <div className="reservation-success-actions">
              <Link
                className="button button-primary"
                href={`/${locale}/reservations/${id}`}
              >
                {pick(locale, 'عرض الحجز', 'View reservation')}
              </Link>
              <Link
                className="button button-secondary"
                href={`/${locale}/motorcycles`}
              >
                {pick(locale, 'العودة إلى الدراجات', 'Back to motorcycles')}
              </Link>
            </div>
          </section>
        )}
        <div className="panel account-reservation-detail">
          {query.error && (
            <p className="notice error">
              {pick(locale, 'تعذر إلغاء الحجز', 'Could not cancel reservation')}
            </p>
          )}
          {query.updated && (
            <p className="notice">
              {pick(locale, 'تم إلغاء الحجز', 'Reservation cancelled')}
            </p>
          )}
          <h2>
            {bike
              ? pick(locale, bike.name_ar, bike.name_en)
              : pick(locale, 'دراجة نارية', 'Motorcycle')}
          </h2>
          <div className="spec-row">
            <span>{pick(locale, 'حالة الحجز', 'STATUS')}</span>
            <StatusBadge status={r.status} locale={locale} />
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'العربون', 'DEPOSIT')}</span>
            <strong>{money(r.deposit_egp, locale)}</strong>
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'تاريخ الطلب', 'REQUESTED')}</span>
            <strong>{formatDate(r.created_at, locale)}</strong>
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'حالة الدفع', 'PAYMENT')}</span>
            <StatusBadge
              status={payment?.status || 'pending'}
              locale={locale}
            />
          </div>
          <p className="notice">
            {payment?.status === 'captured'
              ? pick(
                  locale,
                  'تم تأكيد العربون. سيتواصل معك فريق المبيعات لترتيب الخطوات التالية.',
                  'Your deposit is confirmed. Our sales team will follow up with the next steps.',
                )
              : pick(
                  locale,
                  'طلب الحجز مسجل. سيتواصل معك فريق المبيعات لترتيب الخطوات التالية. لا تُعتبر الدفعة ناجحة إلا بعد التحقق.',
                  'Your reservation request is recorded. Our sales team will follow up. The deposit is not paid until verified.',
                )}
          </p>
          {payment?.status === 'pending' && (
            <StartPayment id={payment.id} locale={locale} />
          )}
          {['pending', 'awaiting_payment'].includes(r.status) &&
            payment?.status === 'pending' && (
              <form action={cancelReservation}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="locale" value={locale} />
                <ConfirmSubmitButton
                  label={pick(locale, 'إلغاء الحجز', 'Cancel reservation')}
                  message={pick(
                    locale,
                    'هل تريد إلغاء هذا الحجز؟',
                    'Cancel this reservation?',
                  )}
                  className="button button-danger"
                />
              </form>
            )}
          <h3>{pick(locale, 'سجل الحجز', 'RESERVATION HISTORY')}</h3>
          {history?.map((entry) => (
            <div className="spec-row" key={entry.id}>
              <StatusBadge status={entry.status} locale={locale} />
              <small>{formatDate(entry.created_at, locale)}</small>
            </div>
          ))}
        </div>
      </section>
    </AccountFrame>
  );
}
