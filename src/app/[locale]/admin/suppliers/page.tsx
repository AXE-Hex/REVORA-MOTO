import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { operationFailed } from '@/lib/action-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  createPurchaseOrder,
  createSupplier,
  linkSupplierProduct,
  receiveItem,
} from './actions';

export default async function SuppliersPage({
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
    suppliersResult,
    warehousesResult,
    productsResult,
    variantsResult,
    ordersResult,
    itemsResult,
    linksResult,
  ] = await Promise.all([
    db
      .from('suppliers')
      .select('id,name,contact_name,email,phone,active')
      .order('name'),
    db.from('warehouses').select('id,name,active').order('name'),
    db
      .from('products')
      .select('id,sku,name_ar,name_en')
      .order('sku')
      .limit(300),
    db
      .from('product_variants')
      .select('id,product_id,sku')
      .order('sku')
      .limit(300),
    db
      .from('purchase_orders')
      .select('id,supplier_id,warehouse_id,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('purchase_order_items')
      .select(
        'id,purchase_order_id,product_id,variant_id,quantity,received_quantity,unit_cost_egp',
      )
      .limit(300),
    db
      .from('supplier_products')
      .select('supplier_id,product_id,supplier_sku,cost_egp')
      .limit(300),
  ]);
  const suppliers = suppliersResult.data || [];
  const warehouses = warehousesResult.data || [];
  const products = productsResult.data || [];
  const variants = variantsResult.data || [];
  const orders = ordersResult.data || [];
  const items = itemsResult.data || [];
  const links = linksResult.data || [];
  const supplierNames = new Map(suppliers.map((s) => [s.id, s.name]));
  const productNames = new Map(
    products.map((p) => [
      p.id,
      `${p.sku} · ${pick(locale, p.name_ar, p.name_en)}`,
    ]),
  );
  const variantNames = new Map(variants.map((v) => [v.id, v.sku]));
  const { error, success } = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / SUPPLIERS
      </div>
      <span className="section-index">REVORA / PURCHASING</span>
      <h1 className="page-title">
        {pick(locale, 'الموردون وأوامر الشراء', 'SUPPLIERS & PURCHASE ORDERS')}
      </h1>
      {error && <div className="notice error">{operationFailed(locale)}</div>}
      {success && (
        <div className="notice">
          {pick(locale, 'تم حفظ العملية', 'Operation saved')}
        </div>
      )}
      {[
        suppliersResult,
        warehousesResult,
        productsResult,
        variantsResult,
        ordersResult,
        itemsResult,
        linksResult,
      ].some((r) => r.error) && (
        <div className="notice error">
          {pick(
            locale,
            'تعذر تحميل بعض بيانات الموردين',
            'Some purchasing data could not be loaded',
          )}
        </div>
      )}
      <div className="two-column" style={{ marginTop: 24 }}>
        <form action={createSupplier} className="panel form-stack">
          <h2>{pick(locale, 'مورد جديد', 'NEW SUPPLIER')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'اسم المورد', 'SUPPLIER NAME')}
            <input className="input" name="name" required minLength={2} />
          </label>
          <label className="field-label">
            {pick(locale, 'اسم جهة الاتصال', 'CONTACT NAME')}
            <input className="input" name="contact_name" />
          </label>
          <label className="field-label">
            {pick(locale, 'البريد الإلكتروني', 'EMAIL')}
            <input className="input" name="email" type="email" />
          </label>
          <label className="field-label">
            {pick(locale, 'الهاتف', 'PHONE')}
            <input className="input" name="phone" />
          </label>
          <button className="button button-accent">
            {pick(locale, 'حفظ المورد', 'SAVE SUPPLIER')}
          </button>
        </form>
        <form action={createPurchaseOrder} className="panel form-stack">
          <h2>{pick(locale, 'أمر شراء جديد', 'NEW PURCHASE ORDER')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'المورد', 'SUPPLIER')}
            <select className="input" name="supplier" required>
              {suppliers
                .filter((s) => s.active)
                .map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'موقع الاستلام', 'RECEIVING LOCATION')}
            <select className="input" name="warehouse" required>
              {warehouses
                .filter((w) => w.active)
                .map((w) => (
                  <option value={w.id} key={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'المنتج', 'PRODUCT')}
            <select className="input" name="product" required>
              {products.map((p) => (
                <option value={p.id} key={p.id}>
                  {productNames.get(p.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(
              locale,
              'المقاس أو النوع (إن وجد)',
              'VARIANT (IF APPLICABLE)',
            )}
            <select className="input" name="variant">
              <option value="">—</option>
              {variants.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.sku}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'الكمية', 'QUANTITY')}
            <input
              className="input"
              type="number"
              name="quantity"
              min="1"
              required
            />
          </label>
          <label className="field-label">
            {pick(locale, 'تكلفة الوحدة بالجنيه', 'UNIT COST EGP')}
            <input
              className="input"
              type="number"
              name="unit_cost"
              min="0"
              step="0.01"
              required
            />
          </label>
          <button
            className="button button-accent"
            disabled={!suppliers.length || !products.length}
          >
            {pick(locale, 'إنشاء أمر الشراء', 'CREATE ORDER')}
          </button>
        </form>
      </div>
      <div className="panel admin-supplier-section" style={{ marginTop: 24 }}>
        <h2>{pick(locale, 'الموردون', 'SUPPLIERS')}</h2>
        <table className="data-table admin-supplier-desktop-table">
          <thead>
            <tr>
              <th>{pick(locale, 'الاسم', 'NAME')}</th>
              <th>{pick(locale, 'المسؤول', 'CONTACT')}</th>
              <th>{pick(locale, 'البريد', 'EMAIL')}</th>
              <th>{pick(locale, 'الهاتف', 'PHONE')}</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.contact_name || '—'}</td>
                <td>{s.email || '—'}</td>
                <td>{s.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-supplier-mobile-cards">
          {suppliers.map((supplier) => (
            <article className="admin-mobile-data-card" key={supplier.id}>
              <h3>{supplier.name}</h3>
              <dl>
                <div>
                  <dt>{pick(locale, 'جهة الاتصال', 'Contact')}</dt>
                  <dd>{supplier.contact_name || '—'}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'البريد', 'Email')}</dt>
                  <dd dir="ltr">{supplier.email || '—'}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'الهاتف', 'Phone')}</dt>
                  <dd dir="ltr">{supplier.phone || '—'}</dd>
                </div>
              </dl>
            </article>
          ))}
          {!suppliers.length && (
            <p>{pick(locale, 'لا يوجد موردون بعد', 'No suppliers yet')}</p>
          )}
        </div>
      </div>
      <div className="two-column" style={{ marginTop: 24 }}>
        <form action={linkSupplierProduct} className="panel form-stack">
          <h2>
            {pick(locale, 'مرجع منتج لدى المورد', 'SUPPLIER PRODUCT REFERENCE')}
          </h2>
          <input type="hidden" name="locale" value={locale} />
          <label className="field-label">
            {pick(locale, 'المورد', 'SUPPLIER')}
            <select className="input" name="supplier" required>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'المنتج', 'PRODUCT')}
            <select className="input" name="product" required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {productNames.get(p.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {pick(locale, 'رقم المنتج لدى المورد', 'SUPPLIER SKU')}
            <input
              className="input"
              name="supplier_sku"
              required
              maxLength={100}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'تكلفة الوحدة بالجنيه', 'UNIT COST EGP')}
            <input
              className="input"
              type="number"
              name="cost"
              min="0"
              step="0.01"
              required
            />
          </label>
          <button
            className="button button-accent"
            disabled={!suppliers.length || !products.length}
          >
            {pick(locale, 'حفظ المرجع', 'SAVE REFERENCE')}
          </button>
        </form>
        <div className="panel admin-supplier-section">
          <h2>{pick(locale, 'مراجع الموردين', 'SUPPLIER REFERENCES')}</h2>
          <table className="data-table admin-supplier-desktop-table">
            <thead>
              <tr>
                <th>{pick(locale, 'المورد', 'SUPPLIER')}</th>
                <th>{pick(locale, 'المنتج', 'PRODUCT')}</th>
                <th>SKU</th>
                <th>{pick(locale, 'التكلفة', 'COST')}</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={`${link.supplier_id}-${link.product_id}`}>
                  <td>{supplierNames.get(link.supplier_id)}</td>
                  <td>{productNames.get(link.product_id)}</td>
                  <td>{link.supplier_sku}</td>
                  <td>{link.cost_egp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-supplier-mobile-cards">
            {links.map((link) => (
              <article
                className="admin-mobile-data-card"
                key={`${link.supplier_id}-${link.product_id}`}
              >
                <h3>{productNames.get(link.product_id) || '—'}</h3>
                <dl>
                  <div>
                    <dt>{pick(locale, 'المورد', 'Supplier')}</dt>
                    <dd>{supplierNames.get(link.supplier_id) || '—'}</dd>
                  </div>
                  <div>
                    <dt>SKU</dt>
                    <dd dir="ltr">{link.supplier_sku}</dd>
                  </div>
                  <div>
                    <dt>{pick(locale, 'تكلفة الوحدة', 'Unit cost')}</dt>
                    <dd>
                      {link.cost_egp} {pick(locale, 'ج.م', 'EGP')}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
            {!links.length && (
              <p>
                {pick(
                  locale,
                  'لا توجد مراجع موردين بعد',
                  'No supplier references yet',
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="panel admin-supplier-section" style={{ marginTop: 24 }}>
        <h2>
          {pick(
            locale,
            'أوامر الشراء والاستلام',
            'PURCHASE ORDERS & RECEIVING',
          )}
        </h2>
        <table className="data-table admin-supplier-desktop-table">
          <thead>
            <tr>
              <th>{pick(locale, 'التاريخ', 'DATE')}</th>
              <th>{pick(locale, 'المورد', 'SUPPLIER')}</th>
              <th>{pick(locale, 'الحالة', 'STATUS')}</th>
              <th>{pick(locale, 'المنتج', 'PRODUCT')}</th>
              <th>{pick(locale, 'الكمية', 'QTY')}</th>
              <th>{pick(locale, 'التكلفة', 'COST')}</th>
              <th>{pick(locale, 'استلام', 'RECEIVE')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.flatMap((order) =>
              items
                .filter((item) => item.purchase_order_id === order.id)
                .map((item) => {
                  const remaining = item.quantity - item.received_quantity;
                  return (
                    <tr key={item.id}>
                      <td>
                        {new Date(order.created_at).toLocaleDateString(locale)}
                      </td>
                      <td>{supplierNames.get(order.supplier_id) || '—'}</td>
                      <td>
                        <StatusBadge status={order.status} locale={locale} />
                      </td>
                      <td>
                        {productNames.get(item.product_id) || item.product_id}{' '}
                        {item.variant_id
                          ? `/ ${variantNames.get(item.variant_id) || item.variant_id}`
                          : ''}
                      </td>
                      <td>
                        {item.received_quantity} / {item.quantity}
                      </td>
                      <td>{item.unit_cost_egp}</td>
                      <td>
                        {remaining > 0 && order.status !== 'cancelled' ? (
                          <form action={receiveItem} className="search-form">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="item" value={item.id} />
                            <input
                              className="input"
                              type="number"
                              name="quantity"
                              min="1"
                              max={remaining}
                              defaultValue={remaining}
                              required
                              style={{ width: 90 }}
                            />
                            <button className="button button-accent">
                              {pick(locale, 'استلام', 'RECEIVE')}
                            </button>
                          </form>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                }),
            )}
          </tbody>
        </table>
        <div className="admin-supplier-mobile-cards">
          {orders.flatMap((order) =>
            items
              .filter((item) => item.purchase_order_id === order.id)
              .map((item) => {
                const remaining = item.quantity - item.received_quantity;
                return (
                  <article
                    className="admin-mobile-data-card"
                    key={`mobile-${item.id}`}
                  >
                    <header>
                      <strong>
                        {productNames.get(item.product_id) || item.product_id}
                      </strong>
                      <StatusBadge status={order.status} locale={locale} />
                    </header>
                    <dl>
                      <div>
                        <dt>{pick(locale, 'التاريخ', 'Date')}</dt>
                        <dd>
                          {new Date(order.created_at).toLocaleDateString(
                            locale === 'ar' ? 'ar-EG' : 'en-GB',
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>{pick(locale, 'المورد', 'Supplier')}</dt>
                        <dd>{supplierNames.get(order.supplier_id) || '—'}</dd>
                      </div>
                      <div>
                        <dt>{pick(locale, 'الكمية', 'Quantity')}</dt>
                        <dd>
                          {item.received_quantity} / {item.quantity}
                        </dd>
                      </div>
                      <div>
                        <dt>{pick(locale, 'التكلفة', 'Cost')}</dt>
                        <dd>
                          {item.unit_cost_egp} {pick(locale, 'ج.م', 'EGP')}
                        </dd>
                      </div>
                    </dl>
                    {remaining > 0 && order.status !== 'cancelled' ? (
                      <form
                        action={receiveItem}
                        className="admin-mobile-receive-form"
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="item" value={item.id} />
                        <label className="field-label">
                          {pick(locale, 'كمية الاستلام', 'Receive quantity')}
                          <input
                            className="input"
                            type="number"
                            name="quantity"
                            min="1"
                            max={remaining}
                            defaultValue={remaining}
                            required
                          />
                        </label>
                        <button className="button button-primary" type="submit">
                          {pick(locale, 'استلام', 'Receive')}
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              }),
          )}
          {!items.length && (
            <p>
              {pick(locale, 'لا توجد أوامر شراء بعد', 'No purchase orders yet')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
