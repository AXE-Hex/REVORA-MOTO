import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { supabase, currentUser } from '@/lib/supabase/server';
import { isLocale, pick, money } from '@/lib/i18n';
import { reserve } from '@/app/actions';
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
  const [{ data: bike }, { data: branches }] = await Promise.all([
    db.from('public_motorcycles').select('*').eq('id', id).maybeSingle(),
    db.from('branches').select('id,name_ar,name_en').eq('active', true),
  ]);
  if (!bike || bike.availability !== 'available') notFound();
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/motorcycles`}>MOTORCYCLES</Link> / RESERVE
      </div>
      <span className="section-index">RESERVATION / {bike.year}</span>
      <h1 className="page-title">
        {pick(locale, 'احجز دراجتك', 'RESERVE YOUR RIDE')}
      </h1>
      <div className="two-column">
        <div className="panel">
          <h2>{pick(locale, bike.name_ar, bike.name_en)}</h2>
          <p>
            {pick(locale, 'العربون المطلوب', 'DEPOSIT REQUIRED')}:{' '}
            <strong>{money(bike.deposit_egp, locale)}</strong>
          </p>
          <p>
            {pick(
              locale,
              'سيبقى الدفع معلقاً حتى يؤكده مزود الدفع. سيتواصل معك فريق المبيعات.',
              'Your payment remains pending until verified by the provider. Our sales team will follow up.',
            )}
          </p>
        </div>
        <form action={reserve} className="form-stack panel">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="motorcycle" value={id} />
          <label className="field-label">
            {pick(locale, 'اختر الفرع', 'SELECT BRANCH')}
            <select className="input" name="branch" required>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {pick(locale, b.name_ar, b.name_en)}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-accent">
            {pick(locale, 'تأكيد طلب الحجز', 'CONFIRM RESERVATION')}
          </button>
        </form>
      </div>
    </div>
  );
}
