import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import {
  saveCheckoutRates,
  saveSiteSetting,
} from '@/app/admin-settings-actions';

const fields = [
  { key: 'contact_email', ar: 'البريد للتواصل', en: 'Contact email', max: 254 },
  { key: 'contact_phone', ar: 'هاتف التواصل', en: 'Contact phone', max: 32 },
  {
    key: 'support_hours_ar',
    ar: 'ساعات الدعم بالعربية',
    en: 'Support hours (Arabic)',
    max: 160,
  },
  {
    key: 'support_hours_en',
    ar: 'ساعات الدعم بالإنجليزية',
    en: 'Support hours (English)',
    max: 160,
  },
  {
    key: 'announcement_ar',
    ar: 'إعلان الموقع بالعربية',
    en: 'Announcement (Arabic)',
    max: 300,
  },
  {
    key: 'announcement_en',
    ar: 'إعلان الموقع بالإنجليزية',
    en: 'Announcement (English)',
    max: 300,
  },
] as const;

export default async function AdminSettings({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'settings.write',
  });
  if (!allowed) notFound();
  const { data: rows, error } = await db!
    .from('site_settings')
    .select('key,value,updated_at')
    .in('key', [
      ...fields.map((f) => f.key),
      'shipping_flat_egp',
      'tax_rate_percent',
    ]);
  const values = new Map(
    (rows || []).map((row) => [
      row.key,
      typeof row.value === 'string' ? row.value : '',
    ]),
  );
  const shipping = rows?.find((row) => row.key === 'shipping_flat_egp')?.value;
  const tax = rows?.find((row) => row.key === 'tax_rate_percent')?.value;
  const query = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / SETTINGS
      </div>
      <h1 className="page-title">
        {pick(locale, 'إعدادات الموقع', 'SITE SETTINGS')}
      </h1>
      <p>
        {pick(
          locale,
          'إعدادات التواصل ورسوم الشحن والضرائب المطبقة على الطلبات الجديدة.',
          'Contact details and checkout rates for new orders.',
        )}
      </p>
      {(error || query.error) && (
        <p className="notice error">
          {pick(
            locale,
            'تعذر تحميل الإعدادات أو حفظها',
            'Could not load or save settings',
          )}
        </p>
      )}
      {query.saved && (
        <p className="notice">{pick(locale, 'تم الحفظ', 'Saved')}</p>
      )}
      <div className="two-column">
        {fields.map((field) => (
          <form
            className="panel form-stack"
            action={saveSiteSetting}
            key={field.key}
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="key" value={field.key} />
            <label className="field-label">
              {pick(locale, field.ar, field.en)}
              <input
                className="input"
                type={field.key === 'contact_email' ? 'email' : 'text'}
                name="value"
                maxLength={field.max}
                defaultValue={values.get(field.key) || ''}
              />
            </label>
            <button className="button button-accent" type="submit">
              {pick(locale, 'حفظ', 'SAVE')}
            </button>
          </form>
        ))}
      </div>
      <form
        className="panel form-stack"
        action={saveCheckoutRates}
        style={{ maxWidth: 650, marginTop: 24 }}
      >
        <h2>{pick(locale, 'رسوم إتمام الطلب', 'CHECKOUT RATES')}</h2>
        <p>
          {pick(
            locale,
            'القيم المعتمدة بالجنيه المصري وتُحفظ في لقطة كل طلب جديد. لا تتغير الطلبات السابقة.',
            'Amounts are in EGP and saved with each new order. Existing orders keep their original totals.',
          )}
        </p>
        <input type="hidden" name="locale" value={locale} />
        <label className="field-label">
          {pick(locale, 'رسوم الشحن الثابتة (ج.م)', 'Flat shipping (EGP)')}
          <input
            className="input"
            type="number"
            name="shipping"
            min="0"
            max="10000"
            step="0.01"
            required
            defaultValue={typeof shipping === 'number' ? shipping : 0}
          />
        </label>
        <label className="field-label">
          {pick(locale, 'نسبة الضريبة المطبقة (%)', 'Configured tax rate (%)')}
          <input
            className="input"
            type="number"
            name="tax"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={typeof tax === 'number' ? tax : 0}
          />
        </label>
        <button className="button button-accent" type="submit">
          {pick(locale, 'حفظ الرسوم', 'SAVE RATES')}
        </button>
      </form>
    </div>
  );
}
