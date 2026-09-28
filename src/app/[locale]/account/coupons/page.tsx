import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';

export default async function DiscountHistory({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/account/coupons`);
  const { data: orders } = await (await supabase())!
    .from('orders')
    .select('id,order_number,created_at,discount_egp,promotion_snapshot')
    .eq('user_id', user.id)
    .not('promotion_id', 'is', null)
    .order('created_at', { ascending: false });
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/account`}>ACCOUNT</Link> / DISCOUNTS
      </div>
      <h1 className="page-title">
        {pick(locale, 'سجل الخصومات', 'DISCOUNT HISTORY')}
      </h1>
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>{pick(locale, 'الطلب', 'ORDER')}</th>
              <th>{pick(locale, 'العرض', 'PROMOTION')}</th>
              <th>{pick(locale, 'التاريخ', 'DATE')}</th>
              <th>{pick(locale, 'الخصم', 'DISCOUNT')}</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/${locale}/orders/${order.id}`}>
                    #{order.order_number}
                  </Link>
                </td>
                <td>
                  {order.promotion_snapshot?.name || '—'}
                  {order.promotion_snapshot?.code && (
                    <small style={{ display: 'block' }}>
                      {order.promotion_snapshot.code}
                    </small>
                  )}
                </td>
                <td>
                  {new Date(order.created_at).toLocaleDateString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </td>
                <td>{money(order.discount_egp, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders?.length && (
          <p>
            {pick(locale, 'لم تستخدم أي عروض بعد.', 'No discounts used yet.')}
          </p>
        )}
      </div>
    </div>
  );
}
