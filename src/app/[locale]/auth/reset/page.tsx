import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n';
import { ResetForm } from '@/components/reset-form';
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="shell">
      <ResetForm locale={locale} />
    </div>
  );
}
