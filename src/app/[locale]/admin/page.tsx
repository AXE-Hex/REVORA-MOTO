import { AdminAnalyticsCharts } from '@/components/admin-analytics-charts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, currentUser } from '@/lib/supabase/server';
import { isLocale, money, pick } from '@/lib/i18n';
import { adminAreas as areas } from '@/lib/admin-navigation';
import { localizedAuditAction, localizedAuditEntity } from '@/lib/admin-format';

type Report = {
  revenue_egp: number;
  paid_orders: number;
  all_orders: number;
  reservations: number;
  customers: number;
  pending_returns: number;
  low_stock_products: number;
  best_selling_products: {
    product_id: string;
    name_en: string;
    name_ar?: string;
    units: number;
  }[];
};
type Audit = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};

export default async function Admin({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) notFound();
  const db = await supabase();
  if (!db) notFound();
  const permissions = [...new Set(areas.map((area) => area[3]))];
  const checks = await Promise.all(
    permissions.map(async (permission) => {
      const { data, error } = await db.rpc('has_permission', {
        p_permission: permission,
      });
      return [permission, !error && Boolean(data)] as const;
    }),
  );
  const granted = new Set(
    checks.filter(([, allowed]) => allowed).map(([permission]) => permission),
  );
  if (!granted.size) notFound();

  const { data: canReadPayments } = await db.rpc('has_permission', {
    p_permission: 'payments.read',
  });
  const [
    reportResult,
    pendingOrdersResult,
    pendingReservationsResult,
    productCountResult,
    motorcycleCountResult,
    missingImagesResult,
    failedPaymentsResult,
    warrantyClaimsResult,
    auditResult,
  ] = await Promise.all([
    granted.has('reports.read')
      ? db.rpc('admin_report')
      : Promise.resolve({ data: null, error: null }),
    granted.has('orders.read')
      ? db
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_payment')
      : Promise.resolve({ count: null, error: null }),
    granted.has('reservations.read')
      ? db
          .from('motorcycle_reservations')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'awaiting_payment'])
      : Promise.resolve({ count: null, error: null }),
    granted.has('catalog.write')
      ? db.from('products').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null, error: null }),
    granted.has('motorcycles.write')
      ? db.from('motorcycles').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null, error: null }),
    granted.has('catalog.write')
      ? db
          .from('products')
          .select('id', { count: 'exact', head: true })
          .is('image_url', null)
          .neq('status', 'archived')
      : Promise.resolve({ count: null, error: null }),
    canReadPayments
      ? db
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
      : Promise.resolve({ count: null, error: null }),
    granted.has('orders.read')
      ? db
          .from('warranty_claims')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '(completed,rejected)')
      : Promise.resolve({ count: null, error: null }),
    granted.has('audit.read')
      ? db
          .from('audit_logs')
          .select('id,actor_id,action,entity,entity_id,created_at')
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: null, error: null }),
  ]);
  const report = reportResult.data as Report | null;
  const operationalDataError = [
    pendingOrdersResult.error,
    pendingReservationsResult.error,
    productCountResult.error,
    motorcycleCountResult.error,
    missingImagesResult.error,
    failedPaymentsResult.error,
    warrantyClaimsResult.error,
  ].some(Boolean);
  const audit = (auditResult.data || []) as Audit[];
  const { data: localizedProducts } = report?.best_selling_products?.length
    ? await db
        .from('products')
        .select('id,name_ar,name_en')
        .in(
          'id',
          report.best_selling_products.map((product) => product.product_id),
        )
    : { data: [] };
  const localizedProductNames = new Map(
    (localizedProducts || []).map((product) => [
      product.id,
      pick(locale, product.name_ar, product.name_en),
    ]),
  );
  const metricItems: [string, string, boolean][] = [
    [
      pick(locale, 'إيرادات مؤكدة', 'Captured revenue'),
      report ? money(report.revenue_egp, locale) : '—',
      Boolean(report),
    ],
    [
      pick(locale, 'الطلبات', 'Orders'),
      report ? String(report.all_orders) : '—',
      Boolean(report),
    ],
    [
      pick(locale, 'مدفوعة', 'Paid'),
      report ? String(report.paid_orders) : '—',
      Boolean(report),
    ],
    [
      pick(locale, 'العملاء', 'Customers'),
      report ? String(report.customers) : '—',
      Boolean(report),
    ],
    [
      pick(locale, 'الحجوزات', 'Reservations'),
      report ? String(report.reservations) : '—',
      Boolean(report),
    ],
    [
      pick(locale, 'المنتجات', 'Products'),
      productCountResult.count == null ? '—' : String(productCountResult.count),
      granted.has('catalog.write'),
    ],
    [
      pick(locale, 'الدراجات', 'Motorcycles'),
      motorcycleCountResult.count == null
        ? '—'
        : String(motorcycleCountResult.count),
      granted.has('motorcycles.write'),
    ],
    [
      pick(locale, 'مخزون منخفض', 'Low stock'),
      report ? String(report.low_stock_products) : '—',
      Boolean(report),
    ],
  ]
    .filter((item) => item[2])
    .map(([label, value]) => [label as string, value as string, true]);
  const attention: {
    label: string;
    count: number | null;
    href: string;
    visible: boolean;
  }[] = [
    {
      label: pick(locale, 'طلبات بانتظار الدفع', 'Orders awaiting payment'),
      count: pendingOrdersResult.count,
      href: `/${locale}/admin/orders?status=pending_payment`,
      visible: granted.has('orders.read'),
    },
    {
      label: pick(
        locale,
        'حجوزات تحتاج متابعة',
        'Reservations needing follow-up',
      ),
      count: pendingReservationsResult.count,
      href: `/${locale}/admin/reservations`,
      visible: granted.has('reservations.read'),
    },
    {
      label: pick(locale, 'مرتجعات مفتوحة', 'Open returns'),
      count: report?.pending_returns ?? null,
      href: `/${locale}/admin/returns`,
      visible: granted.has('orders.read') && Boolean(report),
    },
    {
      label: pick(locale, 'منتجات دون صور', 'Products missing images'),
      count: missingImagesResult.count,
      href: `/${locale}/admin/products?image=missing`,
      visible: granted.has('catalog.write'),
    },
    {
      label: pick(locale, 'مدفوعات فاشلة', 'Failed payments'),
      count: failedPaymentsResult.count,
      href: `/${locale}/admin/orders`,
      visible: Boolean(canReadPayments),
    },
    {
      label: pick(locale, 'مطالبات ضمان مفتوحة', 'Open warranty claims'),
      count: warrantyClaimsResult.count,
      href: `/${locale}/admin/warranties`,
      visible: granted.has('orders.read'),
    },
    {
      label: pick(locale, 'مخزون منخفض', 'Low stock'),
      count: report?.low_stock_products ?? null,
      href: `/${locale}/admin/inventory`,
      visible: granted.has('inventory.write') && Boolean(report),
    },
  ].filter((item) => item.visible && item.count !== null && item.count > 0);
  const top = report?.best_selling_products || [];
  const maxUnits = Math.max(1, ...top.map((item) => item.units));
  return (
    <div className="shell section-small admin-dashboard">
      <span className="section-index">REVORA / OPERATIONS</span>
      <h1 className="page-title">
        {pick(locale, 'لوحة التشغيل', 'OPERATIONS DASHBOARD')}
      </h1>
      {operationalDataError && (
        <p className="notice error" role="alert">
          {pick(
            locale,
            'تعذر تحميل بعض تنبيهات التشغيل.',
            'Some operational alerts could not be loaded.',
          )}
        </p>
      )}
      {granted.has('reports.read') &&
        (report ? (
          <div
            className="admin-grid"
            aria-label={pick(locale, 'مؤشرات المتجر', 'Store metrics')}
          >
            {metricItems.map(([label, value]) => (
              <div className="metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="notice error" role="alert">
            {pick(
              locale,
              'تعذر تحميل مؤشرات التقارير.',
              'Could not load report metrics.',
            )}
          </p>
        ))}

      {granted.has('reports.read') && <AdminAnalyticsCharts locale={locale} />}

      <div className="admin-dashboard-columns">
        {(granted.has('reports.read') || granted.has('inventory.write')) && (
          <section
            className="panel admin-dashboard-chart"
            aria-labelledby="admin-dashboard-chart-title"
          >
            <h2 id="admin-dashboard-chart-title">
              {pick(locale, 'الأكثر مبيعاً', 'TOP SELLING PRODUCTS')}
            </h2>
            {!top.length ? (
              <p>
                {pick(
                  locale,
                  'لا توجد مبيعات مؤكدة حتى الآن.',
                  'No captured sales yet.',
                )}
              </p>
            ) : (
              <ol className="admin-chart-list">
                {top.slice(0, 6).map((item) => (
                  <li key={item.product_id}>
                    <span dir="auto">
                      {localizedProductNames.get(item.product_id) ||
                        item.name_en}
                    </span>
                    <span className="admin-chart-track" aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.max(4, (item.units / maxUnits) * 100)}%`,
                        }}
                      />
                    </span>
                    <strong
                      aria-label={`${item.units} ${pick(locale, 'وحدة', 'units')}`}
                    >
                      {item.units}
                    </strong>
                  </li>
                ))}
              </ol>
            )}
            <p className="admin-data-caption">
              {pick(
                locale,
                'إجمالي الوحدات المباعة في تقرير المتجر المتاح.',
                'Units sold in the available store report.',
              )}
            </p>
          </section>
        )}
        {report && granted.has('reports.read') && (
          <section
            className="panel admin-status-chart"
            aria-labelledby="admin-status-chart-title"
          >
            <h2 id="admin-status-chart-title">
              {pick(locale, 'حالة الطلبات', 'ORDER STATUS')}
            </h2>
            <ul className="admin-chart-list">
              {[
                [pick(locale, 'مدفوعة', 'Paid'), report.paid_orders],
                [
                  pick(locale, 'غير مدفوعة', 'Other statuses'),
                  Math.max(0, report.all_orders - report.paid_orders),
                ],
              ].map(([label, count]) => (
                <li key={label}>
                  <span>{label}</span>
                  <span className="admin-chart-track" aria-hidden="true">
                    <i
                      style={{
                        width: `${report.all_orders ? Math.max(4, (Number(count) / report.all_orders) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
            <p className="admin-data-caption">
              {pick(
                locale,
                'تقسيم إجمالي الطلبات حسب حالة تحصيل الدفع المتاحة.',
                'Split of total orders by available captured-payment aggregate.',
              )}
            </p>
          </section>
        )}
        <section
          className="panel admin-attention"
          aria-labelledby="admin-attention-title"
        >
          <h2 id="admin-attention-title">
            {pick(locale, 'يتطلب الانتباه', 'NEEDS ATTENTION')}
          </h2>
          {attention.length ? (
            <ul>
              {attention.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {pick(
                locale,
                'لا توجد عناصر تشغيلية تحتاج إجراءً الآن.',
                'No operational items need attention right now.',
              )}
            </p>
          )}
        </section>
      </div>
      {granted.has('audit.read') && auditResult.error && (
        <p className="notice error" role="alert">
          {pick(
            locale,
            'تعذر تحميل النشاط الأخير.',
            'Could not load recent activity.',
          )}
        </p>
      )}
      {granted.has('audit.read') && (
        <section
          className="panel admin-recent-activity"
          aria-labelledby="admin-recent-title"
        >
          <div className="admin-table-heading">
            <h2 id="admin-recent-title">
              {pick(locale, 'النشاط الأخير', 'RECENT ACTIVITY')}
            </h2>
            <Link href={`/${locale}/admin/audit`}>
              {pick(locale, 'عرض السجل', 'View audit log')}
            </Link>
          </div>
          {!audit.length ? (
            <p>
              {pick(
                locale,
                'لا توجد أحداث مسجلة.',
                'No recorded activity yet.',
              )}
            </p>
          ) : (
            <ul>
              {audit.map((event) => (
                <li key={event.id}>
                  <span className="admin-activity-actor" dir="ltr">
                    {event.actor_id
                      ? `${event.actor_id.slice(0, 8)}…`
                      : pick(locale, 'النظام', 'System')}
                  </span>
                  <span>
                    <strong dir="auto">
                      {localizedAuditAction(locale, event.action)}
                    </strong>
                    <small dir="auto">
                      {localizedAuditEntity(locale, event.entity)}
                      {event.entity_id
                        ? ` · ${event.entity_id.slice(0, 8)}`
                        : ''}
                    </small>
                  </span>
                  <time dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleString(
                      locale === 'ar' ? 'ar-EG' : 'en-GB',
                    )}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section
        className="admin-dashboard-navigation"
        aria-labelledby="admin-links-title"
      >
        <h2 id="admin-links-title">
          {pick(locale, 'إدارة المتجر', 'STORE MANAGEMENT')}
        </h2>
        <div className="card-grid">
          {areas
            .filter((area) => granted.has(area[3]))
            .map(([slug, en, ar]) => (
              <Link
                href={`/${locale}/admin/${slug}`}
                className="panel"
                key={slug}
              >
                <h3>{pick(locale, ar, en)} ↗</h3>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
