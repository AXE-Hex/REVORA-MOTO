import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
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
  searchParams: Promise<{ error?: string; updated?: string; page?: string }>;
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
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'orders.read',
  });
  if (!allowed) notFound();
  const {
    data: orders,
    error,
    count,
  } = await db!
    .from('orders')
    .select('id,order_number,status,total_egp,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
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
      <div className="compare-scroll">
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
                <td>{order.status}</td>
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
                          {nextStatus[order.status]}
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
      {!orders?.length && <p>{pick(locale, 'لا توجد طلبات', 'No orders')}</p>}
      <div className="detail-actions">
        {page > 1 && (
          <Link
            className="button button-ghost"
            href={`/${locale}/admin/orders?page=${page - 1}`}
          >
            {pick(locale, 'السابق', 'PREVIOUS')}
          </Link>
        )}
        {(count || 0) > page * pageSize && (
          <Link
            className="button button-ghost"
            href={`/${locale}/admin/orders?page=${page + 1}`}
          >
            {pick(locale, 'التالي', 'NEXT')}
          </Link>
        )}
      </div>
    </div>
  );
}
