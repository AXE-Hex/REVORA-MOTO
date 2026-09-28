import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function ReservationsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { error } = await searchParams;
  redirect(
    `/${locale}/account/reservations${error ? `?error=${encodeURIComponent(error)}` : ''}`,
  );
}
