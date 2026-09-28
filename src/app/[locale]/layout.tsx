import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  Instagram,
  ArrowUpRight,
} from 'lucide-react';
import { copy, isLocale, pick, type Locale } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui/toast-provider';

export async function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }];
}
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = copy[locale];
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-revora-pathname') ?? '';
  const adminRoot = `/${locale}/admin`;
  if (pathname === adminRoot || pathname.startsWith(`${adminRoot}/`)) {
    return (
      <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <ToastProvider locale={locale}>
          <main className="admin-main">{children}</main>
        </ToastProvider>
      </div>
    );
  }
  return (
    <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <ToastProvider locale={locale}>
        <div className="topline">
          <span>
            {locale === 'ar'
              ? 'عالم جديد للقيادة يبدأ هنا'
              : 'THE ROAD STARTS HERE'}
          </span>
          <span>
            {locale === 'ar' ? 'القاهرة، مصر' : 'CAIRO, EGYPT'}{' '}
            <span className="topline-dot">●</span>
          </span>
        </div>
        <header className="site-header">
          <div className="shell header-inner">
            <Link
              href={`/${locale}`}
              className="wordmark"
              aria-label="REVORA MOTO home"
            >
              <span className="mark">
                R<span className="mark-slash">/</span>
              </span>
              <span>
                REVORA<small>MOTO</small>
              </span>
            </Link>
            <nav className="desktop-nav" aria-label="Main navigation">
              <Link href={`/${locale}/motorcycles`}>{t.motorcycles}</Link>
              <Link href={`/${locale}/motorcycles/new`}>{t.new}</Link>
              <Link href={`/${locale}/motorcycles/used`}>{t.used}</Link>
              <Link href={`/${locale}/shop`}>{t.shop}</Link>
              <Link href={`/${locale}/fitment`}>{t.garage}</Link>
            </nav>
            <div className="header-actions">
              <Link href={`/${locale}/search`} aria-label={t.search}>
                <Search size={20} />
              </Link>
              <Link href={`/${locale}/cart`} aria-label={t.cart}>
                <ShoppingBag size={20} />
              </Link>
              <Link href={`/${locale}/account`} aria-label={t.account}>
                <UserRound size={20} />
              </Link>
              <Link
                className="lang-switch"
                href={locale === 'ar' ? '/en' : '/ar'}
              >
                {locale === 'ar' ? 'EN' : 'عربي'}
              </Link>
            </div>
            <details className="mobile-menu">
              <summary aria-label={pick(locale, 'فتح القائمة', 'Open menu')}>
                <Menu size={23} />
              </summary>
              <nav
                aria-label={pick(locale, 'روابط المتجر', 'Store navigation')}
              >
                <Link href={`/${locale}/motorcycles`}>{t.motorcycles}</Link>
                <Link href={`/${locale}/shop`}>{t.shop}</Link>
                <Link href={`/${locale}/fitment`}>{t.garage}</Link>
                <Link href={`/${locale}/account`}>{t.account}</Link>
              </nav>
            </details>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="shell">
            <div className="footer-top">
              <div>
                <div className="wordmark footer-mark">
                  <span className="mark">
                    R<span className="mark-slash">/</span>
                  </span>
                  <span>
                    REVORA<small>MOTO</small>
                  </span>
                </div>
                <p>
                  {locale === 'ar'
                    ? 'الشغف بالدراجات يجمعنا. اختر رحلتك التالية بثقة.'
                    : 'Built for the ride. Find your next machine with confidence.'}
                </p>
              </div>
              <div className="footer-links">
                <div>
                  <strong>{t.explore}</strong>
                  <Link href={`/${locale}/motorcycles`}>{t.motorcycles}</Link>
                  <Link href={`/${locale}/shop`}>{t.shop}</Link>
                  <Link href={`/${locale}/brands`}>
                    {locale === 'ar' ? 'العلامات التجارية' : 'Brands'}
                  </Link>
                </div>
                <div>
                  <strong>{locale === 'ar' ? 'المساعدة' : 'SUPPORT'}</strong>
                  <Link href={`/${locale}/contact`}>{t.contact}</Link>
                  <Link href={`/${locale}/faq`}>FAQ</Link>
                  <Link href={`/${locale}/returns`}>
                    {locale === 'ar' ? 'الاسترجاع' : 'Returns'}
                  </Link>
                </div>
                <div>
                  <strong>{locale === 'ar' ? 'قانوني' : 'LEGAL'}</strong>
                  <Link href={`/${locale}/privacy`}>
                    {locale === 'ar' ? 'الخصوصية' : 'Privacy'}
                  </Link>
                  <Link href={`/${locale}/terms`}>
                    {locale === 'ar' ? 'الشروط' : 'Terms'}
                  </Link>
                  <Link href={`/${locale}/warranty`}>
                    {locale === 'ar' ? 'الضمان' : 'Warranty'}
                  </Link>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} REVORA MOTO</span>
              <span>CAIRO · EGYPT</span>
              <span className="footer-social">
                <Instagram size={18} />
                <ArrowUpRight size={18} />
              </span>
            </div>
          </div>
        </footer>
      </ToastProvider>
    </div>
  );
}
