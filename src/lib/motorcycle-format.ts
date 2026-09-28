import { formatDistance, formatNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n';

const labels: Record<string, { ar: string; en: string }> = {
  year: { ar: 'سنة الصنع', en: 'Year' },
  engine: { ar: 'سعة المحرك', en: 'Engine' },
  engine_cc: { ar: 'سعة المحرك', en: 'Engine displacement' },
  power: { ar: 'القوة', en: 'Power' },
  horsepower: { ar: 'القوة الحصانية', en: 'Power' },
  condition: { ar: 'الحالة', en: 'Condition' },
  mileage: { ar: 'المسافة المقطوعة', en: 'Mileage' },
  mileage_km: { ar: 'المسافة المقطوعة', en: 'Mileage' },
  transmission: { ar: 'ناقل الحركة', en: 'Transmission' },
  abs: { ar: 'نظام منع انغلاق المكابح', en: 'ABS' },
  fuel_tank_l: { ar: 'سعة خزان الوقود', en: 'Fuel tank' },
  fuel: { ar: 'الوقود', en: 'Fuel' },
  weight_kg: { ar: 'الوزن', en: 'Weight' },
  seat_height_mm: { ar: 'ارتفاع المقعد', en: 'Seat height' },
  warranty: { ar: 'الضمان', en: 'Warranty' },
  availability: { ar: 'التوفر', en: 'Availability' },
};
const values: Record<string, { ar: string; en: string }> = {
  new: { ar: 'جديدة', en: 'New' },
  used: { ar: 'مستعملة', en: 'Pre-owned' },
  available: { ar: 'متاحة للحجز', en: 'Available to reserve' },
  reserved: { ar: 'محجوزة', en: 'Reserved' },
  sold: { ar: 'مباعة', en: 'Sold' },
  hidden: { ar: 'غير معروضة', en: 'Unavailable' },
  true: { ar: 'متوفر', en: 'Included' },
  false: { ar: 'غير متوفر', en: 'Not included' },
  '6 speed': { ar: '٦ سرعات', en: '6 speed' },
  '5 speed': { ar: '٥ سرعات', en: '5 speed' },
  petrol: { ar: 'بنزين', en: 'Petrol' },
  electric: { ar: 'كهرباء', en: 'Electric' },
};

export function motorcycleCondition(value: string, locale: Locale) {
  if (value === 'new') return locale === 'ar' ? 'جديدة' : 'New';
  if (value === 'used') return locale === 'ar' ? 'مستعملة' : 'Pre-owned';
  return locale === 'ar' ? 'حالة المركبة' : 'Motorcycle condition';
}

export function motorcycleAvailability(value: string, locale: Locale) {
  return (
    values[value]?.[locale] ||
    (locale === 'ar' ? 'تحقق من التوفر' : 'Check availability')
  );
}

export function motorcycleSpecRows(
  input: {
    year: number;
    engineCc: number | null;
    horsepower: number | null;
    mileageKm: number | null;
    condition: string;
    availability: string;
    specs: Record<string, string | number | boolean> | null;
  },
  locale: Locale,
) {
  const rows: { key: string; label: string; value: string }[] = [];
  const add = (key: string, raw: string | number | boolean, index: number) => {
    if (raw === '' || raw === null || raw === undefined) return;
    const normalized = key
      .toLowerCase()
      .replaceAll('-', '_')
      .replaceAll(' ', '_');
    const label =
      labels[normalized]?.[locale] ||
      (locale === 'ar'
        ? `تفصيل إضافي ${formatNumber(index + 1, locale)}`
        : normalized
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()));
    let value: string;
    if (typeof raw === 'boolean') value = values[String(raw)][locale];
    else if (typeof raw === 'number') {
      if (normalized === 'year')
        value = formatNumber(raw, locale, { maximumFractionDigits: 0 });
      else if (normalized.endsWith('_cc') || normalized === 'engine')
        value = `${formatNumber(raw, locale)} ${locale === 'ar' ? 'سم³' : 'cc'}`;
      else if (normalized === 'horsepower' || normalized === 'power')
        value = `${formatNumber(raw, locale)} ${locale === 'ar' ? 'حصان' : 'hp'}`;
      else if (normalized.endsWith('_km') || normalized === 'mileage')
        value = formatDistance(raw, locale);
      else if (normalized.endsWith('_l'))
        value = `${formatNumber(raw, locale)} ${locale === 'ar' ? 'لتر' : 'L'}`;
      else if (normalized.endsWith('_kg'))
        value = `${formatNumber(raw, locale)} ${locale === 'ar' ? 'كجم' : 'kg'}`;
      else if (normalized.endsWith('_mm'))
        value = `${formatNumber(raw, locale)} ${locale === 'ar' ? 'مم' : 'mm'}`;
      else value = formatNumber(raw, locale);
    } else {
      const mapped = values[raw.toLowerCase()];
      value = mapped?.[locale] || raw;
    }
    rows.push({ key: `${normalized}-${index}`, label, value });
  };
  add('year', input.year, rows.length);
  if (input.engineCc) add('engine_cc', input.engineCc, rows.length);
  if (input.horsepower) add('horsepower', input.horsepower, rows.length);
  add('condition', input.condition, rows.length);
  if (input.mileageKm !== null) add('mileage_km', input.mileageKm, rows.length);
  add('availability', input.availability, rows.length);
  Object.entries(input.specs || {}).forEach(([key, value]) =>
    add(key, value, rows.length),
  );
  return rows;
}
