import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { placeOrder } from '@/app/actions';
import { randomUUID } from 'node:crypto';
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
  const { coupon = '' } = await searchParams;
  const normalizedCoupon = coupon.trim().toUpperCase().slice(0, 40);
  const { data: quote, error: quoteError } = await db!.rpc('quote_cart', {
    p_code: normalizedCoupon || null,
  });
  const { data: addresses } = await db!
    .from('addresses')
    .select('id,name,line1,city,governorate')
    .eq('user_id', user.id);
  return (
    <div className="shell section-small">
      <span className="section-index">REVORA / CHECKOUT</span>
      <h1 className="page-title">{pick(locale, 'إتمام الطلب', 'CHECKOUT')}</h1>
      <div className="panel" style={{ maxWidth: 650 }}>
        <form
          action={`/${locale}/checkout`}
          className="form-stack"
          style={{ marginBottom: 24 }}
        >
          <label className="field-label">
            {pick(locale, 'رمز الخصم', 'COUPON CODE')}
            <input
              className="input"
              name="coupon"
              maxLength={40}
              defaultValue={normalizedCoupon}
              placeholder={pick(locale, 'أدخل الرمز', 'Enter code')}
            />
          </label>
          <button className="button" type="submit">
            {pick(locale, 'تطبيق', 'APPLY')}
          </button>
        </form>
        {quoteError ? (
          <p className="notice error">{quoteError.message}</p>
        ) : (
          quote && (
            <div style={{ marginBottom: 24 }}>
              <div className="spec-row">
                <span>{pick(locale, 'المجموع الفرعي', 'SUBTOTAL')}</span>
                <strong>{money(quote.subtotal_egp, locale)}</strong>
              </div>
              {Number(quote.discount_egp) > 0 && (
                <div className="spec-row">
                  <span>
                    {pick(locale, 'الخصم', 'DISCOUNT')}{' '}
                    {quote.promotion_name ? `(${quote.promotion_name})` : ''}
                  </span>
                  <strong>−{money(quote.discount_egp, locale)}</strong>
                </div>
              )}
              <div className="spec-row">
                <span>{pick(locale, 'الشحن', 'SHIPPING')}</span>
                <strong>{money(quote.shipping_egp, locale)}</strong>
              </div>
              <div className="spec-row">
                <span>
                  {pick(locale, 'الضريبة', 'TAX')} ({quote.tax_rate_percent}%)
                </span>
                <strong>{money(quote.tax_egp, locale)}</strong>
              </div>
              <div className="spec-row">
                <span>{pick(locale, 'الإجمالي', 'TOTAL')}</span>
                <strong>{money(quote.total_egp, locale)}</strong>
              </div>
            </div>
          )
        )}
        {addresses?.length ? (
          <form action={placeOrder} className="form-stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="coupon" value={normalizedCoupon} />
            <input type="hidden" name="requestKey" value={randomUUID()} />
            <label className="field-label">
              {pick(locale, 'عنوان التوصيل', 'DELIVERY ADDRESS')}
              <select className="input" name="address">
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.line1}, {a.city}, {a.governorate}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              {pick(locale, 'طريقة الدفع', 'PAYMENT METHOD')}
              <select className="input" name="method">
                <option value="card">Visa / Mastercard</option>
                <option value="instapay">InstaPay</option>
              </select>
            </label>
            <p className="notice">
              {pick(
                locale,
                'سيُنشأ الطلب بحالة انتظار الدفع. لا يُعتبر الدفع ناجحاً إلا بعد تأكيد مزود معتمد.',
                'The order will be created awaiting payment. It is only marked paid after verified provider confirmation.',
              )}
            </p>
            <button
              className="button button-accent"
              disabled={!!quoteError || !quote}
            >
              {pick(locale, 'إنشاء الطلب', 'PLACE ORDER')}
            </button>
          </form>
        ) : (
          <>
            <p>
              {pick(
                locale,
                'أضف عنوان توصيل أولاً',
                'Add a delivery address first',
              )}
            </p>
            <Link
              className="button button-accent"
              href={`/${locale}/account/addresses`}
            >
              {pick(locale, 'إضافة عنوان', 'ADD ADDRESS')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
