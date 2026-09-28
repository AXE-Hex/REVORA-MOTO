import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, currentUser } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
const sections: Record<
  string,
  { table: string; permission: string; columns: string[] }
> = {
  products: {
    table: 'products',
    permission: 'catalog.write',
    columns: ['sku', 'name_en', 'status', 'stock', 'price_egp'],
  },
  motorcycles: {
    table: 'motorcycles',
    permission: 'motorcycles.write',
    columns: ['slug', 'name_en', 'condition', 'availability', 'price_egp'],
  },
  orders: {
    table: 'orders',
    permission: 'orders.read',
    columns: ['order_number', 'status', 'total_egp', 'created_at'],
  },
  reservations: {
    table: 'motorcycle_reservations',
    permission: 'reservations.read',
    columns: ['id', 'status', 'deposit_egp', 'created_at'],
  },
  inventory: {
    table: 'inventory',
    permission: 'inventory.write',
    columns: ['product_id', 'on_hand', 'reserved', 'incoming'],
  },
  suppliers: {
    table: 'suppliers',
    permission: 'inventory.write',
    columns: ['name', 'email', 'phone', 'active'],
  },
  reviews: {
    table: 'reviews',
    permission: 'content.write',
    columns: ['product_id', 'rating', 'status', 'body'],
  },
  audit: {
    table: 'audit_logs',
    permission: 'audit.read',
    columns: ['actor_id', 'action', 'entity', 'created_at'],
  },
};
export default async function AdminSection({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  if (!isLocale(locale)) notFound();
  const cfg = sections[section];
  if (!cfg) notFound();
  const user = await currentUser();
  if (!user) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: cfg.permission,
  });
  if (!allowed) notFound();
  const { data: rows, error } = await db!
    .from(cfg.table)
    .select(cfg.columns.join(','))
    .limit(100);
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / {section.toUpperCase()}
      </div>
      <span className="section-index">REVORA / OPERATIONS</span>
      <h1 className="page-title">{section.toUpperCase()}</h1>
      {error && (
        <div className="notice error">
          {pick(locale, 'تعذر تحميل البيانات', 'Could not load data')}
        </div>
      )}
      <div style={{ overflowX: 'auto' }} className="panel">
        <table className="data-table">
          <thead>
            <tr>
              {cfg.columns.map((c) => (
                <th key={c}>{c.toUpperCase().replaceAll('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, index) => (
              <tr key={index}>
                {cfg.columns.map((c) => (
                  <td key={c}>
                    {String(
                      (row as unknown as Record<string, unknown>)[c] ?? '—',
                    ).slice(0, 130)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows?.length && <p>{pick(locale, 'لا توجد بيانات', 'No records')}</p>}
      </div>
    </div>
  );
}
