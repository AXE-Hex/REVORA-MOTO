import Link from 'next/link';
import { pick } from '@/lib/i18n';
import { AccountNavigation } from '@/components/account-navigation';

export function AccountFrame({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: 'ar' | 'en';
}) {
  return (
    <div className="account-shell shell section-small">
      <header className="account-shell-header">
        <div>
          <span className="section-index">REVORA / ACCOUNT</span>
          <h1>{pick(locale, 'حسابي', 'My account')}</h1>
        </div>
        <Link
          className="button button-secondary account-store-link"
          href={`/${locale}/shop`}
        >
          {pick(locale, 'متابعة التسوق', 'Continue shopping')}
        </Link>
      </header>
      <div className="account-shell-content">
        <AccountNavigation locale={locale} />
        <div className="account-main" id="account-content">
          {children}
        </div>
      </div>
    </div>
  );
}
