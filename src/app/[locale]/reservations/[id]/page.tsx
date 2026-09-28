import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { StartPayment } from '@/components/start-payment';
import { cancelReservation } from '@/app/actions';
export default async function Reservation({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
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
  const [{ data: bike }, { data: payment }, { data: history }] =
    await Promise.all([
      db!
        .from('public_motorcycles')
        .select('name_ar,name_en,slug')
        .eq('id', r.motorcycle_id)
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
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/reservations`}>RESERVATIONS</Link> /{' '}
        {id.slice(0, 8)}
      </div>
      <h1 className="page-title">
        {pick(locale, 'تفاصيل الحجز', 'RESERVATION DETAILS')}
      </h1>
      <div className="panel" style={{ maxWidth: 680 }}>
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
          {bike ? pick(locale, bike.name_ar, bike.name_en) : 'Motorcycle'}
        </h2>
        <div className="spec-row">
          <span>{pick(locale, 'حالة الحجز', 'STATUS')}</span>
          <strong>{r.status}</strong>
        </div>
        <div className="spec-row">
          <span>{pick(locale, 'العربون', 'DEPOSIT')}</span>
          <strong>{money(r.deposit_egp, locale)}</strong>
        </div>
        <div className="spec-row">
          <span>{pick(locale, 'حالة الدفع', 'PAYMENT')}</span>
          <strong>{payment?.status || 'pending'}</strong>
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
              <button className="button button-ghost" type="submit">
                {pick(locale, 'إلغاء الحجز', 'Cancel reservation')}
              </button>
            </form>
          )}
        <h3>{pick(locale, 'سجل الحجز', 'RESERVATION HISTORY')}</h3>
        {history?.map((entry) => (
          <div className="spec-row" key={entry.id}>
            <span>{entry.status}</span>
            <small>{new Date(entry.created_at).toLocaleString(locale)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
