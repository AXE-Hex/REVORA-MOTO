'use client';

import { useEffect, useMemo, useState } from 'react';
import { pick, type Locale } from '@/lib/i18n';

type Range = '7d' | '30d' | '90d' | '12m';
type Point = {
  bucket_date: string;
  revenue_egp: number | string;
  orders: number | string;
  reservations: number | string;
  customers: number | string;
  captured_payments_egp: number | string;
};
const ranges: Range[] = ['7d', '30d', '90d', '12m'];
const valueOf = (point: Point, key: keyof Omit<Point, 'bucket_date'>) =>
  Number(point[key]) || 0;

function linePath(values: number[], width: number, height: number) {
  if (!values.length) return '';
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const spread = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / spread) * (height - 16) - 8;
      return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function Chart({
  locale,
  title,
  values,
  dates,
  tone = 'default',
}: {
  locale: Locale;
  title: string;
  values: number[];
  dates: string[];
  tone?: 'default' | 'secondary';
}) {
  const path = linePath(values, 640, 150);
  const area = values.length ? `${path} L640,150 L0,150 Z` : '';
  const max = Math.max(1, ...values);
  return (
    <figure
      className={`admin-analytics-chart ${tone === 'secondary' ? 'is-secondary' : ''}`}
    >
      <figcaption>{title}</figcaption>
      <svg
        viewBox="0 0 640 170"
        role="img"
        aria-label={title}
        preserveAspectRatio="none"
      >
        <path className="admin-analytics-area" d={area} />
        <path className="admin-analytics-line" d={path} />
        {values.map((value, index) => {
          const x =
            values.length === 1 ? 320 : (index / (values.length - 1)) * 640;
          const y =
            150 -
            ((value - Math.min(0, ...values)) /
              Math.max(1, max - Math.min(0, ...values))) *
              134 -
            8;
          return (
            <circle
              key={`${dates[index]}-${index}`}
              cx={x}
              cy={y}
              r={values.length > 30 ? 2.2 : 3.4}
            >
              <title>{`${dates[index]}: ${value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="admin-analytics-axis" aria-hidden="true">
        <span>{dates[0]}</span>
        <span>{dates[Math.floor((dates.length - 1) / 2)]}</span>
        <span>{dates[dates.length - 1]}</span>
      </div>
    </figure>
  );
}

export function AdminAnalyticsCharts({ locale }: { locale: Locale }) {
  const [range, setRange] = useState<Range>('30d');
  const [points, setPoints] = useState<Point[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    fetch(`/api/admin/analytics?range=${range}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('analytics request failed');
        return (await response.json()) as Point[];
      })
      .then((result) => {
        if (!Array.isArray(result))
          throw new Error('invalid analytics response');
        setPoints(result);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setState('error');
      });
    return () => controller.abort();
  }, [range, retry]);

  const dates = useMemo(
    () =>
      points.map((point) =>
        new Intl.DateTimeFormat(
          locale === 'ar' ? 'ar-EG' : 'en-GB',
          range === '12m'
            ? { month: 'short', year: '2-digit', timeZone: 'UTC' }
            : { day: 'numeric', month: 'short', timeZone: 'UTC' },
        ).format(new Date(`${point.bucket_date}T00:00:00Z`)),
      ),
    [locale, points, range],
  );
  const hasData = points.some((point) =>
    (
      [
        'revenue_egp',
        'orders',
        'reservations',
        'customers',
        'captured_payments_egp',
      ] as const
    ).some((key) => valueOf(point, key) > 0),
  );
  const totals = useMemo(
    () =>
      points.reduce(
        (result, point) => ({
          orders: result.orders + valueOf(point, 'orders'),
          reservations: result.reservations + valueOf(point, 'reservations'),
          customers: result.customers + valueOf(point, 'customers'),
          payments: result.payments + valueOf(point, 'captured_payments_egp'),
        }),
        { orders: 0, reservations: 0, customers: 0, payments: 0 },
      ),
    [points],
  );

  return (
    <section
      className="panel admin-analytics-panel"
      aria-labelledby="admin-analytics-title"
      aria-busy={state === 'loading'}
    >
      <div className="admin-analytics-header">
        <div>
          <h2 id="admin-analytics-title">
            {pick(locale, 'الاتجاهات التشغيلية', 'OPERATING TRENDS')}
          </h2>
          <p>
            {pick(
              locale,
              'تجميع زمني من قاعدة البيانات، بتوقيت UTC.',
              'Database aggregates, bucketed in UTC.',
            )}
          </p>
        </div>
        <div
          className="admin-analytics-ranges"
          role="group"
          aria-label={pick(locale, 'الفترة الزمنية', 'Time range')}
        >
          {ranges.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={range === item}
              className={range === item ? 'is-active' : ''}
              onClick={() => setRange(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {state === 'loading'
          ? pick(locale, 'جارٍ تحميل المخططات', 'Loading charts')
          : state === 'error'
            ? pick(locale, 'تعذر تحميل المخططات', 'Chart data failed to load')
            : ''}
      </div>
      {state === 'loading' ? (
        <div className="admin-analytics-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : state === 'error' ? (
        <div className="notice error" role="alert">
          <span>
            {pick(
              locale,
              'تعذر تحميل التحليلات.',
              'Analytics could not be loaded.',
            )}
          </span>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            {pick(locale, 'إعادة المحاولة', 'Retry')}
          </button>
        </div>
      ) : !hasData ? (
        <p className="admin-analytics-empty">
          {pick(
            locale,
            'لا توجد بيانات لهذه الفترة.',
            'No analytics data for this period.',
          )}
        </p>
      ) : (
        <>
          <Chart
            locale={locale}
            title={pick(
              locale,
              'الإيرادات المحصلة حسب تاريخ التحصيل (ج.م)',
              'Captured order revenue by capture date (EGP)',
            )}
            values={points.map((point) => valueOf(point, 'revenue_egp'))}
            dates={dates}
          />
          <div className="admin-analytics-small-grid">
            <Chart
              locale={locale}
              title={pick(
                locale,
                `الطلبات · ${totals.orders}`,
                `Orders · ${totals.orders}`,
              )}
              values={points.map((point) => valueOf(point, 'orders'))}
              dates={dates}
              tone="secondary"
            />
            <Chart
              locale={locale}
              title={pick(
                locale,
                `الحجوزات · ${totals.reservations}`,
                `Reservations · ${totals.reservations}`,
              )}
              values={points.map((point) => valueOf(point, 'reservations'))}
              dates={dates}
              tone="secondary"
            />
            <Chart
              locale={locale}
              title={pick(
                locale,
                `عملاء جدد · ${totals.customers}`,
                `New customers · ${totals.customers}`,
              )}
              values={points.map((point) => valueOf(point, 'customers'))}
              dates={dates}
              tone="secondary"
            />
            <Chart
              locale={locale}
              title={pick(
                locale,
                `مدفوعات محصلة · ${totals.payments.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ج.م`,
                `Captured payments · ${totals.payments.toLocaleString('en-US')} EGP`,
              )}
              values={points.map((point) =>
                valueOf(point, 'captured_payments_egp'),
              )}
              dates={dates}
              tone="secondary"
            />
          </div>
          <ul className="sr-only">
            {points.map((point) => (
              <li key={point.bucket_date}>
                {point.bucket_date}:{' '}
                {pick(locale, 'إيراد الطلبات المحصل', 'Captured order revenue')}{' '}
                {valueOf(point, 'revenue_egp')};{' '}
                {pick(locale, 'الطلبات', 'orders')} {valueOf(point, 'orders')};{' '}
                {pick(locale, 'الحجوزات', 'reservations')}{' '}
                {valueOf(point, 'reservations')};{' '}
                {pick(locale, 'عملاء جدد', 'new customers')}{' '}
                {valueOf(point, 'customers')};{' '}
                {pick(locale, 'مدفوعات محصلة', 'captured payment volume')}{' '}
                {valueOf(point, 'captured_payments_egp')}.
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
