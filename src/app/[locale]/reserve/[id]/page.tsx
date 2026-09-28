import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import {
  ReservationFlow,
  type ReservationBike,
  type ReservationBranch,
} from '@/components/reservation-flow';

export default async function ReservePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/reserve/${id}`);
  const db = await supabase();
  if (!db) notFound();
  const [{ data: rawBike }, { data: rawBranches }, { data: profile }] =
    await Promise.all([
      db
        .from('public_motorcycles')
        .select(
          'id,slug,name_ar,name_en,year,condition,deposit_egp,image_url,availability',
        )
        .eq('id', id)
        .maybeSingle(),
      db
        .from('branches')
        .select('id,name_ar,name_en,address_ar,address_en')
        .eq('active', true)
        .order('name_en'),
      db
        .from('profiles')
        .select('full_name,phone')
        .eq('id', user.id)
        .maybeSingle(),
    ]);
  if (!rawBike || rawBike.availability !== 'available') notFound();
  const bike: ReservationBike = {
    id: rawBike.id,
    slug: rawBike.slug,
    name: pick(locale, rawBike.name_ar, rawBike.name_en),
    year: rawBike.year,
    condition: rawBike.condition,
    deposit: Number(rawBike.deposit_egp),
    image: rawBike.image_url,
  };
  const branches: ReservationBranch[] = (rawBranches || []).map((branch) => ({
    id: branch.id,
    name: pick(locale, branch.name_ar, branch.name_en),
    address: pick(locale, branch.address_ar, branch.address_en) || null,
  }));
  return (
    <main className="shell section-small reservation-page">
      <div className="breadcrumbs">
        <Link href={`/${locale}`}>REVORA</Link> /{' '}
        <Link href={`/${locale}/motorcycles`}>
          {pick(locale, 'الدراجات', 'MOTORCYCLES')}
        </Link>{' '}
        / {pick(locale, 'حجز', 'RESERVE')}
      </div>
      <span className="section-index">05 / RESERVATION</span>
      <h1 className="page-title">
        {pick(locale, 'احجز دراجتك', 'Reserve your motorcycle')}
      </h1>
      <ReservationFlow
        locale={locale}
        bike={bike}
        branches={branches}
        fullName={profile?.full_name || ''}
        email={user.email || ''}
        phone={profile?.phone || ''}
      />
    </main>
  );
}
