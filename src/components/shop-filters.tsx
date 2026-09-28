'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { pick } from '@/lib/i18n';

type CatalogOption = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
};
type BrandOption = { id: string; slug: string; name: string };
type FilterProps = {
  locale: 'ar' | 'en';
  q?: string;
  compatible?: string;
  category?: string;
  brand?: string;
  sort: string;
  min?: string;
  max?: string;
  stock?: string;
  categories: CatalogOption[];
  brands: BrandOption[];
};

function Fields({ props }: { props: FilterProps }) {
  const {
    locale,
    q,
    compatible,
    category,
    brand,
    sort,
    min,
    max,
    stock,
    categories,
    brands,
  } = props;
  return (
    <>
      {q && <input type="hidden" name="q" value={q} />}
      {compatible === '1' && (
        <input type="hidden" name="compatible" value="1" />
      )}
      <label>
        {pick(locale, 'الفئة', 'Category')}
        <select className="input" name="category" defaultValue={category || ''}>
          <option value="">
            {pick(locale, 'جميع الفئات', 'All categories')}
          </option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {pick(locale, item.name_ar, item.name_en)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {pick(locale, 'العلامة التجارية', 'Brand')}
        <select className="input" name="brand" defaultValue={brand || ''}>
          <option value="">
            {pick(locale, 'جميع العلامات', 'All brands')}
          </option>
          {brands.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {pick(locale, 'الترتيب', 'Sort')}
        <select className="input" name="sort" defaultValue={sort}>
          <option value="featured">{pick(locale, 'المميز', 'Featured')}</option>
          <option value="newest">{pick(locale, 'الأحدث', 'Newest')}</option>
          <option value="price_asc">
            {pick(locale, 'السعر: الأقل أولاً', 'Price: low to high')}
          </option>
          <option value="price_desc">
            {pick(locale, 'السعر: الأعلى أولاً', 'Price: high to low')}
          </option>
          <option value="name">{pick(locale, 'الاسم', 'Name')}</option>
        </select>
      </label>
      <div className="shop-filter-price-range">
        <label>
          {pick(locale, 'أقل سعر (ج.م)', 'Min price (EGP)')}
          <input
            className="input"
            name="min"
            type="number"
            min="0"
            step="0.01"
            defaultValue={min || ''}
          />
        </label>
        <label>
          {pick(locale, 'أعلى سعر (ج.م)', 'Max price (EGP)')}
          <input
            className="input"
            name="max"
            type="number"
            min="0"
            step="0.01"
            defaultValue={max || ''}
          />
        </label>
      </div>
      <label className="shop-filter-stock">
        <input
          type="checkbox"
          name="stock"
          value="1"
          defaultChecked={stock === '1'}
        />
        {pick(locale, 'المتاح فقط', 'In stock only')}
      </label>
    </>
  );
}

export function ShopFilters(props: FilterProps) {
  const { locale, q, compatible, category, brand, sort, min, max, stock } =
    props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogFormRef = useRef<HTMLFormElement>(null);
  const [activeCount] = useState(
    [
      category,
      brand,
      min,
      max,
      stock === '1' ? 'stock' : '',
      sort !== 'featured' ? sort : '',
    ].filter(Boolean).length,
  );
  const [draftCount, setDraftCount] = useState(activeCount);
  const updateDraftCount = (form: HTMLFormElement) => {
    const data = new FormData(form);
    setDraftCount(
      [
        data.get('category'),
        data.get('brand'),
        data.get('min'),
        data.get('max'),
        data.get('stock'),
        data.get('sort') === 'featured' ? '' : data.get('sort'),
      ].filter((value) => typeof value === 'string' && value.length > 0).length,
    );
  };
  const close = () => dialogRef.current?.close();
  const clearHref = `/${locale}/shop${q || compatible === '1' ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(compatible === '1' ? { compatible } : {}) })}` : ''}`;

  return (
    <>
      <section
        className="shop-filter-sidebar-panel"
        aria-label={pick(locale, 'فلاتر المنتجات', 'Product filters')}
      >
        <h2>{pick(locale, 'تصفية المنتجات', 'Filter products')}</h2>
        <form
          className="shop-filter-form"
          action={`/${locale}/shop`}
          onChange={(event) => updateDraftCount(event.currentTarget)}
        >
          <Fields props={props} />
          <div className="shop-filter-actions">
            <button className="button button-primary" type="submit">
              {pick(locale, 'عرض النتائج', 'Show results')}
            </button>
            <Link className="button button-ghost" href={clearHref}>
              {pick(locale, 'مسح الكل', 'Clear all')}
            </Link>
          </div>
        </form>
      </section>
      <div className="shop-mobile-filter-bar">
        <button
          className="button button-secondary shop-filter-open"
          type="button"
          onClick={() => {
            setDraftCount(activeCount);
            dialogRef.current?.showModal();
          }}
        >
          <Filter size={17} aria-hidden="true" />
          {pick(locale, 'الفلاتر', 'Filters')}
          <span className="shop-filter-count">{activeCount}</span>
        </button>
        <label className="shop-mobile-sort">
          <span>{pick(locale, 'ترتيب', 'Sort')}</span>
          <select
            className="input"
            name="sort"
            form="mobile-sort-form"
            defaultValue={sort}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            aria-label={pick(locale, 'ترتيب النتائج', 'Sort results')}
          >
            <option value="featured">
              {pick(locale, 'المميز', 'Featured')}
            </option>
            <option value="newest">{pick(locale, 'الأحدث', 'Newest')}</option>
            <option value="price_asc">
              {pick(locale, 'السعر الأقل', 'Price: low to high')}
            </option>
            <option value="price_desc">
              {pick(locale, 'السعر الأعلى', 'Price: high to low')}
            </option>
            <option value="name">{pick(locale, 'الاسم', 'Name')}</option>
          </select>
        </label>
        <form id="mobile-sort-form" action={`/${locale}/shop`}>
          {q && <input type="hidden" name="q" value={q} />}
          {compatible === '1' && (
            <input type="hidden" name="compatible" value="1" />
          )}
          {category && <input type="hidden" name="category" value={category} />}
          {brand && <input type="hidden" name="brand" value={brand} />}
          {min && <input type="hidden" name="min" value={min} />}
          {max && <input type="hidden" name="max" value={max} />}
          {stock === '1' && <input type="hidden" name="stock" value="1" />}
        </form>
      </div>
      <dialog
        ref={dialogRef}
        className="shop-filter-dialog"
        aria-labelledby="shop-filter-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => {
          dialogFormRef.current?.reset();
          setDraftCount(activeCount);
        }}
      >
        <div className="shop-filter-dialog-header">
          <h2 id="shop-filter-dialog-title">
            {pick(locale, 'الفلاتر', 'Filters')}
          </h2>
          <button
            className="button button-icon"
            type="button"
            onClick={close}
            aria-label={pick(locale, 'إغلاق الفلاتر', 'Close filters')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form
          ref={dialogFormRef}
          className="shop-filter-form shop-filter-dialog-form"
          action={`/${locale}/shop`}
          onChange={(event) => updateDraftCount(event.currentTarget)}
        >
          <Fields props={props} />
          <div className="shop-filter-dialog-actions">
            <Link className="button button-ghost" href={clearHref}>
              {pick(locale, 'مسح الكل', 'Clear all')}
            </Link>
            <button className="button button-primary" type="submit">
              {pick(
                locale,
                `عرض النتائج (${draftCount})`,
                `Show results (${draftCount})`,
              )}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
