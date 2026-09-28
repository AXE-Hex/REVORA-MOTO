import type { Locale } from '@/lib/i18n';

function loadingLabel(locale: Locale) {
  return locale === 'ar' ? 'جارٍ التحميل' : 'Loading';
}

export function ProductCardSkeleton({ locale }: { locale: Locale }) {
  return (
    <div
      className="skeleton-card"
      role="status"
      aria-label={loadingLabel(locale)}
    >
      <div className="skeleton skeleton-media" />
      <div className="skeleton skeleton-line" style={{ width: '42%' }} />
      <div className="skeleton skeleton-line" style={{ width: '78%' }} />
      <div className="skeleton skeleton-line" style={{ width: '55%' }} />
    </div>
  );
}

export function MotorcycleCardSkeleton({ locale }: { locale: Locale }) {
  return <ProductCardSkeleton locale={locale} />;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  locale,
}: {
  rows?: number;
  columns?: number;
  locale: Locale;
}) {
  return (
    <div
      className="table-skeleton"
      aria-busy="true"
      aria-label={loadingLabel(locale)}
    >
      {Array.from({ length: rows }, (_, row) => (
        <div className="table-skeleton-row" key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <div className="skeleton skeleton-line" key={column} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton({ locale }: { locale: Locale }) {
  return (
    <div
      className="detail-skeleton"
      aria-busy="true"
      aria-label={loadingLabel(locale)}
    >
      <div className="skeleton detail-skeleton-media" />
      <div>
        <div className="skeleton skeleton-line" style={{ width: '35%' }} />
        <div
          className="skeleton skeleton-line"
          style={{ width: '82%', height: 26 }}
        />
        <div className="skeleton skeleton-line" style={{ width: '55%' }} />
        <div
          className="skeleton skeleton-line"
          style={{ width: '100%', marginTop: 32 }}
        />
        <div className="skeleton skeleton-line" style={{ width: '72%' }} />
      </div>
    </div>
  );
}

export function DashboardMetricSkeleton({ locale }: { locale: Locale }) {
  return (
    <div
      className="metric-skeleton"
      aria-busy="true"
      aria-label={loadingLabel(locale)}
    >
      <div className="skeleton skeleton-line" style={{ width: '60%' }} />
      <div
        className="skeleton skeleton-line"
        style={{ width: '45%', height: 32 }}
      />
    </div>
  );
}

export function FormSectionSkeleton({ locale }: { locale: Locale }) {
  return (
    <div
      className="form-skeleton"
      aria-busy="true"
      aria-label={loadingLabel(locale)}
    >
      <div className="skeleton skeleton-line" style={{ width: '35%' }} />
      <div className="form-skeleton-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton form-skeleton-field" key={index} />
        ))}
      </div>
    </div>
  );
}
