import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { pick } from '@/lib/i18n';
export function ReserveButton({
  id,
  locale,
  available,
}: {
  id: string;
  locale: Locale;
  available: boolean;
}) {
  return available ? (
    <Link className="button button-accent" href={`/${locale}/reserve/${id}`}>
      {pick(locale, 'احجز الدراجة', 'RESERVE MOTORCYCLE')} ↗
    </Link>
  ) : (
    <span className="button button-ghost">
      {pick(locale, 'محجوزة حالياً', 'CURRENTLY RESERVED')}
    </span>
  );
}
