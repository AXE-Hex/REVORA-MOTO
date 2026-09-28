import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';

type Report = {
  revenue_egp: number;
  paid_orders: number;
  all_orders: number;
  average_order_egp: number;
  reservations: number;
  captured_deposits_egp: number;
  customers: number;
  customers_last_30_days: number;
  pending_returns: number;
  refund_requests: number;
  provider_required_refunds: number;
  low_stock_products: number;
  inventory_on_hand: number;
  inventory_reserved: number;
  inventory_incoming: number;
  best_selling_products: {
    product_id: string;
    name_en: string;
    units: number;
  }[];
  best_categories: { id: string; name_en: string; units: number }[];
  popular_motorcycles: { id: string; name_en: string; reservations: number }[];
};

export default async function AdminReports({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data, error } = await db!.rpc('admin_report');
  if (error || !data) notFound();
  const report = data as Report;
  const metrics: [string, string][] = [
    [
      pick(locale, 'إيرادات الطلبات المؤكدة', 'CAPTURED ORDER REVENUE'),
      money(report.revenue_egp, locale),
    ],
    [
      pick(locale, 'الطلبات المدفوعة', 'PAID ORDERS'),
      String(report.paid_orders),
    ],
    [pick(locale, 'جميع الطلبات', 'ALL ORDERS'), String(report.all_orders)],
    [
      pick(locale, 'متوسط الطلب', 'AVERAGE ORDER'),
      money(report.average_order_egp, locale),
    ],
    [pick(locale, 'الحجوزات', 'RESERVATIONS'), String(report.reservations)],
    [
      pick(locale, 'عربون محصل', 'CAPTURED DEPOSITS'),
      money(report.captured_deposits_egp, locale),
    ],
    [pick(locale, 'العملاء', 'CUSTOMERS'), String(report.customers)],
    [
      pick(locale, 'عملاء آخر 30 يوماً', 'NEW CUSTOMERS / 30 DAYS'),
      String(report.customers_last_30_days),
    ],
    [
      pick(locale, 'مرتجعات جارية', 'OPEN RETURNS'),
      String(report.pending_returns),
    ],
    [
      pick(locale, 'منتجات منخفضة المخزون', 'LOW STOCK PRODUCTS'),
      String(report.low_stock_products),
    ],
    [
      pick(locale, 'طلبات الاسترداد', 'REFUND REQUESTS'),
      String(report.refund_requests),
    ],
    [
      pick(locale, 'استرداد ينتظر مزوداً', 'PROVIDER REQUIRED REFUNDS'),
      String(report.provider_required_refunds),
    ],
    [
      pick(locale, 'المخزون الفعلي', 'INVENTORY ON HAND'),
      String(report.inventory_on_hand),
    ],
    [
      pick(locale, 'المخزون المحجوز', 'INVENTORY RESERVED'),
      String(report.inventory_reserved),
    ],
    [
      pick(locale, 'المخزون القادم', 'INVENTORY INCOMING'),
      String(report.inventory_incoming),
    ],
  ];
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / REPORTS
      </div>
      <h1 className="page-title">
        {pick(locale, 'تقارير المتجر', 'STORE REPORTS')}
      </h1>
      <div className="admin-grid">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel" style={{ marginTop: 28 }}>
        <h2>
          {pick(locale, 'المنتجات الأكثر مبيعاً', 'BEST SELLING PRODUCTS')}
        </h2>
        {(report.best_selling_products || []).map((item) => (
          <div className="spec-row" key={item.product_id}>
            <span>{item.name_en}</span>
            <strong>{item.units}</strong>
          </div>
        ))}
        {!report.best_selling_products?.length && (
          <p>{pick(locale, 'لا توجد مبيعات مؤكدة', 'No captured sales yet')}</p>
        )}
      </div>
      <div className="two-column" style={{ marginTop: 16 }}>
        <div className="panel">
          <h2>{pick(locale, 'الفئات الأكثر مبيعاً', 'BEST CATEGORIES')}</h2>
          {(report.best_categories || []).map((item) => (
            <div className="spec-row" key={item.id}>
              <span>{item.name_en}</span>
              <strong>{item.units}</strong>
            </div>
          ))}
          {!report.best_categories?.length && (
            <p>
              {pick(locale, 'لا توجد مبيعات مؤكدة', 'No captured sales yet')}
            </p>
          )}
        </div>
        <div className="panel">
          <h2>
            {pick(locale, 'الدراجات الأكثر طلباً', 'POPULAR MOTORCYCLES')}
          </h2>
          {(report.popular_motorcycles || []).map((item) => (
            <div className="spec-row" key={item.id}>
              <span>{item.name_en}</span>
              <strong>{item.reservations}</strong>
            </div>
          ))}
          {!report.popular_motorcycles?.length && (
            <p>{pick(locale, 'لا توجد حجوزات', 'No reservations yet')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
