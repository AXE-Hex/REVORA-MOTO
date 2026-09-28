'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pick, type Locale } from '@/lib/i18n';
type Brand = { id: string; name: string };
type Model = { id: string; brand_id: string; name: string };
type Variant = {
  id: string;
  model_id: string;
  name: string;
  start_year: number;
  end_year: number | null;
};
export function AddGarage({
  locale,
  brands,
  models,
  variants,
  selectedYear,
  selectedVariant,
}: {
  locale: Locale;
  brands: Brand[];
  models: Model[];
  variants: Variant[];
  selectedYear: string;
  selectedVariant: string;
}) {
  const chosen = variants.find((v) => v.id === selectedVariant);
  const chosenModel = models.find((m) => m.id === chosen?.model_id);
  const [brand, setBrand] = useState(chosenModel?.brand_id || '');
  const [model, setModel] = useState(chosenModel?.id || '');
  const [variant, setVariant] = useState(selectedVariant);
  const [year, setYear] = useState(selectedYear);
  const router = useRouter();
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (variant && year)
          router.push(`/${locale}/fitment?variant=${variant}&year=${year}`);
      }}
    >
      <div
        className="card-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}
      >
        <label className="field-label">
          {pick(locale, 'العلامة التجارية', 'BRAND')}
          <select
            className="input"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setModel('');
              setVariant('');
            }}
            required
          >
            <option value="">—</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          {pick(locale, 'الموديل', 'MODEL')}
          <select
            className="input"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setVariant('');
            }}
            required
          >
            <option value="">—</option>
            {models
              .filter((m) => m.brand_id === brand)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field-label">
          {pick(locale, 'النسخة', 'VARIANT')}
          <select
            className="input"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            required
          >
            <option value="">—</option>
            {variants
              .filter((v) => v.model_id === model)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field-label">
          {pick(locale, 'السنة', 'YEAR')}
          <input
            className="input"
            type="number"
            min={variants.find((v) => v.id === variant)?.start_year || 1950}
            max={variants.find((v) => v.id === variant)?.end_year || 2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
        </label>
      </div>
      <button className="button button-accent" style={{ marginTop: 18 }}>
        {pick(locale, 'عرض القطع المتوافقة', 'FIND COMPATIBLE PARTS')}
      </button>
    </form>
  );
}
