import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/format';
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
    <section className="account-orders-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'مشترياتي', 'PURCHASES')}
        </span>
        <h2 className="page-title">{pick(locale, 'طلباتي', 'My orders')}</h2>
      </div>
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل الطلبات', 'Could not load orders')}
        </p>
      )}
      <div className="account-order-list">
        {orders?.map((order) => (
          <article className="account-order-card panel" key={order.id}>
            <div className="account-order-card-main">
              <span className="section-index">
                {pick(locale, 'رقم الطلب', 'ORDER')}
              </span>
              <Link
                className="account-order-number"
                href={`/${locale}/orders/${order.id}`}
              >
                #{order.order_number}
              </Link>
              <time dateTime={order.created_at}>
                {formatDate(order.created_at, locale)}
              </time>
            </div>
            <div className="account-order-card-meta">
              <StatusBadge status={order.status} locale={locale} />
              <strong>{money(order.total_egp, locale)}</strong>
            </div>
            <Link
              className="button button-secondary account-order-open"
              href={`/${locale}/orders/${order.id}`}
            >
              {pick(locale, 'تفاصيل الطلب', 'View order')}
            </Link>
          </article>
        ))}
      </div>
      {!error && !orders?.length && (
        <div className="panel account-empty-state">
          <h3>{pick(locale, 'لا توجد طلبات بعد', 'No orders yet')}</h3>
          <p className="muted">
            {pick(
              locale,
              'ستظهر طلباتك هنا بعد إتمام أول عملية شراء.',
              'Your orders will appear here after your first purchase.',
            )}
          </p>
          <Link className="button button-primary" href={`/${locale}/shop`}>
            {pick(locale, 'استكشف المنتجات', 'Explore products')}
          </Link>
        </div>
      )}
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
    </section>
  );
}
