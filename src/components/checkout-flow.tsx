'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { placeOrder } from '@/app/actions';
import { money, pick, type Locale } from '@/lib/i18n';

export type CheckoutAddress = {
  id: string;
  name: string;
  line1: string;
  city: string;
  governorate: string;
  is_default: boolean;
};
export type CheckoutItem = {
  id: string;
  name: string;
  image: string | null;
  variant: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};
export type CheckoutQuote = {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  taxRate: number;
  total: number;
  promotionName: string | null;
};

function SubmitOrder({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" type="submit" disabled={pending}>
      {pending
        ? pick(locale, 'جارٍ إنشاء الطلب…', 'Creating order…')
        : pick(locale, 'تأكيد الطلب', 'Confirm order')}
    </button>
  );
}

export function CheckoutFlow({
  locale,
  addresses,
  items,
  quote,
  quoteError,
  coupon,
  requestKey,
}: {
  locale: Locale;
  addresses: CheckoutAddress[];
  items: CheckoutItem[];
  quote: CheckoutQuote | null;
  quoteError: boolean;
  coupon: string;
  requestKey: string;
}) {
  const labels = [
    pick(locale, 'السلة', 'Cart'),
    pick(locale, 'التوصيل', 'Delivery'),
    pick(locale, 'الدفع', 'Payment'),
    pick(locale, 'المراجعة', 'Review'),
  ];
  const [step, setStep] = useState(0);
  const [addressId, setAddressId] = useState(
    addresses.find((address) => address.is_default)?.id ||
      addresses[0]?.id ||
      '',
  );
  const [method, setMethod] = useState<'card' | 'instapay'>('card');
  const [stepError, setStepError] = useState(false);
  const selectedAddress = addresses.find((address) => address.id === addressId);
  const isRtl = locale === 'ar';
  const ForwardIcon = isRtl ? ArrowLeft : ArrowRight;
  const canOrder = Boolean(
    quote && !quoteError && items.length && selectedAddress,
  );

  function next() {
    if (step === 1 && !addressId) {
      setStepError(true);
      return;
    }
    if (step === 3) return;
    setStepError(false);
    setStep((current) => Math.min(3, current + 1));
  }
  function previous() {
    setStepError(false);
    setStep((current) => Math.max(0, current - 1));
  }

  const summary = (titleId: string) => (
    <section className="panel checkout-summary" aria-labelledby={titleId}>
      <h2 id={titleId}>{pick(locale, 'ملخص الطلب', 'Order summary')}</h2>
      <div className="checkout-summary-items">
        {items.map((item) => (
          <div className="checkout-summary-item" key={item.id}>
            {item.image ? (
              <Image src={item.image} width={56} height={56} alt="" />
            ) : (
              <span className="checkout-image-fallback" aria-hidden="true">
                R/
              </span>
            )}
            <div>
              <strong>{item.name}</strong>
              {item.variant && <small dir="auto">{item.variant}</small>}
              <small>
                {pick(
                  locale,
                  `الكمية ${item.quantity}`,
                  `Qty ${item.quantity}`,
                )}
              </small>
            </div>
            <b>{money(item.unitPrice * item.quantity, locale)}</b>
          </div>
        ))}
      </div>
      {quote ? (
        <div className="checkout-totals">
          <div>
            <span>{pick(locale, 'المجموع الفرعي', 'Subtotal')}</span>
            <b>{money(quote.subtotal, locale)}</b>
          </div>
          {quote.discount > 0 && (
            <div>
              <span>
                {pick(locale, 'الخصم', 'Discount')}
                {quote.promotionName ? ` · ${quote.promotionName}` : ''}
              </span>
              <b className="checkout-savings">
                −{money(quote.discount, locale)}
              </b>
            </div>
          )}
          <div>
            <span>{pick(locale, 'الشحن', 'Shipping')}</span>
            <b>{money(quote.shipping, locale)}</b>
          </div>
          <div>
            <span>
              {pick(locale, 'الضريبة', 'Tax')} ({quote.taxRate}%)
            </span>
            <b>{money(quote.tax, locale)}</b>
          </div>
          <div className="checkout-grand-total">
            <span>{pick(locale, 'الإجمالي', 'Total')}</span>
            <b>{money(quote.total, locale)}</b>
          </div>
          {quote.discount > 0 && (
            <p>
              {pick(
                locale,
                `وفّرت ${money(quote.discount, locale)}`,
                `You save ${money(quote.discount, locale)}`,
              )}
            </p>
          )}
        </div>
      ) : (
        <p className="notice error" role="alert">
          {pick(
            locale,
            'تعذر حساب إجمالي الطلب. حدّث الصفحة وحاول مرة أخرى.',
            'We could not calculate your order total. Refresh and try again.',
          )}
        </p>
      )}
    </section>
  );

  return (
    <div className="checkout-flow">
      <nav
        className="checkout-stepper"
        aria-label={pick(locale, 'خطوات إتمام الطلب', 'Checkout steps')}
      >
        {labels.map((label, index) => (
          <div
            className={`checkout-step ${index === step ? 'is-current' : ''} ${index < step ? 'is-complete' : ''}`}
            key={label}
            aria-current={index === step ? 'step' : undefined}
          >
            <span>
              {index < step ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <b>{label}</b>
          </div>
        ))}
      </nav>

      {quoteError && (
        <p className="notice error" role="alert">
          {pick(
            locale,
            'تعذر التحقق من الأسعار أو التوفر. راجع السلة وحاول مجدداً.',
            'We could not validate prices or availability. Review your cart and try again.',
          )}
        </p>
      )}

      <div className="checkout-content">
        <section className="panel checkout-stage" aria-live="polite">
          <span className="section-index">
            {pick(locale, `الخطوة ${step + 1} من 4`, `STEP ${step + 1} OF 4`)}
          </span>
          <h2>{labels[step]}</h2>

          {step === 0 && (
            <div className="checkout-cart-stage">
              <p>
                {pick(
                  locale,
                  'راجع المنتجات والكميات قبل اختيار عنوان التوصيل.',
                  'Review your products and quantities before choosing delivery.',
                )}
              </p>
              {items.map((item) => (
                <div className="checkout-review-line" key={item.id}>
                  <span>
                    {item.name}
                    {item.variant ? ` · ${item.variant}` : ''} × {item.quantity}
                  </span>
                  <b>{money(item.unitPrice * item.quantity, locale)}</b>
                </div>
              ))}
              <Link
                className="button button-secondary"
                href={`/${locale}/cart`}
              >
                {pick(locale, 'تعديل السلة', 'Edit cart')}
              </Link>
            </div>
          )}

          {step === 1 && (
            <div className="checkout-address-options">
              {addresses.length ? (
                addresses.map((address) => (
                  <label
                    className={`checkout-choice-card ${addressId === address.id ? 'is-selected' : ''}`}
                    key={address.id}
                  >
                    <input
                      type="radio"
                      name="delivery-address"
                      value={address.id}
                      checked={addressId === address.id}
                      onChange={() => {
                        setAddressId(address.id);
                        setStepError(false);
                      }}
                    />
                    <span>
                      <strong>{address.name}</strong>
                      <small>
                        {address.line1} · {address.city} · {address.governorate}
                      </small>
                    </span>
                    {address.is_default && (
                      <em>{pick(locale, 'افتراضي', 'Default')}</em>
                    )}
                  </label>
                ))
              ) : (
                <div className="empty-state checkout-address-empty">
                  <h3>
                    {pick(locale, 'أضف عنوان توصيل', 'Add a delivery address')}
                  </h3>
                  <p>
                    {pick(
                      locale,
                      'احفظ عنواناً في حسابك للمتابعة.',
                      'Save an address to your account to continue.',
                    )}
                  </p>
                </div>
              )}
              {stepError && (
                <p className="notice error" role="alert">
                  {pick(
                    locale,
                    'اختر عنوان التوصيل للمتابعة.',
                    'Choose a delivery address to continue.',
                  )}
                </p>
              )}
              <Link
                className="button button-secondary"
                href={`/${locale}/account/addresses`}
              >
                {pick(locale, 'إدارة العناوين', 'Manage addresses')}
              </Link>
            </div>
          )}

          {step === 2 && (
            <fieldset className="checkout-payment-options">
              <legend>
                {pick(locale, 'اختر طريقة الدفع', 'Choose a payment method')}
              </legend>
              {(['card', 'instapay'] as const).map((paymentMethod) => (
                <label
                  className={`checkout-choice-card ${method === paymentMethod ? 'is-selected' : ''}`}
                  key={paymentMethod}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={paymentMethod}
                    checked={method === paymentMethod}
                    onChange={() => setMethod(paymentMethod)}
                  />
                  <span>
                    <strong>
                      {paymentMethod === 'card'
                        ? 'Visa / Mastercard'
                        : 'InstaPay'}
                    </strong>
                    <small>
                      {pick(
                        locale,
                        'طلب الدفع سيظل بانتظار التحقق من مزود معتمد.',
                        'Payment remains pending until confirmed by a configured provider.',
                      )}
                    </small>
                  </span>
                </label>
              ))}
              <p className="notice">
                {pick(
                  locale,
                  'اختيار الطريقة لا ينفذ دفعاً الآن. لن يتغير الطلب إلى مدفوع قبل التحقق من إشعار مزود الدفع.',
                  'Selecting a method does not charge you. The order stays unpaid until a provider event is verified.',
                )}
              </p>
            </fieldset>
          )}

          {step === 3 && (
            <div className="checkout-review">
              {items.map((item) => (
                <div className="checkout-review-line" key={item.id}>
                  <span>
                    {item.name}
                    {item.variant ? ` · ${item.variant}` : ''} × {item.quantity}
                  </span>
                  <b>{money(item.unitPrice * item.quantity, locale)}</b>
                </div>
              ))}
              {selectedAddress && (
                <section>
                  <h3>{pick(locale, 'عنوان التوصيل', 'Delivery address')}</h3>
                  <p>
                    {selectedAddress.name} · {selectedAddress.line1} ·{' '}
                    {selectedAddress.city} · {selectedAddress.governorate}
                  </p>
                </section>
              )}
              <section>
                <h3>{pick(locale, 'طريقة الدفع', 'Payment method')}</h3>
                <p>
                  {method === 'card' ? 'Visa / Mastercard' : 'InstaPay'} ·{' '}
                  {pick(locale, 'بانتظار التحقق', 'Verification pending')}
                </p>
              </section>
              {quote && (
                <div className="checkout-review-total">
                  <span>{pick(locale, 'الإجمالي النهائي', 'Final total')}</span>
                  <strong>{money(quote.total, locale)}</strong>
                </div>
              )}
              <p className="notice">
                {pick(
                  locale,
                  'سيُنشأ الطلب بحالة انتظار الدفع. لا يؤكد هذا النموذج نجاح الدفع.',
                  'The order will be created awaiting payment. This form does not confirm payment.',
                )}
              </p>
            </div>
          )}

          <div className="checkout-stage-actions">
            {step > 0 && (
              <button
                className="button button-ghost"
                type="button"
                onClick={previous}
              >
                {pick(locale, 'رجوع', 'Back')}
              </button>
            )}
            {step < 3 && (
              <button
                className="button button-primary"
                type="button"
                onClick={next}
                disabled={
                  (step === 1 && !addresses.length) || quoteError || !quote
                }
              >
                {pick(locale, 'متابعة', 'Continue')}{' '}
                <ForwardIcon size={16} aria-hidden="true" />
              </button>
            )}
            {step === 3 && canOrder && selectedAddress && (
              <form action={placeOrder} className="checkout-submit-form">
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="address"
                  value={selectedAddress.id}
                />
                <input type="hidden" name="method" value={method} />
                <input type="hidden" name="coupon" value={coupon} />
                <input type="hidden" name="requestKey" value={requestKey} />
                <SubmitOrder locale={locale} />
              </form>
            )}
          </div>
        </section>
        <aside className="checkout-summary-desktop">
          {summary('checkout-summary-desktop-title')}
        </aside>
        <details className="checkout-summary-mobile">
          <summary>
            {pick(locale, 'ملخص الطلب', 'Order summary')} ·{' '}
            {quote ? money(quote.total, locale) : '—'}
          </summary>
          {summary('checkout-summary-mobile-title')}
        </details>
      </div>
      <div className="checkout-mobile-cta">
        {step === 3 && canOrder && selectedAddress ? (
          <form action={placeOrder}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="address" value={selectedAddress.id} />
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="coupon" value={coupon} />
            <input type="hidden" name="requestKey" value={requestKey} />
            <SubmitOrder locale={locale} />
          </form>
        ) : (
          <button
            className="button button-primary"
            type="button"
            onClick={next}
            disabled={(step === 1 && !addresses.length) || quoteError || !quote}
          >
            {pick(locale, 'متابعة', 'Continue')}{' '}
            <ForwardIcon size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
