import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import {
  CheckoutFlow,
  type CheckoutAddress,
  type CheckoutItem,
  type CheckoutQuote,
} from '@/components/checkout-flow';

export default async function Checkout({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ coupon?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/checkout`);
  const db = await supabase();
  if (!db) notFound();
  const { coupon = '' } = await searchParams;
  const normalizedCoupon = coupon.trim().toUpperCase().slice(0, 40);
  const [
    { data: cart },
    { data: addresses },
    { data: rawQuote, error: quoteError },
  ] = await Promise.all([
    db.from('carts').select('id').eq('user_id', user.id).maybeSingle(),
    db
      .from('addresses')
      .select('id,name,line1,city,governorate,is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }),
    db.rpc('quote_cart', { p_code: normalizedCoupon || null }),
  ]);
  const { data: cartRows } = cart
    ? await db
        .from('cart_items')
        .select('id,quantity,product_id,variant_id')
        .eq('cart_id', cart.id)
    : { data: [] };
  const productIds = [
    ...new Set((cartRows || []).map((row) => row.product_id)),
  ];
  const variantIds = [
    ...new Set(
      (cartRows || []).flatMap((row) =>
        row.variant_id ? [row.variant_id] : [],
      ),
    ),
  ];
  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length
      ? db
          .from('public_products')
          .select('id,name_ar,name_en,image_url,price_egp,sale_price_egp')
          .in('id', productIds)
      : Promise.resolve({ data: [] }),
    variantIds.length
      ? db
          .from('product_variants')
          .select('id,sku,attributes,price_egp')
          .in('id', variantIds)
      : Promise.resolve({ data: [] }),
  ]);
  const productById = new Map(
    (products || []).map((product) => [product.id, product]),
  );
  const variantById = new Map(
    (variants || []).map((variant) => [variant.id, variant]),
  );
  const items: CheckoutItem[] = (cartRows || []).map((row) => {
    const product = productById.get(row.product_id);
    const variant = row.variant_id ? variantById.get(row.variant_id) : null;
    const attributes = variant?.attributes as Record<string, string> | null;
    return {
      id: row.id,
      name: product
        ? pick(locale, product.name_ar, product.name_en)
        : pick(locale, 'منتج غير متاح', 'Unavailable product'),
      image: product?.image_url || null,
      variant: attributes
        ? Object.entries(attributes)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' · ')
        : null,
      sku: variant?.sku || null,
      quantity: row.quantity,
      unitPrice: Number(
        variant?.price_egp ??
          product?.sale_price_egp ??
          product?.price_egp ??
          0,
      ),
    };
  });
  const quoteData = rawQuote as Record<string, unknown> | null;
  const quote: CheckoutQuote | null =
    quoteData && !quoteError
      ? {
          subtotal: Number(quoteData.subtotal_egp || 0),
          discount: Number(quoteData.discount_egp || 0),
          shipping: Number(quoteData.shipping_egp || 0),
          tax: Number(quoteData.tax_egp || 0),
          taxRate: Number(quoteData.tax_rate_percent || 0),
          total: Number(quoteData.total_egp || 0),
          promotionName:
            typeof quoteData.promotion_name === 'string'
              ? quoteData.promotion_name
              : null,
        }
      : null;
  const addressRows = (addresses || []) as CheckoutAddress[];
  return (
    <main className="shell section-small checkout-page">
      <div className="breadcrumbs">
        <Link href={`/${locale}`}>REVORA</Link> /{' '}
        {pick(locale, 'إتمام الطلب', 'CHECKOUT')}
      </div>
      <span className="section-index">04 / CHECKOUT</span>
      <h1 className="page-title">{pick(locale, 'إتمام الطلب', 'Checkout')}</h1>
      {!items.length ? (
        <div className="empty-state checkout-empty">
          <span aria-hidden="true">R/</span>
          <h2>
            {pick(locale, 'لا توجد منتجات في السلة', 'Your cart is empty')}
          </h2>
          <p>
            {pick(
              locale,
              'أضف المنتجات إلى سلتك أولاً، ثم ارجع لإتمام الطلب.',
              'Add products to your cart, then return here to check out.',
            )}
          </p>
          <Link className="button button-primary" href={`/${locale}/shop`}>
            {pick(locale, 'استكشف المتجر', 'Browse the shop')}
          </Link>
        </div>
      ) : (
        <>
          <form className="checkout-coupon" action={`/${locale}/checkout`}>
            <label className="field-label" htmlFor="checkout-coupon">
              {pick(locale, 'رمز الخصم', 'Coupon code')}
            </label>
            <input
              className="input"
              id="checkout-coupon"
              name="coupon"
              maxLength={40}
              defaultValue={normalizedCoupon}
              placeholder={pick(locale, 'أدخل الرمز', 'Enter code')}
            />
            <button className="button button-secondary" type="submit">
              {pick(locale, 'تطبيق', 'Apply')}
            </button>
          </form>
          <CheckoutFlow
            locale={locale}
            addresses={addressRows}
            items={items}
            quote={quote}
            quoteError={Boolean(quoteError)}
            coupon={normalizedCoupon}
            requestKey={randomUUID()}
          />
        </>
      )}
    </main>
  );
}
