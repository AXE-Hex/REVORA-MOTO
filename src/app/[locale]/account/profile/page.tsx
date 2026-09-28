import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { updateCustomerProfile } from '@/app/account-actions';

export default async function Profile({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const [{ data: profile, error }, query] = await Promise.all([
    db!
      .from('profiles')
      .select('full_name,phone')
      .eq('id', user.id)
      .maybeSingle(),
    searchParams,
  ]);
  return (
    <section className="account-profile-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'بياناتك', 'YOUR DETAILS')}
        </span>
        <h2 className="page-title">
          {pick(locale, 'الملف الشخصي', 'Profile')}
        </h2>
      </div>
      {(error || query.error) && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ البيانات', 'Could not save profile')}
        </p>
      )}
      {query.saved && (
        <p className="notice">
          {pick(locale, 'تم حفظ الملف الشخصي', 'Profile saved')}
        </p>
      )}
      <form
        action={updateCustomerProfile}
        className="form-stack panel account-profile-form"
      >
        <input type="hidden" name="locale" value={locale} />
        <label className="field-label">
          {pick(locale, 'الاسم الكامل', 'Full name')}
          <input
            className="input"
            name="full_name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={profile?.full_name || ''}
          />
        </label>
        <label className="field-label">
          {pick(locale, 'البريد الإلكتروني', 'Email')}
          <input
            className="input"
            type="email"
            value={user.email || ''}
            disabled
          />
        </label>
        <label className="field-label">
          {pick(locale, 'الهاتف', 'Phone')}
          <input
            className="input"
            name="phone"
            inputMode="tel"
            maxLength={20}
            defaultValue={profile?.phone || ''}
          />
        </label>
        <button className="button button-accent" type="submit">
          {pick(locale, 'حفظ', 'Save')}
        </button>
      </form>
    </section>
  );
}
