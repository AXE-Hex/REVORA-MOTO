import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { StatusBadge, localizedStatus } from '@/components/ui/status-badge';
import { adminTransitionOrder } from '@/app/admin-actions';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';

const nextStatus: Record<string, string> = {
  pending_payment: 'cancelled',
  paid: 'processing',
  shipped: 'delivered',
};

export default async function AdminOrders({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
    updated?: string;
    page?: string;
    q?: string;
    status?: string;
    sort?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const query = await searchParams;
  const parsedPage = Number(query.page || '1');
  const page =
    Number.isInteger(parsedPage) && parsedPage >= 1 && parsedPage <= 10000
      ? parsedPage
      : 1;
  const pageSize = 50;
  const search = (query.q || '').trim().replace(/\D/g, '').slice(0, 18);
  const validStatuses = [
    'pending_payment',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'orders.read',
  });
  if (!allowed) notFound();
  let ordersQuery = db!
    .from('orders')
    .select('id,order_number,status,total_egp,created_at', { count: 'exact' });
  if (search) ordersQuery = ordersQuery.eq('order_number', Number(search));
  if (validStatuses.includes(query.status || ''))
    ordersQuery = ordersQuery.eq('status', query.status);
  if (query.sort === 'total_asc')
    ordersQuery = ordersQuery.order('total_egp', { ascending: true });
  else if (query.sort === 'total_desc')
    ordersQuery = ordersQuery.order('total_egp', { ascending: false });
  else ordersQuery = ordersQuery.order('created_at', { ascending: false });
  const {
    data: orders,
    error,
    count,
  } = await ordersQuery.range((page - 1) * pageSize, page * pageSize - 1);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (query.status) params.set('status', query.status);
    if (query.sort) params.set('sort', query.sort);
    params.set('page', String(nextPage));
    return `/${locale}/admin/orders?${params.toString()}`;
  };
  const { data: canWrite } = await db!.rpc('has_permission', {
    p_permission: 'orders.write',
  });
  const { data: canShip } = await db!.rpc('has_permission', {
    p_permission: 'fulfillment.write',
  });
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / ORDERS
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة الطلبات', 'ORDER OPERATIONS')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحديث الطلب', 'Order update failed')}
        </p>
      )}
      {query.updated && (
        <p className="notice">
          {pick(locale, 'تم تحديث الطلب', 'Order updated')}
        </p>
      )}
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل الطلبات', 'Could not load orders')}
        </p>
      )}
      <form className="admin-table-toolbar" action={`/${locale}/admin/orders`}>
        <label>
          <span>{pick(locale, 'رقم الطلب', 'Order number')}</span>
          <input
            className="input"
            name="q"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={18}
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
            {validStatuses.map((status) => (
              <option value={status} key={status}>
                {localizedStatus(status, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{pick(locale, 'ترتيب', 'Sort')}</span>
          <select
            className="input"
            name="sort"
            defaultValue={query.sort || 'newest'}
          >
            <option value="newest">{pick(locale, 'الأحدث', 'Newest')}</option>
            <option value="total_desc">
              {pick(locale, 'الأعلى قيمة', 'Highest total')}
            </option>
            <option value="total_asc">
              {pick(locale, 'الأقل قيمة', 'Lowest total')}
            </option>
          </select>
        </label>
        <button className="button button-primary" type="submit">
          {pick(locale, 'تطبيق', 'Apply')}
        </button>
        <Link className="button button-ghost" href={`/${locale}/admin/orders`}>
          {pick(locale, 'مسح', 'Clear')}
        </Link>
      </form>
      <div className="compare-scroll admin-order-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{pick(locale, 'التاريخ', 'DATE')}</th>
              <th>{pick(locale, 'الحالة', 'STATUS')}</th>
              <th>{pick(locale, 'الإجمالي', 'TOTAL')}</th>
              <th>{pick(locale, 'الإجراء', 'ACTION')}</th>
            </tr>
          </thead>
          <tbody>
            {(orders || []).map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/${locale}/admin/orders/${order.id}`}>
                    #{order.order_number}
                  </Link>
                </td>
                <td>{new Date(order.created_at).toLocaleDateString(locale)}</td>
                <td>
                  <StatusBadge status={order.status} locale={locale} />
                </td>
                <td>{money(order.total_egp, locale)}</td>
                <td>
                  {(canWrite || canShip) && order.status === 'processing' && (
                    <Link
                      className="button button-ghost"
                      href={`/${locale}/admin/orders/${order.id}`}
                    >
                      {pick(locale, 'تجهيز الشحنة', 'SHIP ORDER')}
                    </Link>
                  )}
                  {canWrite && nextStatus[order.status] && (
                    <form action={adminTransitionOrder}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={order.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={nextStatus[order.status]}
                      />
                      {order.status === 'pending_payment' ? (
                        <ConfirmSubmitButton
                          label={pick(locale, 'إلغاء الطلب', 'CANCEL ORDER')}
                          message={pick(
                            locale,
                            'هل تريد إلغاء الطلب وإتاحة المخزون المحجوز؟',
                            'Cancel this order and release its reserved stock?',
                          )}
                        />
                      ) : (
                        <button className="button button-ghost" type="submit">
                          {localizedStatus(nextStatus[order.status], locale)}
                        </button>
                      )}
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-order-mobile-list">
        {(orders || []).map((order) => (
          <article className="admin-order-mobile-card panel" key={order.id}>
            <header>
              <Link href={`/${locale}/admin/orders/${order.id}`}>
                #{order.order_number}
              </Link>
              <StatusBadge status={order.status} locale={locale} />
            </header>
            <div className="admin-order-mobile-meta">
              <span>
                {new Date(order.created_at).toLocaleDateString(locale)}
              </span>
              <strong>{money(order.total_egp, locale)}</strong>
            </div>
            <div className="admin-order-mobile-actions">
              {(canWrite || canShip) && order.status === 'processing' && (
                <Link
                  className="button button-secondary"
                  href={`/${locale}/admin/orders/${order.id}`}
                >
                  {pick(locale, 'تجهيز الشحنة', 'SHIP ORDER')}
                </Link>
              )}
              {canWrite && nextStatus[order.status] && (
                <form action={adminTransitionOrder}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={order.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={nextStatus[order.status]}
                  />
                  {order.status === 'pending_payment' ? (
                    <ConfirmSubmitButton
                      label={pick(locale, 'إلغاء الطلب', 'CANCEL ORDER')}
                      message={pick(
                        locale,
                        'هل تريد إلغاء الطلب وإتاحة المخزون المحجوز؟',
                        'Cancel this order and release its reserved stock?',
                      )}
                      className="button button-danger-soft"
                    />
                  ) : (
                    <button className="button button-ghost" type="submit">
                      {localizedStatus(nextStatus[order.status], locale)}
                    </button>
                  )}
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
      {!orders?.length && <p>{pick(locale, 'لا توجد طلبات', 'No orders')}</p>}
      <div className="detail-actions">
        {page > 1 && (
          <Link className="button button-ghost" href={pageHref(page - 1)}>
            {pick(locale, 'السابق', 'PREVIOUS')}
          </Link>
        )}
        {(count || 0) > page * pageSize && (
          <Link className="button button-ghost" href={pageHref(page + 1)}>
            {pick(locale, 'التالي', 'NEXT')}
          </Link>
        )}
      </div>
    </div>
  );
}
