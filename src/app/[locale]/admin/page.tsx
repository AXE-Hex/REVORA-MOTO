import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, currentUser } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
const areas = [
  ['products', 'Products', 'المنتجات', 'catalog.write'],
  ['categories', 'Categories', 'الفئات', 'catalog.write'],
  ['brands', 'Brands', 'العلامات', 'catalog.write'],
  ['motorcycles', 'Motorcycles', 'الدراجات', 'motorcycles.write'],
  ['fitment', 'Fitment', 'التوافق', 'catalog.write'],
  ['branches', 'Branches', 'الفروع', 'motorcycles.write'],
  ['orders', 'Orders', 'الطلبات', 'orders.read'],
  ['reservations', 'Reservations', 'الحجوزات', 'reservations.read'],
  ['customers', 'Customers', 'العملاء', 'customers.read'],
  ['inventory', 'Inventory', 'المخزون', 'inventory.write'],
  ['suppliers', 'Suppliers', 'الموردون', 'inventory.write'],
  ['reviews', 'Reviews', 'التقييمات', 'content.write'],
  ['audit', 'Audit Logs', 'سجل التدقيق', 'audit.read'],
  ['promotions', 'Promotions', 'العروض', 'catalog.write'],
  ['returns', 'Returns', 'المرتجعات', 'orders.read'],
  ['warranties', 'Warranties', 'الضمانات', 'orders.read'],
  ['staff', 'Staff & Roles', 'الموظفون والصلاحيات', 'staff.write'],
  ['settings', 'Site Settings', 'إعدادات الموقع', 'settings.write'],
  ['reports', 'Reports', 'التقارير', 'reports.read'],
] as const;
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
  const permissions = [...new Set(areas.map((area) => area[3]))];
  const checks = await Promise.all(
    permissions.map(async (permission) => {
      const { data } = await db!.rpc('has_permission', {
        p_permission: permission,
      });
      return [permission, Boolean(data)] as const;
    }),
  );
  const granted = new Set(
    checks.filter(([, allowed]) => allowed).map(([permission]) => permission),
  );
  if (!granted.size) notFound();
  const { data: report } = granted.has('reports.read')
    ? await db!.rpc('admin_report')
    : { data: null };
  const metrics = [
    [
      pick(locale, 'جميع الطلبات', 'ALL ORDERS'),
      String(report?.all_orders ?? 0),
    ],
    [
      pick(locale, 'الطلبات المدفوعة', 'PAID ORDERS'),
      String(report?.paid_orders ?? 0),
    ],
    [
      pick(locale, 'الحجوزات', 'RESERVATIONS'),
      String(report?.reservations ?? 0),
    ],
    [pick(locale, 'العملاء', 'CUSTOMERS'), String(report?.customers ?? 0)],
  ];
  return (
    <div className="shell section-small">
      <span className="section-index">REVORA / OPERATIONS</span>
      <h1 className="page-title">
        {pick(locale, 'لوحة التحكم', 'ADMIN DASHBOARD')}
      </h1>
      {granted.has('reports.read') && (
        <div className="admin-grid">
          {metrics.map(([label, value]) => (
            <div className="metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="card-grid" style={{ marginTop: 30 }}>
        {areas
          .filter((area) => granted.has(area[3]))
          .map(([slug, en, ar]) => (
            <Link
              href={`/${locale}/admin/${slug}`}
              className="panel"
              key={slug}
            >
              <h2>{pick(locale, ar, en)} ↗</h2>
            </Link>
          ))}
      </div>
    </div>
  );
}
