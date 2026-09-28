'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { isLocale, pick, type Locale } from '@/lib/i18n';

function useRouteLocale() {
  const params = useParams<{ locale?: string }>();
  const raw = params?.locale;
  return isLocale(raw || '') ? (raw as Locale) : 'ar';
}

export function RouteError({ reset }: { reset: () => void }) {
  const locale = useRouteLocale();
  return (
    <section className="route-feedback shell" role="alert">
      <span className="section-index">
        REVORA / {pick(locale, 'خطأ', 'ERROR')}
      </span>
      <h1 className="page-title">
        {pick(locale, 'لم يتم تحميل الصفحة', 'This page did not load')}
      </h1>
      <p>
        {pick(
          locale,
          'حدثت مشكلة أثناء عرض هذه الصفحة. حاول مرة أخرى.',
          'Something interrupted this page. Please try again.',
        )}
      </p>
      <div className="route-feedback-actions">
        <Button onClick={reset} variant="primary">
          {pick(locale, 'إعادة المحاولة', 'Try again')}
        </Button>
        <Link className="button button-secondary" href={`/${locale}`}>
          {pick(locale, 'العودة للرئيسية', 'Return home')}
        </Link>
      </div>
    </section>
  );
}

export function RouteNotFound() {
  const locale = useRouteLocale();
  return (
    <section className="route-feedback shell">
      <span className="section-index">REVORA / 404</span>
      <h1 className="page-title">
        {pick(locale, 'الصفحة غير موجودة', 'Page not found')}
      </h1>
      <p>
        {pick(
          locale,
          'قد يكون الرابط غير صحيح أو أن الصفحة لم تعد متاحة.',
          'This link may be incorrect or the page may have moved.',
        )}
      </p>
      <Link className="button button-primary" href={`/${locale}`}>
        {pick(locale, 'العودة للرئيسية', 'Return home')}
      </Link>
    </section>
  );
}
