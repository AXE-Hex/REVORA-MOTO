import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { PrintInvoiceButton } from '@/components/print-invoice-button';

type InvoiceItem = {
  sku: string;
  name_ar: string;
  name_en: string;
  quantity: number;
  unit_price_egp: number;
  total_egp: number;
};
type InvoiceSnapshot = {
  brand: string;
  order_number: number;
  order_created_at: string;
  issued_at: string;
  customer: { name: string; address: Record<string, string> };
  items: InvoiceItem[];
  subtotal_egp: number;
  discount_egp: number;
  tax_egp: number;
  tax_rate_percent: number;
  shipping_egp: number;
  total_egp: number;
  payment?: { method: string; status: string };
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: invoice } = await db!
    .from('invoices')
    .select('invoice_number,snapshot')
    .eq('order_id', id)
    .maybeSingle();
  if (!invoice) notFound();
  const snapshot = invoice.snapshot as InvoiceSnapshot;
  const address = snapshot.customer?.address || {};
  return (
    <main className="shell section-small invoice-sheet">
      <div className="breadcrumbs print-hidden">
        <Link href={`/${locale}/account/orders`}>
          {pick(locale, 'الطلبات', 'ORDERS')}
        </Link>{' '}
        / {pick(locale, 'فاتورة', 'INVOICE')}
      </div>
      <div className="invoice-top">
        <div>
          <span className="section-index">REVORA MOTO</span>
          <h1 className="page-title">
            {pick(locale, 'فاتورة', 'INVOICE')} #{invoice.invoice_number}
          </h1>
        </div>
        <PrintInvoiceButton
          label={pick(locale, 'طباعة / حفظ PDF', 'PRINT / SAVE PDF')}
        />
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>{pick(locale, 'العميل', 'CUSTOMER')}</h2>
          <p>
            {snapshot.customer?.name || address.name}
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
          <h2>{pick(locale, 'تفاصيل الفاتورة', 'INVOICE DETAILS')}</h2>
          <p>
            {pick(locale, 'الطلب', 'Order')} #{snapshot.order_number}
            <br />
            {pick(locale, 'تاريخ الإصدار', 'Issued')}:{' '}
            {new Date(snapshot.issued_at).toLocaleDateString(locale)}
            <br />
            {pick(locale, 'طريقة الدفع', 'Payment method')}:{' '}
            {snapshot.payment?.method || '—'}
            <br />
            {pick(locale, 'العملة', 'Currency')}: EGP
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="compare-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>{pick(locale, 'المنتج', 'PRODUCT')}</th>
                <th>{pick(locale, 'الكمية', 'QTY')}</th>
                <th>{pick(locale, 'سعر الوحدة', 'UNIT PRICE')}</th>
                <th>{pick(locale, 'الإجمالي', 'TOTAL')}</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot.items || []).map((item, index) => (
                <tr key={`${item.sku}-${index}`}>
                  <td>{item.sku}</td>
                  <td>{pick(locale, item.name_ar, item.name_en)}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unit_price_egp, locale)}</td>
                  <td>{money(item.total_egp, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="spec-row">
          <span>{pick(locale, 'المجموع الفرعي', 'SUBTOTAL')}</span>
          <strong>{money(snapshot.subtotal_egp, locale)}</strong>
        </div>
        <div className="spec-row">
          <span>{pick(locale, 'الخصم', 'DISCOUNT')}</span>
          <strong>−{money(snapshot.discount_egp, locale)}</strong>
        </div>
        <div className="spec-row">
          <span>
            {pick(locale, 'الضريبة', 'TAX')} ({snapshot.tax_rate_percent || 0}%)
          </span>
          <strong>{money(snapshot.tax_egp, locale)}</strong>
        </div>
        <div className="spec-row">
          <span>{pick(locale, 'الشحن', 'SHIPPING')}</span>
          <strong>{money(snapshot.shipping_egp, locale)}</strong>
        </div>
        <div className="spec-row">
          <span>{pick(locale, 'الإجمالي', 'TOTAL')}</span>
          <strong>{money(snapshot.total_egp, locale)}</strong>
        </div>
      </section>
      <p className="invoice-note">
        {pick(
          locale,
          'هذه فاتورة متجر وليست فاتورة ضريبية إلكترونية رسمية.',
          'Store invoice. This is not an official electronic tax invoice.',
        )}
      </p>
    </main>
  );
}
