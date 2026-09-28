import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { operationFailed } from '@/lib/action-feedback';
import { localizedInventoryMovement } from '@/lib/admin-format';
import { adjustStock, createWarehouse, transferStock } from './actions';

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !(await currentUser())) notFound();
  const db = await supabase();
  if (!db) notFound();
  const { data: allowed } = await db.rpc('has_permission', {
    p_permission: 'inventory.write',
  });
  if (!allowed) notFound();
  const [
    stockResult,
    warehousesResult,
    productsResult,
    variantsResult,
    movementsResult,
  ] = await Promise.all([
    db
      .from('inventory')
      .select('id,product_id,variant_id,warehouse_id,on_hand,reserved,incoming')
      .order('product_id')
      .limit(300),
    db.from('warehouses').select('id,name,active').order('name'),
    db
      .from('products')
      .select('id,sku,name_ar,name_en,low_stock_threshold')
      .order('sku')
      .limit(300),
    db.from('product_variants').select('id,sku,attributes').limit(300),
    db
      .from('inventory_movements')
      .select('id,inventory_id,delta,incoming_delta,kind,reason,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  const rows = stockResult.data || [];
  const warehouses = warehousesResult.data || [];
  const products = new Map((productsResult.data || []).map((p) => [p.id, p]));
  const variants = new Map((variantsResult.data || []).map((v) => [v.id, v]));
  const locations = new Map(warehouses.map((w) => [w.id, w]));
  const label = (row: (typeof rows)[number]) => {
    const product = products.get(row.product_id);
    const variant = row.variant_id ? variants.get(row.variant_id) : null;
    return `${product?.sku || row.product_id} ${variant ? `/ ${variant.sku}` : ''}`;
  };
  const { error, success } = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / INVENTORY
      </div>
      <span className="section-index">REVORA / OPERATIONS</span>
      <h1 className="page-title">
        {pick(locale, 'المخزون والمواقع', 'INVENTORY & LOCATIONS')}
      </h1>
      <p>
        {pick(
          locale,
          'الرصيد المتاح = الفعلي − المحجوز. كل تعديل أو نقل يسجل حركة دائمة.',
          'Available = on hand − reserved. Every adjustment and transfer is recorded.',
        )}
      </p>
      {error && <div className="notice error">{operationFailed(locale)}</div>}
      {success && (
        <div className="notice">
          {pick(locale, 'تم حفظ العملية', 'Operation saved')}
        </div>
      )}
      {[
        stockResult,
        warehousesResult,
        productsResult,
        variantsResult,
        movementsResult,
      ].some((r) => r.error) && (
        <div className="notice error">
          {pick(
            locale,
            'تعذر تحميل بعض بيانات المخزون',
            'Some inventory data could not be loaded',
          )}
        </div>
      )}
      <div
        className="panel admin-inventory-table"
        style={{ overflowX: 'auto', marginTop: 24 }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>{pick(locale, 'المنتج', 'PRODUCT')}</th>
              <th>{pick(locale, 'الموقع', 'LOCATION')}</th>
              <th>{pick(locale, 'الفعلي', 'ON HAND')}</th>
              <th>{pick(locale, 'المحجوز', 'RESERVED')}</th>
              <th>{pick(locale, 'المتاح', 'AVAILABLE')}</th>
              <th>{pick(locale, 'القادم', 'INCOMING')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const available = row.on_hand - row.reserved;
              const low =
                available <=
                (products.get(row.product_id)?.low_stock_threshold || 0);
              return (
                <tr key={row.id}>
                  <td>{label(row)}</td>
                  <td>{locations.get(row.warehouse_id)?.name || '—'}</td>
                  <td>{row.on_hand}</td>
                  <td>{row.reserved}</td>
                  <td>
                    {available}
                    {low ? ' ⚠' : ''}
                  </td>
                  <td>{row.incoming}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <p>{pick(locale, 'لا توجد أرصدة بعد', 'No location balances yet')}</p>
        )}
      </div>
      <div className="admin-inventory-mobile-list">
        {rows.map((row) => {
          const available = row.on_hand - row.reserved;
          const low =
            available <=
            (products.get(row.product_id)?.low_stock_threshold || 0);
          return (
            <article className="admin-inventory-mobile-card panel" key={row.id}>
              <header>
                <strong>{label(row)}</strong>
                <span>{locations.get(row.warehouse_id)?.name || '—'}</span>
              </header>
              <dl>
                <div>
                  <dt>{pick(locale, 'الفعلي', 'On hand')}</dt>
                  <dd>{row.on_hand}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'المحجوز', 'Reserved')}</dt>
                  <dd>{row.reserved}</dd>
                </div>
                <div className={low ? 'is-low-stock' : ''}>
                  <dt>{pick(locale, 'المتاح', 'Available')}</dt>
                  <dd>
                    {available}
                    {low && (
                      <span className="low-stock-label">
                        ⚠ {pick(locale, 'منخفض', 'Low')}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{pick(locale, 'القادم', 'Incoming')}</dt>
                  <dd>{row.incoming}</dd>
                </div>
              </dl>
            </article>
          );
        })}
        {!rows.length && !stockResult.error && (
          <p className="admin-empty-state">
            {pick(locale, 'لا توجد أرصدة بعد', 'No location balances yet')}
          </p>
        )}
      </div>
      <div className="two-column" style={{ marginTop: 24 }}>
        <form action={adjustStock} className="panel form-stack">
          <h2>{pick(locale, 'تعديل الرصيد', 'STOCK ADJUSTMENT')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'الرصيد', 'BALANCE')}
            <select className="input" name="inventory" required>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {label(r)} · {locations.get(r.warehouse_id)?.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'التغيير (+ أو −)', 'CHANGE (+ OR −)')}
            <input
              className="input"
              name="delta"
              type="number"
              required
              min="-100000"
              max="100000"
            />
          </label>
          <label className="field-label">
            {pick(locale, 'سبب التعديل', 'REASON')}
            <input
              className="input"
              name="reason"
              minLength={5}
              maxLength={200}
              required
            />
          </label>
          <button className="button button-accent" disabled={!rows.length}>
            {pick(locale, 'حفظ التعديل', 'SAVE ADJUSTMENT')}
          </button>
        </form>
        <form action={transferStock} className="panel form-stack">
          <h2>{pick(locale, 'نقل بين المواقع', 'TRANSFER STOCK')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'من رصيد', 'FROM BALANCE')}
            <select className="input" name="inventory" required>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {label(r)} · {locations.get(r.warehouse_id)?.name} (
                  {r.on_hand - r.reserved})
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'إلى موقع', 'TO LOCATION')}
            <select className="input" name="destination" required>
              {warehouses
                .filter((w) => w.active)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'الكمية', 'QUANTITY')}
            <input
              className="input"
              name="quantity"
              type="number"
              min="1"
              required
            />
          </label>
          <label className="field-label">
            {pick(locale, 'سبب النقل', 'REASON')}
            <input
              className="input"
              name="reason"
              minLength={5}
              maxLength={200}
              required
            />
          </label>
          <button
            className="button button-accent"
            disabled={!rows.length || warehouses.length < 2}
          >
            {pick(locale, 'نقل الرصيد', 'TRANSFER')}
          </button>
        </form>
      </div>
      <form
        action={createWarehouse}
        className="panel form-stack"
        style={{ marginTop: 24 }}
      >
        <h2>{pick(locale, 'موقع جديد', 'NEW LOCATION')}</h2>
        <input type="hidden" name="locale" value={locale} />
        <label className="field-label">
          {pick(locale, 'اسم المستودع أو الفرع', 'WAREHOUSE OR BRANCH NAME')}
          <input
            className="input"
            name="name"
            minLength={3}
            maxLength={120}
            required
          />
        </label>
        <button className="button button-accent">
          {pick(locale, 'إضافة موقع', 'ADD LOCATION')}
        </button>
      </form>
      <div
        className="panel admin-inventory-movements"
        style={{ marginTop: 24 }}
      >
        <h2>{pick(locale, 'آخر الحركات', 'RECENT MOVEMENTS')}</h2>
        <table className="data-table admin-inventory-movement-table">
          <thead>
            <tr>
              <th>{pick(locale, 'الوقت', 'TIME')}</th>
              <th>{pick(locale, 'النوع', 'TYPE')}</th>
              <th>{pick(locale, 'التغير', 'CHANGE')}</th>
              <th>{pick(locale, 'القادم', 'INCOMING')}</th>
              <th>{pick(locale, 'السبب', 'REASON')}</th>
            </tr>
          </thead>
          <tbody>
            {(movementsResult.data || []).map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.created_at).toLocaleString(locale)}</td>
                <td>{localizedInventoryMovement(locale, m.kind)}</td>
                <td>{m.delta}</td>
                <td>{m.incoming_delta}</td>
                <td>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-inventory-movement-cards">
          {(movementsResult.data || []).map((movement) => (
            <article
              className="admin-mobile-data-card"
              key={`movement-${movement.id}`}
            >
              <header>
                <strong>
                  {localizedInventoryMovement(locale, movement.kind)}
                </strong>
                <time dateTime={movement.created_at}>
                  {new Date(movement.created_at).toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </time>
              </header>
              <dl>
                <div>
                  <dt>{pick(locale, 'التغير', 'Change')}</dt>
                  <dd>{movement.delta}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'المخزون القادم', 'Incoming')}</dt>
                  <dd>{movement.incoming_delta}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'السبب', 'Reason')}</dt>
                  <dd>{movement.reason}</dd>
                </div>
              </dl>
            </article>
          ))}
          {!movementsResult.data?.length && (
            <p>
              {pick(
                locale,
                'لا توجد حركات مخزون بعد',
                'No stock movements yet',
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
