import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { addAddress } from '@/app/actions';
export default async function Addresses({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const { data: addresses } = await (await supabase())!
    .from('addresses')
    .select('*')
    .eq('user_id', user.id);
  const { error } = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/account`}>ACCOUNT</Link> / ADDRESSES
      </div>
      <h1 className="page-title">{pick(locale, 'عناويني', 'MY ADDRESSES')}</h1>
      {error && <div className="notice error">{error}</div>}
      <div className="two-column">
        <div>
          {addresses?.map((a) => (
            <div className="panel" key={a.id} style={{ marginBottom: 12 }}>
              <strong>{a.name}</strong>
              <p>
                {a.line1}, {a.city}, {a.governorate}
              </p>
              <small>{a.phone}</small>
            </div>
          ))}
        </div>
        <form action={addAddress} className="form-stack panel">
          <h2>{pick(locale, 'عنوان جديد', 'NEW ADDRESS')}</h2>
          <input type="hidden" name="locale" value={locale} />
          {[
            ['name', pick(locale, 'الاسم', 'NAME')],
            ['line1', pick(locale, 'العنوان', 'ADDRESS')],
            ['city', pick(locale, 'المدينة', 'CITY')],
            ['governorate', pick(locale, 'المحافظة', 'GOVERNORATE')],
            ['phone', pick(locale, 'الهاتف', 'PHONE')],
          ].map(([name, label]) => (
            <label key={name} className="field-label">
              {label}
              <input className="input" name={name} required />
            </label>
          ))}
          <button className="button button-accent">
            {pick(locale, 'حفظ العنوان', 'SAVE ADDRESS')}
          </button>
        </form>
      </div>
    </div>
  );
}
