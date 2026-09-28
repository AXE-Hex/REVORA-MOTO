import type { ReactNode } from 'react';
import { money, pick, type Locale } from '@/lib/i18n';
import { formatNumber } from '@/lib/format';

export type CommerceKind =
  | 'discount'
  | 'new'
  | 'bestseller'
  | 'limited'
  | 'out-of-stock'
  | 'reserved'
  | 'used'
  | 'info';

const labels: Record<CommerceKind, { ar: string; en: string }> = {
  discount: { ar: 'خصم', en: 'OFF' },
  new: { ar: 'جديد', en: 'NEW' },
  bestseller: { ar: 'الأكثر طلبًا', en: 'BESTSELLER' },
  limited: { ar: 'كمية محدودة', en: 'LIMITED' },
  'out-of-stock': { ar: 'غير متوفر', en: 'OUT OF STOCK' },
  reserved: { ar: 'محجوز', en: 'RESERVED' },
  used: { ar: 'مستعملة', en: 'USED' },
  info: { ar: 'معلومة', en: 'INFO' },
};

export function CommerceBadge({
  kind,
  locale,
  value,
}: {
  kind: CommerceKind;
  locale: Locale;
  value?: string | number;
}) {
  const label = labels[kind][locale];
  const content =
    kind === 'discount' && value != null
      ? locale === 'ar'
        ? `خصم ${formatNumber(Number(value), locale, { maximumFractionDigits: 1 })}%`
        : `${formatNumber(Number(value), locale, { maximumFractionDigits: 1 })}% OFF`
      : value != null && kind === 'limited'
        ? locale === 'ar'
          ? `متبقي ${formatNumber(Number(value), locale)}`
          : `${formatNumber(Number(value), locale)} LEFT`
        : label;
  return (
    <span className="commerce-badge" data-kind={kind}>
      {content}
    </span>
  );
}

export function BadgeStrip({
  children,
  label,
  className = '',
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`badge-strip ${className}`.trim()} aria-label={label}>
      {children}
    </div>
  );
}

export function PriceBlock({
  price,
  originalPrice,
  locale,
}: {
  price: number;
  originalPrice?: number | null;
  locale: Locale;
}) {
  const discounted = originalPrice != null && originalPrice > price;
  const savings = discounted ? originalPrice - price : 0;
  return (
    <div
      className="price-block"
      aria-label={locale === 'ar' ? 'السعر' : 'Price'}
    >
      <span className="price-label">{pick(locale, 'السعر', 'PRICE')}</span>
      <strong>{money(price, locale)}</strong>
      {discounted && <del>{money(originalPrice, locale)}</del>}
      {discounted && (
        <small>
          {locale === 'ar'
            ? `وفّر ${money(savings, locale)}`
            : `Save ${money(savings, locale)}`}
        </small>
      )}
    </div>
  );
}
