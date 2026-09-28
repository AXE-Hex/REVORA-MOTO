import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';

export default async function AccountReservations({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/account/reservations`);

  const db = await supabase();
  const [{ data: reservations, error }, query] = await Promise.all([
    db!
      .from('motorcycle_reservations')
      .select('id,status,deposit_egp,created_at,motorcycle_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    searchParams,
  ]);
  const motorcycleIds = [
    ...new Set((reservations || []).map((row) => row.motorcycle_id)),
  ];
  const { data: motorcycles } = motorcycleIds.length
    ? await db!
        .from('public_motorcycles')
        .select('id,slug,name_ar,name_en,condition,year,image_url')
        .in('id', motorcycleIds)
    : { data: [] };
  const motorcycleById = new Map(
    (motorcycles || []).map((bike) => [bike.id, bike]),
  );

  return (
    <section className="account-reservations-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'معرض الدراجات', 'MOTORCYCLE SHOWROOM')}
        </span>
        <h2 className="page-title">
          {pick(locale, 'حجوزاتي', 'My reservations')}
        </h2>
      </div>
      {(error || query.error) && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل الحجوزات', 'Could not load reservations')}
        </p>
      )}
      <div className="account-record-list">
        {reservations?.map((reservation) => {
          const motorcycle = motorcycleById.get(reservation.motorcycle_id);
          return (
            <article className="account-record-card panel" key={reservation.id}>
              {motorcycle?.image_url && (
                // The image is managed in the motorcycle catalog and is already a trusted catalog URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="account-record-image"
                  src={motorcycle.image_url}
                  alt={pick(locale, motorcycle.name_ar, motorcycle.name_en)}
                />
              )}
              <div className="account-record-main">
                <span className="section-index">
                  {pick(locale, 'رقم الحجز', 'RESERVATION')}
                </span>
                <Link
                  className="account-order-number"
                  href={`/${locale}/reservations/${reservation.id}`}
                >
                  RV-{reservation.id.slice(0, 8).toUpperCase()}
                </Link>
                <strong>
                  {motorcycle
                    ? `${pick(locale, motorcycle.name_ar, motorcycle.name_en)} · ${motorcycle.year}`
                    : pick(locale, 'دراجة نارية', 'Motorcycle')}
                </strong>
                <time dateTime={reservation.created_at}>
                  {formatDate(reservation.created_at, locale)}
                </time>
              </div>
              <div className="account-record-meta">
                <StatusBadge status={reservation.status} locale={locale} />
                <span>
                  {pick(locale, 'العربون', 'Deposit')}:{' '}
                  <strong>{money(reservation.deposit_egp, locale)}</strong>
                </span>
              </div>
              <Link
                className="button button-secondary account-order-open"
                href={`/${locale}/reservations/${reservation.id}`}
              >
                {pick(locale, 'متابعة الحجز', 'Track reservation')}
              </Link>
            </article>
          );
        })}
      </div>
      {!error && !query.error && !reservations?.length && (
        <div className="panel account-empty-state">
          <h3>{pick(locale, 'لا توجد حجوزات بعد', 'No reservations yet')}</h3>
          <p className="muted">
            {pick(
              locale,
              'ستظهر حجوزاتك وتحديثاتها هنا.',
              'Your reservations and their updates will appear here.',
            )}
          </p>
          <Link
            className="button button-primary"
            href={`/${locale}/motorcycles`}
          >
            {pick(locale, 'استكشف الدراجات', 'Explore motorcycles')}
          </Link>
        </div>
      )}
    </section>
  );
}
