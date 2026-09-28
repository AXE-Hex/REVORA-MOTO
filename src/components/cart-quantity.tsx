'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { updateCartQuantity } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { money, pick, type Locale } from '@/lib/i18n';

export function CartQuantity({
  id,
  quantity,
  stock,
  locale,
}: {
  id: string;
  quantity: number;
  stock: number;
  locale: Locale;
}) {
  const [value, setValue] = useState(quantity);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function update(next: number) {
    if (pending || next < 1 || next > 99 || next === value) return;
    startTransition(async () => {
      const result = await updateCartQuantity(id, next, locale);
      if (result.error) {
        showToast({ kind: 'error', message: result.error });
        return;
      }
      setValue(next);
      router.refresh();
    });
  }

  return (
    <div
      className="cart-quantity-control"
      role="group"
      aria-label={pick(locale, 'كمية المنتج', 'Product quantity')}
      aria-busy={pending}
    >
      <Button
        variant="icon"
        type="button"
        disabled={pending || value <= 1}
        aria-label={pick(locale, 'تقليل الكمية', 'Decrease quantity')}
        onClick={() => update(value - 1)}
      >
        <Minus size={16} aria-hidden="true" />
      </Button>
      <output className="cart-quantity-value" aria-live="polite">
        {value}
      </output>
      <Button
        variant="icon"
        type="button"
        disabled={pending || value >= Math.min(stock, 99)}
        aria-label={pick(locale, 'زيادة الكمية', 'Increase quantity')}
        onClick={() => update(value + 1)}
      >
        <Plus size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}

export function CartMobileQuantityAndTotal({
  id,
  quantity,
  stock,
  unitPrice,
  locale,
}: {
  id: string;
  quantity: number;
  stock: number;
  unitPrice: number;
  locale: Locale;
}) {
  const [value, setValue] = useState(quantity);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function update(next: number) {
    if (pending || next < 1 || next > Math.min(stock, 99) || next === value)
      return;
    const previous = value;
    setValue(next);
    window.dispatchEvent(
      new CustomEvent('revora:cart-quantity', {
        detail: unitPrice * (next - previous),
      }),
    );
    startTransition(async () => {
      const result = await updateCartQuantity(id, next, locale);
      if (result.error) {
        setValue(previous);
        window.dispatchEvent(
          new CustomEvent('revora:cart-quantity', {
            detail: unitPrice * (previous - next),
          }),
        );
        showToast({ kind: 'error', message: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="cart-mobile-quantity">
        <span>{pick(locale, 'الكمية', 'Quantity')}</span>
        <div
          className="cart-quantity-control"
          role="group"
          aria-label={pick(locale, 'كمية المنتج', 'Product quantity')}
          aria-busy={pending}
        >
          <Button
            variant="icon"
            type="button"
            disabled={pending || value <= 1}
            aria-label={pick(locale, 'تقليل الكمية', 'Decrease quantity')}
            onClick={() => update(value - 1)}
          >
            <Minus size={16} aria-hidden="true" />
          </Button>
          <output className="cart-quantity-value" aria-live="polite">
            {value}
          </output>
          <Button
            variant="icon"
            type="button"
            disabled={pending || value >= Math.min(stock, 99)}
            aria-label={pick(locale, 'زيادة الكمية', 'Increase quantity')}
            onClick={() => update(value + 1)}
          >
            <Plus size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="cart-mobile-line-total">
        <span>{pick(locale, 'إجمالي السطر', 'Line total')}</span>
        <strong aria-live="polite">{money(unitPrice * value, locale)}</strong>
      </div>
    </>
  );
}

export function CartMobileCheckout({
  initialTotal,
  locale,
}: {
  initialTotal: number;
  locale: Locale;
}) {
  const [total, setTotal] = useState(initialTotal);
  useEffect(() => {
    const updateTotal = (event: Event) => {
      const delta = (event as CustomEvent<unknown>).detail;
      if (typeof delta === 'number' && Number.isFinite(delta)) {
        setTotal((current) => Math.max(0, current + delta));
      }
    };
    window.addEventListener('revora:cart-quantity', updateTotal);
    return () =>
      window.removeEventListener('revora:cart-quantity', updateTotal);
  }, []);
  return (
    <div className="cart-mobile-checkout">
      <div>
        <span>{pick(locale, 'إجمالي المنتجات', 'Merchandise subtotal')}</span>
        <strong aria-live="polite">{money(total, locale)}</strong>
      </div>
      <Link className="button button-primary" href={`/${locale}/checkout`}>
        {pick(locale, 'متابعة إلى الدفع', 'Continue to checkout')}
      </Link>
    </div>
  );
}
