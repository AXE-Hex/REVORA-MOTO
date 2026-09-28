import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { ConfirmationForm } from '@/components/confirmation-form';
import {
  deleteCustomerAddress,
  makeDefaultAddress,
  saveCustomerAddress,
} from '@/app/account-actions';

const fields = [
  ['name', 'name', 'الاسم', 'Name'],
  ['line1', 'line1', 'العنوان', 'Address line'],
  ['line2', 'line2', 'تفاصيل إضافية', 'Address line 2'],
  ['city', 'city', 'المدينة', 'City'],
  ['governorate', 'governorate', 'المحافظة', 'Governorate'],
  ['phone', 'phone', 'الهاتف', 'Phone'],
] as const;

export default async function Addresses({
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
  const [{ data: addresses, error }, query] = await Promise.all([
    db!
      .from('addresses')
      .select('id,name,line1,line2,city,governorate,phone,is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }),
    searchParams,
  ]);
  return (
    <section className="account-addresses-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'التوصيل', 'DELIVERY')}
        </span>
        <h2 className="page-title">
          {pick(locale, 'عناويني', 'My addresses')}
        </h2>
      </div>
      {(error || query.error) && (
        <p className="notice error">
          {pick(locale, 'تعذر تحديث العناوين', 'Could not update addresses')}
        </p>
      )}
      {query.saved && (
        <p className="notice">
          {pick(locale, 'تم حفظ العناوين', 'Addresses saved')}
        </p>
      )}
      <div className="two-column">
        <div className="account-address-list">
          {addresses?.map((address) => (
            <article className="panel account-address-card" key={address.id}>
              <header className="account-address-card-header">
                <div>
                  <h3>{address.name}</h3>
                  <p>
                    {[
                      address.line1,
                      address.line2,
                      address.city,
                      address.governorate,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <span>{address.phone}</span>
                </div>
                {address.is_default && (
                  <span className="account-active-label">
                    {pick(locale, 'العنوان الافتراضي', 'DEFAULT ADDRESS')}
                  </span>
                )}
              </header>
              <details className="account-address-edit">
                <summary>
                  {pick(locale, 'تعديل العنوان', 'Edit address')}
                </summary>
                <form action={saveCustomerAddress} className="form-stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={address.id} />
                  {fields.map(([key, name, ar, en]) => (
                    <label className="field-label" key={key}>
                      {pick(locale, ar, en)}
                      <input
                        className="input"
                        name={name}
                        required={key !== 'line2'}
                        maxLength={key === 'line1' ? 200 : 100}
                        defaultValue={address[key] || ''}
                      />
                    </label>
                  ))}
                  <label>
                    <input
                      type="checkbox"
                      name="is_default"
                      defaultChecked={address.is_default}
                    />{' '}
                    {pick(locale, 'العنوان الافتراضي', 'Default address')}
                  </label>
                  <button className="button button-primary" type="submit">
                    {pick(locale, 'حفظ التعديلات', 'Save changes')}
                  </button>
                </form>
              </details>
              <div className="account-address-actions">
                {!address.is_default && (
                  <form action={makeDefaultAddress}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={address.id} />
                    <button className="button button-secondary" type="submit">
                      {pick(locale, 'تعيين كافتراضي', 'Make default')}
                    </button>
                  </form>
                )}
                <ConfirmationForm
                  action={deleteCustomerAddress}
                  message={pick(
                    locale,
                    'هل تريد حذف هذا العنوان؟',
                    'Delete this address?',
                  )}
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={address.id} />
                  <button className="button button-danger-soft" type="submit">
                    {pick(locale, 'حذف العنوان', 'Delete address')}
                  </button>
                </ConfirmationForm>
              </div>
            </article>
          ))}
          {!addresses?.length && (
            <div className="panel account-empty-state">
              <h3>
                {pick(
                  locale,
                  'لا توجد عناوين محفوظة',
                  'No saved addresses yet',
                )}
              </h3>
              <p className="muted">
                {pick(
                  locale,
                  'أضف عنواناً لتسهيل إتمام طلباتك القادمة.',
                  'Save an address to speed up future checkouts.',
                )}
              </p>
            </div>
          )}
        </div>
        <form
          action={saveCustomerAddress}
          className="form-stack panel account-new-address-form"
        >
          <h2>{pick(locale, 'عنوان جديد', 'NEW ADDRESS')}</h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value="" />
          {fields.map(([key, name, ar, en]) => (
            <label className="field-label" key={key}>
              {pick(locale, ar, en)}
              <input
                className="input"
                name={name}
                required={key !== 'line2'}
                maxLength={key === 'line1' ? 200 : 100}
              />
            </label>
          ))}
          <label>
            <input type="checkbox" name="is_default" />{' '}
            {pick(locale, 'تعيين كعنوان افتراضي', 'Set as default')}
          </label>
          <button className="button button-primary" type="submit">
            {pick(locale, 'إضافة العنوان', 'Add address')}
          </button>
        </form>
      </div>
    </section>
  );
}
