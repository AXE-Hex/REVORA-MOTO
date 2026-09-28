import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { supabase, currentUser } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { operationFailed } from '@/lib/action-feedback';
import { CartRemove } from '@/components/cart-remove';
import {
  CartMobileQuantityAndTotal,
  CartMobileCheckout,
  CartQuantity,
} from '@/components/cart-quantity';
import Image from 'next/image';
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
        .select('id,name_ar,name_en,price_egp,sale_price_egp,stock,image_url')
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
  const availableByItem = new Map<string, number>();
  await Promise.all(
    (items || []).map(async (item) => {
      const { data } = await db!.rpc('available_product_stock', {
        p_product: item.product_id,
        p_variant: item.variant_id,
      });
      availableByItem.set(item.id, Math.max(0, Number(data ?? 0)));
    }),
  );
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
      {error && <div className="notice error">{operationFailed(locale)}</div>}
      {items?.length ? (
        <div className="cart-layout">
          <div className="panel">
            <div
              className="cart-table-scroll"
              role="region"
              aria-label={pick(locale, 'منتجات السلة', 'Cart items')}
              tabIndex={0}
            >
              <table className="data-table cart-table">
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
                          {p
                            ? pick(locale, p.name_ar, p.name_en)
                            : pick(
                                locale,
                                'المنتج غير متاح',
                                'Product unavailable',
                              )}
                          {v && (
                            <small
                              style={{
                                display: 'block',
                                color: 'var(--muted)',
                              }}
                            >
                              {Object.values(
                                v.attributes as Record<string, string>,
                              ).join(' / ')}{' '}
                              · {v.sku}
                            </small>
                          )}
                        </td>
                        <td>
                          {p ? (
                            <CartQuantity
                              id={item.id}
                              quantity={item.quantity}
                              stock={availableByItem.get(item.id) ?? 0}
                              locale={locale}
                            />
                          ) : (
                            `×${item.quantity}`
                          )}
                        </td>
                        <td>
                          {p
                            ? money(
                                Number(
                                  v?.price_egp ??
                                    p.sale_price_egp ??
                                    p.price_egp,
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
            <div className="cart-mobile-list">
              {(items || []).map((item) => {
                const product = byId.get(item.product_id);
                const variant = item.variant_id
                  ? byVariant.get(item.variant_id)
                  : null;
                const current = Number(
                  variant?.price_egp ??
                    product?.sale_price_egp ??
                    product?.price_egp ??
                    0,
                );
                const original = Number(product?.price_egp ?? current);
                const discounted =
                  !variant &&
                  Number(product?.sale_price_egp ?? 0) > 0 &&
                  Number(product?.sale_price_egp) < original;
                const available = availableByItem.get(item.id) ?? 0;
                const attributes = variant?.attributes as
                  Record<string, string> | undefined;
                return (
                  <article className="cart-mobile-card" key={item.id}>
                    <div className="cart-mobile-product">
                      {product?.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={pick(locale, product.name_ar, product.name_en)}
                          width={96}
                          height={96}
                        />
                      ) : (
                        <div
                          className="cart-mobile-image-fallback"
                          aria-hidden="true"
                        >
                          R/
                        </div>
                      )}
                      <div className="cart-mobile-product-copy">
                        <h2>
                          {product
                            ? pick(locale, product.name_ar, product.name_en)
                            : pick(
                                locale,
                                'المنتج غير متاح',
                                'Product unavailable',
                              )}
                        </h2>
                        {variant && (
                          <p dir="auto">
                            {Object.entries(attributes || {})
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(' · ')}
                            {variant.sku ? ` · ${variant.sku}` : ''}
                          </p>
                        )}
                        <div className="cart-mobile-price">
                          <strong>{money(current, locale)}</strong>
                          {discounted && <del>{money(original, locale)}</del>}
                          {discounted && (
                            <span className="commerce-badge commerce-badge-discount">
                              {pick(locale, 'خصم', 'SALE')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="cart-mobile-card-meta">
                      {product ? (
                        <CartMobileQuantityAndTotal
                          id={item.id}
                          quantity={item.quantity}
                          stock={available}
                          unitPrice={current}
                          locale={locale}
                        />
                      ) : (
                        <>
                          <div className="cart-mobile-quantity">
                            <span>{pick(locale, 'الكمية', 'Quantity')}</span>
                            <span>×{item.quantity}</span>
                          </div>
                          <div className="cart-mobile-line-total">
                            <span>
                              {pick(locale, 'إجمالي السطر', 'Line total')}
                            </span>
                            <strong>—</strong>
                          </div>
                        </>
                      )}
                      {product && (
                        <p
                          className={`cart-availability ${available ? '' : 'is-unavailable'}`}
                          role="status"
                        >
                          {available > 0
                            ? pick(
                                locale,
                                `متاح ${available} قطعة`,
                                `${available} available`,
                              )
                            : pick(
                                locale,
                                'غير متوفر حالياً',
                                'Currently unavailable',
                              )}
                        </p>
                      )}
                      <CartRemove id={item.id} locale={locale} />
                    </div>
                  </article>
                );
              })}
            </div>
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
      {items?.length ? (
        <CartMobileCheckout initialTotal={total} locale={locale} />
      ) : null}
    </div>
  );
}
