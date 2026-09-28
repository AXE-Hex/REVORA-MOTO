import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { adminAreas } from '@/lib/admin-navigation';
import { isLocale, pick } from '@/lib/i18n';
import { currentUser, supabase } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const currentPath = (await headers()).get('x-revora-pathname') || '';
  const user = await currentUser();
  const db = await supabase();
  if (!user || !db) notFound();

  const permissions = [...new Set(adminAreas.map((area) => area[3]))];
  const checks = await Promise.all(
    permissions.map(async (permission) => {
      const { data, error } = await db.rpc('has_permission', {
        p_permission: permission,
      });
      return [permission, !error && Boolean(data)] as const;
    }),
  );
  const granted = new Set(
    checks.filter(([, allowed]) => allowed).map(([permission]) => permission),
  );
  if (granted.size === 0) notFound();

  return (
    <div className="admin-layout">
      <aside
        className="admin-sidebar"
        aria-label={pick(locale, 'التنقل الإداري', 'Admin navigation')}
      >
        <Link className="admin-brand" href={`/${locale}/admin`}>
          <span className="mark" aria-hidden="true">
            R<span className="mark-slash">/</span>
          </span>
          <span>
            REVORA<small>MOTO · ADMIN</small>
          </span>
        </Link>
        <nav className="admin-nav">
          <Link
            className="admin-nav-link"
            href={`/${locale}/admin`}
            aria-current={
              currentPath === `/${locale}/admin` ? 'page' : undefined
            }
          >
            {pick(locale, 'نظرة عامة', 'Overview')}
          </Link>
          {adminAreas
            .filter(([, , , permission]) => granted.has(permission))
            .map(([slug, english, arabic]) => {
              const href = `/${locale}/admin/${slug}`;
              const active =
                currentPath === href || currentPath.startsWith(`${href}/`);
              return (
                <Link
                  className="admin-nav-link"
                  href={href}
                  key={slug}
                  aria-current={active ? 'page' : undefined}
                >
                  {pick(locale, arabic, english)}
                </Link>
              );
            })}
        </nav>
        <Link className="admin-store-link" href={`/${locale}`}>
          {pick(locale, 'العودة إلى المتجر', 'Back to storefront')}
        </Link>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar">
          <span className="admin-topbar-label">
            {pick(locale, 'إدارة المتجر', 'Store operations')}
          </span>
          <span className="admin-user" dir="ltr">
            {user.email}
          </span>
          <div className="admin-topbar-actions">
            <Link
              className="admin-topbar-link"
              href={locale === 'ar' ? '/en/admin' : '/ar/admin'}
            >
              {locale === 'ar' ? 'English' : 'العربية'}
            </Link>
            <Link className="admin-topbar-link" href={`/${locale}`}>
              {pick(locale, 'المتجر', 'Storefront')}
            </Link>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </section>
    </div>
  );
}
