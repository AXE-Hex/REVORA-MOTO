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
  const links = [
    ['orders', pick(locale, 'طلباتي', 'MY ORDERS')],
    ['coupons', pick(locale, 'سجل الخصومات', 'DISCOUNT HISTORY')],
    ['reservations', pick(locale, 'حجوزاتي', 'MY RESERVATIONS')],
    ['addresses', pick(locale, 'عناويني', 'ADDRESSES')],
    ['garage', pick(locale, 'مرآبي', 'MY GARAGE')],
    ['wishlist', pick(locale, 'قائمة الرغبات', 'WISHLIST')],
    ['notifications', pick(locale, 'الإشعارات', 'NOTIFICATIONS')],
    ['returns', pick(locale, 'المرتجعات', 'RETURNS')],
    ['warranties', pick(locale, 'الضمان', 'WARRANTIES')],
  ];
  return (
    <div className="shell section-small">
      <span className="section-index">REVORA / ACCOUNT</span>
      <h1 className="page-title">
        {pick(locale, 'أهلاً', 'WELCOME')}, {profile?.full_name || user.email}
      </h1>
      <div className="card-grid">
        {links.map(([path, title]) => (
          <Link
            className="panel"
            href={`/${locale}/account/${path}`}
            key={path}
          >
            <h2>{title} ↗</h2>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 30 }}>
        <SignOut locale={locale} />
      </div>
    </div>
  );
}
