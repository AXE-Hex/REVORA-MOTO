import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminShipOrder, adminTransitionOrder } from '@/app/admin-actions';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';

export default async function AdminOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !(await currentUser())) notFound();
  const db = await supabase();
  const { data: canRead } = await db!.rpc('has_permission', {
    p_permission: 'orders.read',
  });
  if (!canRead) notFound();
  const [
    orderResult,
    itemsResult,
    paymentsResult,
    shipmentResult,
    historyResult,
    invoiceResult,
    writeResult,
    shipResult,
  ] = await Promise.all([
    db!.from('orders').select('*').eq('id', id).maybeSingle(),
    db!
      .from('order_items')
      .select(
        'id,sku_snapshot,name_ar_snapshot,name_en_snapshot,quantity,unit_price_egp,total_egp,variant_snapshot',
      )
      .eq('order_id', id),
    db!
      .from('payments')
      .select('id,status,provider,method,amount_egp,provider_reference')
      .eq('order_id', id),
    db!
      .from('order_shipments')
      .select('carrier,tracking_number,shipped_at,delivered_at')
      .eq('order_id', id)
      .maybeSingle(),
    db!
      .from('order_history')
      .select('id,status,created_at,detail')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
    db!
      .from('invoices')
      .select('id,invoice_number')
      .eq('order_id', id)
      .maybeSingle(),
    db!.rpc('has_permission', { p_permission: 'orders.write' }),
    db!.rpc('has_permission', { p_permission: 'fulfillment.write' }),
  ]);
  const order = orderResult.data;
  if (!order) notFound();
  const address = order.address_snapshot as Record<string, string>;
  const query = await searchParams;
  const loadError = [
    itemsResult,
    paymentsResult,
    shipmentResult,
    historyResult,
    invoiceResult,
  ].some((result) => result.error);
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin/orders`}>ORDERS</Link> / #
        {order.order_number}
      </div>
      <h1 className="page-title">
        {pick(locale, 'الطلب', 'ORDER')} #{order.order_number}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر تنفيذ الإجراء', 'Action failed')}
        </p>
      )}
      {query.updated && (
        <p className="notice">
          {pick(locale, 'تم تحديث الطلب', 'Order updated')}
        </p>
      )}
      {loadError && (
        <p className="notice error">
          {pick(
            locale,
            'تعذر تحميل بعض تفاصيل الطلب',
            'Some order details could not load',
          )}
        </p>
      )}
      <div className="two-column">
        <section className="panel">
          <h2>{pick(locale, 'المنتجات', 'ITEMS')}</h2>
          <div className="compare-scroll admin-order-items-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>{pick(locale, 'المنتج', 'PRODUCT')}</th>
                  <th>{pick(locale, 'الكمية', 'QTY')}</th>
                  <th>{pick(locale, 'السعر', 'PRICE')}</th>
                </tr>
              </thead>
              <tbody>
                {(itemsResult.data || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.sku_snapshot}</td>
                    <td>
                      {pick(
                        locale,
                        item.name_ar_snapshot,
                        item.name_en_snapshot,
                      )}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{money(item.total_egp, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-order-items-mobile-cards">
            {(itemsResult.data || []).map((item) => (
              <article
                className="admin-mobile-data-card"
                key={`order-mobile-${item.id}`}
              >
                <h3>
                  {pick(locale, item.name_ar_snapshot, item.name_en_snapshot)}
                </h3>
                <dl>
                  <div>
                    <dt>SKU</dt>
                    <dd dir="ltr">{item.sku_snapshot}</dd>
                  </div>
                  <div>
                    <dt>{pick(locale, 'الكمية', 'Quantity')}</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  <div>
                    <dt>{pick(locale, 'السعر', 'Price')}</dt>
                    <dd>{money(item.total_egp, locale)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'المجموع الفرعي', 'SUBTOTAL')}</span>
            <strong>{money(order.subtotal_egp, locale)}</strong>
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'الخصم', 'DISCOUNT')}</span>
            <strong>−{money(order.discount_egp, locale)}</strong>
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'الضريبة', 'TAX')}</span>
            <strong>{money(order.tax_egp, locale)}</strong>
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'الشحن', 'SHIPPING')}</span>
            <strong>{money(order.shipping_egp, locale)}</strong>
          </div>
          <div className="spec-row">
            <span>{pick(locale, 'الإجمالي', 'TOTAL')}</span>
            <strong>{money(order.total_egp, locale)}</strong>
          </div>
          <h3>{pick(locale, 'عنوان التسليم', 'DELIVERY ADDRESS')}</h3>
          <p>
            {address.name}
            <br />
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}
            <br />
            {address.city}, {address.governorate}
            <br />
            {address.phone}
          </p>
        </section>
        <section className="panel">
          <h2>{pick(locale, 'حالة الطلب', 'ORDER STATUS')}</h2>
          <StatusBadge status={order.status} locale={locale} />
          <div className="payment-status-list">
            <span>{pick(locale, 'الدفع', 'PAYMENT')}:</span>
            {paymentsResult.data?.length ? (
              paymentsResult.data.map((payment) => (
                <span key={payment.id}>
                  {payment.method === 'instapay'
                    ? 'InstaPay'
                    : locale === 'ar'
                      ? 'بطاقة'
                      : 'Card'}{' '}
                  <StatusBadge status={payment.status} locale={locale} />
                </span>
              ))
            ) : (
              <span>—</span>
            )}
          </div>
          {invoiceResult.data && (
            <p>
              <Link
                className="button button-ghost"
                href={`/${locale}/invoices/${id}`}
              >
                {pick(locale, 'عرض الفاتورة', 'VIEW INVOICE')} #
                {invoiceResult.data.invoice_number}
              </Link>
            </p>
          )}
          {shipmentResult.data && (
            <div className="notice">
              <strong>{pick(locale, 'الشحنة', 'SHIPMENT')}</strong>
              <br />
              {shipmentResult.data.carrier} /{' '}
              {shipmentResult.data.tracking_number}
              <br />
              {new Date(shipmentResult.data.shipped_at).toLocaleString(locale)}
            </div>
          )}
          {(writeResult.data || shipResult.data) &&
            order.status === 'processing' &&
            !shipmentResult.data && (
              <form className="form-stack" action={adminShipOrder}>
                <h3>{pick(locale, 'تسجيل الشحنة', 'RECORD SHIPMENT')}</h3>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={id} />
                <label className="field-label">
                  {pick(locale, 'شركة الشحن', 'CARRIER')}
                  <input
                    className="input"
                    name="carrier"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>
                <label className="field-label">
                  {pick(locale, 'رقم التتبع', 'TRACKING NUMBER')}
                  <input
                    className="input"
                    name="tracking"
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </label>
                <button className="button button-accent" type="submit">
                  {pick(locale, 'تأكيد الشحن', 'CONFIRM SHIPMENT')}
                </button>
              </form>
            )}
          {writeResult.data &&
            (order.status === 'paid' ||
              order.status === 'shipped' ||
              order.status === 'pending_payment') && (
              <form action={adminTransitionOrder}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={id} />
                <input
                  type="hidden"
                  name="status"
                  value={
                    order.status === 'paid'
                      ? 'processing'
                      : order.status === 'shipped'
                        ? 'delivered'
                        : 'cancelled'
                  }
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
                    {order.status === 'paid'
                      ? pick(locale, 'بدء التجهيز', 'START PROCESSING')
                      : order.status === 'shipped'
                        ? pick(locale, 'تأكيد التسليم', 'MARK DELIVERED')
                        : pick(locale, 'إلغاء الطلب', 'CANCEL ORDER')}
                  </button>
                )}
              </form>
            )}
          <h3>{pick(locale, 'سجل الطلب', 'ORDER HISTORY')}</h3>
          {(historyResult.data || []).map((entry) => (
            <div className="spec-row" key={entry.id}>
              <StatusBadge status={entry.status} locale={locale} />
              <small>{new Date(entry.created_at).toLocaleString(locale)}</small>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
