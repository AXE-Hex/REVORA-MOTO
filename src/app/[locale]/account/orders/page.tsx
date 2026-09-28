import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
export default async function Orders({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const query = await searchParams;
  const parsedPage = Number(query.page || '1');
  const page =
    Number.isInteger(parsedPage) && parsedPage >= 1 && parsedPage <= 10000
      ? parsedPage
      : 1;
  const pageSize = 50;
  const {
    data: orders,
    error,
    count,
  } = await (await supabase())!
    .from('orders')
    .select('id,order_number,status,total_egp,created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/account`}>ACCOUNT</Link> / ORDERS
      </div>
      <h1 className="page-title">{pick(locale, 'طلباتي', 'MY ORDERS')}</h1>
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل الطلبات', 'Could not load orders')}
        </p>
      )}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{pick(locale, 'التاريخ', 'DATE')}</th>
              <th>{pick(locale, 'الحالة', 'STATUS')}</th>
              <th>{pick(locale, 'الإجمالي', 'TOTAL')}</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/${locale}/orders/${o.id}`}>
                    #{o.order_number}
                  </Link>
                </td>
                <td>
                  {new Date(o.created_at).toLocaleDateString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </td>
                <td>
                  <span className="status">{o.status}</span>
                </td>
                <td>{money(o.total_egp, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders?.length && (
          <p>{pick(locale, 'لا توجد طلبات بعد', 'No orders yet')}</p>
        )}
      </div>
      <div className="detail-actions">
        {page > 1 && (
          <Link
            className="button button-ghost"
            href={`/${locale}/account/orders?page=${page - 1}`}
          >
            {pick(locale, 'السابق', 'PREVIOUS')}
          </Link>
        )}
        {(count || 0) > page * pageSize && (
          <Link
            className="button button-ghost"
            href={`/${locale}/account/orders?page=${page + 1}`}
          >
            {pick(locale, 'التالي', 'NEXT')}
          </Link>
        )}
      </div>
    </div>
  );
}
