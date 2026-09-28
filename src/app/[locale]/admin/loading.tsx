'use client';

import { useParams } from 'next/navigation';
import {
  DashboardMetricSkeleton,
  TableSkeleton,
} from '@/components/ui/skeletons';
import { isLocale, type Locale } from '@/lib/i18n';

export default function AdminLoading() {
  const params = useParams<{ locale?: string }>();
  const raw = params?.locale;
  const locale: Locale = isLocale(raw || '') ? (raw as Locale) : 'ar';
  return (
    <div
      className="shell section-small"
      aria-label={locale === 'ar' ? 'جارٍ تحميل لوحة الإدارة' : 'Loading admin'}
    >
      <div className="admin-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <DashboardMetricSkeleton locale={locale} key={index} />
        ))}
      </div>
      <div className="panel" style={{ marginTop: 24 }}>
        <TableSkeleton locale={locale} />
      </div>
    </div>
  );
}
