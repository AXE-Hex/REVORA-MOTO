import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { motorcycles, type Motorcycle } from '@/lib/catalog';
import { isLocale, pick, money, type Locale } from '@/lib/i18n';

const specificationLabels: Record<string, [string, string]> = {
  fuel_tank_l: ['خزان الوقود (لتر)', 'Fuel tank (L)'],
  torque_nm: ['العزم (نيوتن متر)', 'Torque (Nm)'],
  wet_weight_kg: ['الوزن (كجم)', 'Wet weight (kg)'],
  seat_height_mm: ['ارتفاع المقعد (مم)', 'Seat height (mm)'],
  brakes: ['المكابح', 'Brakes'],
  suspension: ['التعليق', 'Suspension'],
  electronics: ['الإلكترونيات', 'Electronics'],
};

function specLabel(key: string, locale: Locale) {
  const known = specificationLabels[key];
  return known ? pick(locale, known[0], known[1]) : key.replaceAll('_', ' ');
}

export default async function Compare({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { ids } = await searchParams;
  const requested = (Array.isArray(ids) ? ids : [ids || ''])
    .flatMap((value) => value.split(','))
    .filter((value) => /^[0-9a-f-]{36}$/i.test(value));
  const selectedIds = [...new Set(requested)].slice(0, 4);
  const available = await motorcycles();
  const byId = new Map(available.map((bike) => [bike.id, bike]));
  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((bike): bike is Motorcycle => Boolean(bike));
  const specs = [
    ...new Set(selected.flatMap((bike) => Object.keys(bike.specs || {}))),
  ];
  const rows: {
    label: string;
    value: (bike: Motorcycle) => string | number;
  }[] = [
    { label: pick(locale, 'السنة', 'Year'), value: (bike) => bike.year },
    {
      label: pick(locale, 'سعة المحرك (سم³)', 'Engine capacity (cc)'),
      value: (bike) => bike.engine_cc ?? '—',
    },
    {
      label: pick(locale, 'القوة (حصان)', 'Power (hp)'),
      value: (bike) => bike.horsepower ?? '—',
    },
    {
      label: pick(locale, 'المسافة (كم)', 'Mileage (km)'),
      value: (bike) => bike.mileage_km ?? '—',
    },
    {
      label: pick(locale, 'الحالة', 'Condition'),
      value: (bike) =>
        bike.condition === 'new'
          ? pick(locale, 'جديدة', 'New')
          : pick(locale, 'مستعملة', 'Used'),
    },
    ...specs.map((key) => ({
      label: specLabel(key, locale),
      value: (bike: Motorcycle) => String(bike.specs?.[key] ?? '—'),
    })),
    {
      label: pick(locale, 'السعر', 'Price'),
      value: (bike) => money(bike.price_egp, locale),
    },
  ];

  return (
    <div className="shell section-small">
      <span className="section-index">REVORA / COMPARE</span>
      <h1 className="page-title">
        {pick(locale, 'قارن الدراجات', 'COMPARE MOTORCYCLES')}
      </h1>
      <p className="compare-intro">
        {pick(
          locale,
          'اختر حتى أربع دراجات، ثم اعرض مواصفاتها جنباً إلى جنب.',
          'Choose up to four motorcycles to view their specifications side by side.',
        )}
      </p>
      <form
        action={`/${locale}/compare`}
        method="get"
        className="panel compare-picker"
      >
        <fieldset>
          <legend>{pick(locale, 'اختر الدراجات', 'SELECT MOTORCYCLES')}</legend>
          <div className="compare-options">
            {available.map((bike) => (
              <label key={bike.id} className="compare-option">
                <input
                  type="checkbox"
                  name="ids"
                  value={bike.id}
                  defaultChecked={selectedIds.includes(bike.id)}
                />
                <span>{pick(locale, bike.name_ar, bike.name_en)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="button button-accent" type="submit">
          {pick(locale, 'عرض المقارنة', 'COMPARE SELECTED')} ↗
        </button>
      </form>
      {requested.length > 4 && (
        <p className="notice">
          {pick(
            locale,
            'يمكن مقارنة أربع دراجات فقط؛ عُرضت أول أربع اختيارات.',
            'You can compare up to four motorcycles; the first four are shown.',
          )}
        </p>
      )}
      {selected.length > 0 && (
        <div
          className="compare-scroll"
          role="region"
          aria-label={pick(
            locale,
            'جدول مقارنة الدراجات',
            'Motorcycle comparison table',
          )}
          tabIndex={0}
        >
          <table className="data-table compare-table">
            <thead>
              <tr>
                <th>{pick(locale, 'المواصفة', 'SPECIFICATION')}</th>
                {selected.map((bike) => (
                  <th key={bike.id}>
                    <Link href={`/${locale}/motorcycles/${bike.slug}`}>
                      {bike.image_url && (
                        <span className="compare-photo">
                          <Image
                            src={bike.image_url}
                            alt=""
                            fill
                            sizes="180px"
                            style={{ objectFit: 'cover' }}
                          />
                        </span>
                      )}
                      {pick(locale, bike.name_ar, bike.name_en)}
                    </Link>
                    {bike.is_demo && (
                      <small className="compare-demo">
                        {pick(locale, 'بيانات تجريبية', 'Demo listing')}
                      </small>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {selected.map((bike) => (
                    <td key={bike.id}>{row.value(bike)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
