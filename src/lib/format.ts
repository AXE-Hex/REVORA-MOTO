import type { Locale } from '@/lib/i18n';

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    options,
  ).format(safeNumber(value));
}

export function formatPercent(value: number, locale: Locale) {
  return formatNumber(value / 100, locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
}

export function formatDistance(kilometers: number, locale: Locale) {
  const amount = formatNumber(kilometers, locale, { maximumFractionDigits: 0 });
  return locale === 'ar' ? `${amount} كم` : `${amount} km`;
}

export function formatDate(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.valueOf())) return '—';
  return new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    options,
  ).format(date);
}
