import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { SignOut } from '@/components/sign-out';
export default async function Account({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: profile } = await db!
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  return (
    <section className="account-overview">
      <div className="account-overview-heading">
        <span className="section-index">
          {pick(locale, 'نظرة عامة', 'OVERVIEW')}
        </span>
        <h2 className="page-title">
          {pick(locale, 'أهلاً', 'Welcome')}, {profile?.full_name || user.email}
        </h2>
        <p className="muted">
          {pick(
            locale,
            'تابع طلباتك وحجوزاتك ومركباتك من مكان واحد.',
            'Manage your orders, reservations, and vehicles in one place.',
          )}
        </p>
      </div>
      <div className="account-overview-cards">
        <Link
          className="panel account-overview-card"
          href={`/${locale}/account/orders`}
        >
          <span className="account-card-kicker">01</span>
          <h3>{pick(locale, 'الطلبات', 'Orders')}</h3>
          <span className="muted">
            {pick(
              locale,
              'عرض سجل الطلبات والتفاصيل',
              'View order history and details',
            )}
          </span>
        </Link>
        <Link
          className="panel account-overview-card"
          href={`/${locale}/account/reservations`}
        >
          <span className="account-card-kicker">02</span>
          <h3>{pick(locale, 'حجوزات الدراجات', 'Motorcycle reservations')}</h3>
          <span className="muted">
            {pick(
              locale,
              'تابع حالة حجوزاتك والخطوات التالية',
              'Track reservation status and next steps',
            )}
          </span>
        </Link>
        <Link
          className="panel account-overview-card"
          href={`/${locale}/account/garage`}
        >
          <span className="account-card-kicker">03</span>
          <h3>{pick(locale, 'مرآبي', 'My garage')}</h3>
          <span className="muted">
            {pick(
              locale,
              'إدارة مركباتك والعثور على القطع المتوافقة',
              'Manage vehicles and find compatible parts',
            )}
          </span>
        </Link>
      </div>
      <div className="account-overview-signout">
        <SignOut locale={locale} />
      </div>
    </section>
  );
}
