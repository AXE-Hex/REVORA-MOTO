import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import { isLocale } from '@/lib/i18n';
import { AccountFrame } from '@/components/account-frame';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/account`);

  return <AccountFrame locale={locale}>{children}</AccountFrame>;
}
