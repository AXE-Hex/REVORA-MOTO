import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { supabase, currentUser } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { CartRemove } from '@/components/cart-remove';
export default async function Cart({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/cart`);
  const db = await supabase();
  const { data: cart } = await db!
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const { data: items } = cart
    ? await db!
        .from('cart_items')
        .select('id,quantity,product_id,variant_id')
        .eq('cart_id', cart.id)
    : { data: [] };
  const ids = (items || []).map((x) => x.product_id);
  const { data: products } = ids.length
    ? await db!
        .from('public_products')
        .select('id,name_ar,name_en,price_egp,sale_price_egp,stock')
        .in('id', ids)
    : { data: [] };
  const byId = new Map((products || []).map((x) => [x.id, x]));
  const variantIds = (items || []).flatMap((x) =>
    x.variant_id ? [x.variant_id] : [],
  );
  const { data: variants } = variantIds.length
    ? await db!
        .from('product_variants')
        .select('id,sku,attributes,price_egp,stock')
        .in('id', variantIds)
    : { data: [] };
  const byVariant = new Map((variants || []).map((x) => [x.id, x]));
  const total = (items || []).reduce((sum, item) => {
    const p = byId.get(item.product_id);
    const v = item.variant_id ? byVariant.get(item.variant_id) : null;
    return (
      sum +
      (p
        ? Number(v?.price_egp ?? p.sale_price_egp ?? p.price_egp) *
          item.quantity
        : 0)
    );
  }, 0);
  const { error } = await searchParams;
  return (
    <div className="shell section-small">
      <span className="section-index">REVORA / SHOPPING CART</span>
      <h1 className="page-title">{pick(locale, 'سلة التسوق', 'YOUR CART')}</h1>
      {error && <div className="notice error">{error}</div>}
      {items?.length ? (
        <div className="two-column">
          <div className="panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{pick(locale, 'المنتج', 'PRODUCT')}</th>
                  <th>{pick(locale, 'الكمية', 'QTY')}</th>
                  <th>{pick(locale, 'السعر', 'PRICE')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const p = byId.get(item.product_id);
                  const v = item.variant_id
                    ? byVariant.get(item.variant_id)
                    : null;
                  return (
                    <tr key={item.id}>
                      <td>
                        {p ? pick(locale, p.name_ar, p.name_en) : 'Unavailable'}
                        {v && (
                          <small
                            style={{ display: 'block', color: 'var(--muted)' }}
                          >
                            {Object.values(
                              v.attributes as Record<string, string>,
                            ).join(' / ')}{' '}
                            · {v.sku}
                          </small>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        {p
                          ? money(
                              Number(
                                v?.price_egp ?? p.sale_price_egp ?? p.price_egp,
                              ) * item.quantity,
                              locale,
                            )
                          : '-'}
                      </td>
                      <td>
                        <CartRemove id={item.id} locale={locale} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="panel">
            <h2>{pick(locale, 'ملخص الطلب', 'ORDER SUMMARY')}</h2>
            <div className="spec-row">
              <span>{pick(locale, 'المجموع', 'TOTAL')}</span>
              <strong>{money(total, locale)}</strong>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {pick(
                locale,
                'يتم تأكيد المخزون والسعر عند إتمام الطلب. الدفع يبقى معلقاً حتى التحقق.',
                'Stock and price are confirmed at checkout. Payment remains pending until verified.',
              )}
            </p>
            <Link className="button button-accent" href={`/${locale}/checkout`}>
              {pick(locale, 'إتمام الطلب', 'CHECKOUT')} ↗
            </Link>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <span>R/</span>
          <p>{pick(locale, 'سلتك فارغة حالياً', 'Your cart is empty')}</p>
          <Link className="button button-accent" href={`/${locale}/shop`}>
            {pick(locale, 'تسوق الآن', 'SHOP NOW')}
          </Link>
        </div>
      )}
    </div>
  );
}
