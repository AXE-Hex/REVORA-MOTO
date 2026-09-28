'use client';

import { useParams } from 'next/navigation';
import { DetailSkeleton } from '@/components/ui/skeletons';
import { isLocale, type Locale } from '@/lib/i18n';

export default function LocaleLoading() {
  const params = useParams<{ locale?: string }>();
  const raw = params?.locale;
  const locale: Locale = isLocale(raw || '') ? (raw as Locale) : 'ar';
  return (
    <section
      className="shell section-small"
      aria-label={locale === 'ar' ? 'جارٍ التحميل' : 'Loading'}
    >
      <DetailSkeleton locale={locale} />
    </section>
  );
}
