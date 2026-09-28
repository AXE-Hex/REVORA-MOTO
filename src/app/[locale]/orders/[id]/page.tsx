import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { StatusBadge } from '@/components/ui/status-badge';
import { StartPayment } from '@/components/start-payment';
import { cancelOwnOrder } from '@/app/customer-order-actions';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { AccountFrame } from '@/components/account-frame';
import { formatDate } from '@/lib/format';
export default async function Order({
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
  const { data: order } = await db!
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) notFound();
  const query = await searchParams;
  const [
    { data: items, error: itemsError },
    { data: payments, error: paymentsError },
    { data: history, error: historyError },
    { data: shipment, error: shipmentError },
    { data: invoice, error: invoiceError },
  ] = await Promise.all([
    db!.from('order_items').select('*').eq('order_id', id),
    db!
      .from('payments')
      .select('id,provider,method,status,amount_egp')
      .eq('order_id', id),
    db!
      .from('order_history')
      .select('id,status,created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
    db!
      .from('order_shipments')
      .select('carrier,tracking_number,shipped_at,delivered_at')
      .eq('order_id', id)
      .maybeSingle(),
    db!
      .from('invoices')
      .select('id,invoice_number')
      .eq('order_id', id)
      .maybeSingle(),
  ]);
  return (
    <AccountFrame locale={locale}>
      <section className="account-detail-page">
        <div className="breadcrumbs">
          <Link href={`/${locale}/account/orders`}>
            {pick(locale, 'طلباتي', 'My orders')}
          </Link>{' '}
          / #{order.order_number}
        </div>
        <h1 className="page-title">
          {pick(locale, 'الطلب', 'ORDER')} #{order.order_number}
        </h1>
        {query.error && (
          <p className="notice error">
            {pick(locale, 'تعذر إلغاء الطلب', 'Could not cancel order')}
          </p>
        )}
        {query.updated && (
          <p className="notice">
            {pick(locale, 'تم إلغاء الطلب', 'Order cancelled')}
          </p>
        )}
        {[
          itemsError,
          paymentsError,
          historyError,
          shipmentError,
          invoiceError,
        ].some(Boolean) && (
          <p className="notice error">
            {pick(
              locale,
              'تعذر تحميل بعض تفاصيل الطلب',
              'Some order details could not load',
            )}
          </p>
        )}
        <div className="account-order-detail-grid">
          <div className="panel">
            <h2>{pick(locale, 'المنتجات', 'ITEMS')}</h2>
            <div className="account-order-line-list">
              {items?.map((i) => (
                <article className="account-order-line" key={i.id}>
                  <div>
                    <strong>
                      {pick(locale, i.name_ar_snapshot, i.name_en_snapshot)}
                    </strong>
                    <small>{i.sku_snapshot}</small>
                    {i.variant_snapshot &&
                      Object.keys(i.variant_snapshot).length > 0 && (
                        <small>
                          {Object.values(
                            i.variant_snapshot as Record<string, string>,
                          ).join(' / ')}
                        </small>
                      )}
                  </div>
                  <span>
                    {pick(locale, `الكمية ${i.quantity}`, `Qty ${i.quantity}`)}
                  </span>
                  <strong>{money(i.total_egp, locale)}</strong>
                </article>
              ))}
            </div>
            <div className="spec-row">
              <span>{pick(locale, 'المجموع الفرعي', 'SUBTOTAL')}</span>
              <strong>{money(order.subtotal_egp, locale)}</strong>
            </div>
            {Number(order.discount_egp) > 0 && (
              <>
                <div className="spec-row">
                  <span>
                    {pick(locale, 'الخصم', 'DISCOUNT')}
                    {order.promotion_snapshot?.code
                      ? ` (${order.promotion_snapshot.code})`
                      : ''}
                  </span>
                  <strong>−{money(order.discount_egp, locale)}</strong>
                </div>
              </>
            )}
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
          </div>
          <div className="panel">
            <h2>{pick(locale, 'الحالة', 'STATUS')}</h2>
            <StatusBadge status={order.status} locale={locale} />
            {shipment && (
              <div className="notice">
                <strong>{pick(locale, 'التتبع', 'TRACKING')}</strong>
                <br />
                {shipment.carrier} / {shipment.tracking_number}
                <br />
                {pick(locale, 'تاريخ الشحن', 'Shipped')}:{' '}
                {shipment.shipped_at && formatDate(shipment.shipped_at, locale)}
                {shipment.delivered_at && (
                  <>
                    <br />
                    {pick(locale, 'تاريخ التسليم', 'Delivered')}:{' '}
                    {formatDate(shipment.delivered_at, locale)}
                  </>
                )}
              </div>
            )}
            {invoice && (
              <p>
                <Link
                  className="button button-ghost"
                  href={`/${locale}/invoices/${id}`}
                >
                  {pick(locale, 'عرض الفاتورة', 'VIEW INVOICE')} #
                  {invoice.invoice_number}
                </Link>
              </p>
            )}
            <p>
              {pick(locale, 'الدفع', 'PAYMENT')}:{' '}
              <StatusBadge
                status={payments?.[0]?.status || 'pending'}
                locale={locale}
              />
            </p>
            <p>
              {pick(locale, 'الطريقة', 'METHOD')}: {payments?.[0]?.method}
            </p>
            {payments?.[0]?.status === 'pending' && (
              <div className="notice">
                {pick(
                  locale,
                  'لم يتم تأكيد الدفع حتى يتحقق مزود الدفع من العملية.',
                  'Payment is not confirmed until provider verification completes.',
                )}
              </div>
            )}
            {order.status === 'pending_payment' &&
              payments?.[0]?.status !== 'captured' && (
                <form action={cancelOwnOrder}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={id} />
                  <ConfirmSubmitButton
                    label={pick(locale, 'إلغاء الطلب', 'CANCEL ORDER')}
                    message={pick(
                      locale,
                      'هل تريد إلغاء الطلب وإتاحة المخزون المحجوز؟',
                      'Cancel this order and release its reserved stock?',
                    )}
                  />
                </form>
              )}
            {payments?.[0]?.status === 'pending' && (
              <div style={{ marginTop: 16 }}>
                <StartPayment id={payments[0].id} locale={locale} />
              </div>
            )}
            <h3>{pick(locale, 'سجل الطلب', 'ORDER HISTORY')}</h3>
            {history?.map((entry) => (
              <div className="spec-row" key={entry.id}>
                <StatusBadge status={entry.status} locale={locale} />
                <small>{formatDate(entry.created_at, locale)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AccountFrame>
  );
}
