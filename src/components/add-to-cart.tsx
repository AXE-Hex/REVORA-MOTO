'use client';
import { useState, useTransition } from 'react';
import { ShoppingBag } from 'lucide-react';
import { addToCart } from '@/app/actions';
import type { Locale } from '@/lib/i18n';
import { money, pick } from '@/lib/i18n';
type Variant = {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price_egp: number;
  stock: number;
};
export function AddToCart({
  id,
  locale,
  disabled,
  variants = [],
}: {
  id: string;
  locale: Locale;
  disabled: boolean;
  variants?: Variant[];
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState(
    variants.find((v) => v.stock > 0)?.id || '',
  );
  return (
    <>
      {variants.length > 0 && (
        <label className="field-label">
          {pick(locale, 'المقاس / الخيار', 'SIZE / OPTION')}
          <select
            className="input"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stock < 1}>
                {Object.values(v.attributes).join(' / ') || v.sku} —{' '}
                {money(v.price_egp, locale)}{' '}
                {v.stock < 1 ? '(Out of stock)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        disabled={disabled || pending || (variants.length > 0 && !variant)}
        className="button button-accent"
        onClick={() =>
          start(async () => {
            const result = await addToCart(id, locale, variant || undefined);
            setMessage(
              result.error || pick(locale, 'أضيف إلى السلة', 'Added to cart'),
            );
          })
        }
      >
        <ShoppingBag size={18} />
        {pending
          ? pick(locale, 'جارٍ الإضافة...', 'ADDING...')
          : pick(locale, 'أضف للسلة', 'ADD TO CART')}
      </button>
      {message && (
        <p
          role="status"
          className={message.includes('sign') ? 'notice error' : 'notice'}
        >
          {message}
        </p>
      )}
    </>
  );
}
