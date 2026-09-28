'use client';
import { useState, useTransition } from 'react';
import { ShoppingBag } from 'lucide-react';
import { addToCart } from '@/app/actions';
import type { Locale } from '@/lib/i18n';
import { money, pick } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
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
  const { showToast } = useToast();
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
                {v.stock < 1
                  ? `(${pick(locale, 'غير متوفر', 'Out of stock')})`
                  : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button
        variant="primary"
        disabled={disabled || pending || (variants.length > 0 && !variant)}
        loading={pending}
        loadingLabel={pick(locale, 'جارٍ الإضافة...', 'Adding...')}
        onClick={() =>
          start(async () => {
            const result = await addToCart(id, locale, variant || undefined);
            showToast(
              result.error
                ? { kind: 'error', message: result.error }
                : {
                    kind: 'success',
                    message: pick(
                      locale,
                      'أضيف المنتج إلى السلة',
                      'Added to cart',
                    ),
                  },
            );
          })
        }
      >
        <ShoppingBag size={18} />
        {pick(locale, 'أضف للسلة', 'ADD TO CART')}
      </Button>
    </>
  );
}
