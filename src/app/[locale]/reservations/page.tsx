import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
export default async function Reservations({
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
  const { data: rows } = await (await supabase())!
    .from('motorcycle_reservations')
    .select('id,status,deposit_egp,created_at,motorcycle_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const { error } = await searchParams;
  return (
    <div className="shell section-small">
      <span className="section-index">REVORA / RESERVATIONS</span>
      <h1 className="page-title">
        {pick(locale, 'حجوزاتي', 'MY RESERVATIONS')}
      </h1>
      {error && <div className="notice error">{error}</div>}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{pick(locale, 'الحالة', 'STATUS')}</th>
              <th>{pick(locale, 'العربون', 'DEPOSIT')}</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/${locale}/reservations/${r.id}`}>
                    {r.id.slice(0, 8)}
                  </Link>
                </td>
                <td>
                  <span className="status">{r.status}</span>
                </td>
                <td>{money(r.deposit_egp, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows?.length && (
          <p>{pick(locale, 'لا توجد حجوزات', 'No reservations')}</p>
        )}
      </div>
    </div>
  );
}
