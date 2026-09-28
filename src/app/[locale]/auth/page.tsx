import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n';
import { AuthForm } from '@/components/auth-form';
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { next } = await searchParams;
  return (
    <div className="shell">
      <AuthForm locale={locale} next={next || `/${locale}/account`} />
    </div>
  );
}
