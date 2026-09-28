'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { pick } from '@/lib/i18n';

const sections = [
  ['overview', 'نظرة عامة', 'Overview'],
  ['profile', 'الملف الشخصي', 'Profile'],
  ['orders', 'طلباتي', 'Orders'],
  ['reservations', 'حجوزاتي', 'Reservations'],
  ['addresses', 'عناويني', 'Addresses'],
  ['garage', 'مرآبي', 'My garage'],
  ['wishlist', 'قائمة الرغبات', 'Wishlist'],
  ['reviews', 'تقييماتي', 'Reviews'],
  ['notifications', 'الإشعارات', 'Notifications'],
  ['returns', 'المرتجعات', 'Returns'],
  ['warranties', 'الضمان', 'Warranties'],
  ['coupons', 'سجل الخصومات', 'Discount history'],
] as const;

export function AccountNavigation({ locale }: { locale: 'ar' | 'en' }) {
  const pathname = usePathname();

  return (
    <nav
      className="account-navigation"
      aria-label={pick(locale, 'قائمة الحساب', 'Account navigation')}
    >
      {sections.map(([path, arabic, english]) => {
        const href =
          path === 'overview'
            ? `/${locale}/account`
            : `/${locale}/account/${path}`;
        const detailPath =
          (path === 'orders' && pathname.startsWith(`/${locale}/orders/`)) ||
          (path === 'reservations' &&
            pathname.startsWith(`/${locale}/reservations/`));
        const active =
          detailPath || pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className="account-navigation-link"
            href={href}
            key={path}
          >
            {pick(locale, arabic, english)}
          </Link>
        );
      })}
    </nav>
  );
}
