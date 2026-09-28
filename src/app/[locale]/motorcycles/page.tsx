import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motorcycleListing } from '@/lib/catalog';
import { MotorcycleCard } from '@/components/cards';
import { Empty } from '@/components/empty';
import { isLocale, pick } from '@/lib/i18n';
export default async function MotorcyclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    condition?: string;
    page?: string;
    min?: string;
    max?: string;
    cc_min?: string;
    cc_max?: string;
    year?: string;
    availability?: string;
    sort?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const condition =
    query.condition === 'new' || query.condition === 'used'
      ? query.condition
      : undefined;
  const requestedPage = Number(query.page);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 1000)
      : 1;
  const pageSize = 12;
  const parseNumber = (value: string | undefined, max: number) => {
    if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
    const amount = Number(value);
    return amount <= max ? amount : undefined;
  };
  const parseYear = (value?: string) => {
    const year = parseNumber(value, 2100);
    return year && Number.isInteger(year) && year >= 1950 ? year : undefined;
  };
  const sort = ['newest', 'price_asc', 'price_desc', 'year_desc'].includes(
    query.sort || '',
  )
    ? (query.sort as 'newest' | 'price_asc' | 'price_desc' | 'year_desc')
    : 'newest';
  const { items, total } = await motorcycleListing({
    condition,
    q: query.q,
    minPrice: parseNumber(query.min, 100000000),
    maxPrice: parseNumber(query.max, 100000000),
    minCc: parseNumber(query.cc_min, 5000),
    maxCc: parseNumber(query.cc_max, 5000),
    year: parseYear(query.year),
    availability:
      query.availability === 'available' || query.availability === 'reserved'
        ? query.availability
        : undefined,
    sort,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    for (const key of [
      'q',
      'min',
      'max',
      'cc_min',
      'cc_max',
      'year',
      'availability',
      'sort',
    ] as const) {
      if (query[key]) params.set(key, query[key]);
    }
    params.set('page', String(target));
    const path = condition ? `motorcycles/${condition}` : 'motorcycles';
    return `/${locale}/${path}?${params}`;
  };
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <div className="breadcrumbs">
            <Link href={`/${locale}`}>REVORA</Link> /{' '}
            {pick(locale, 'الدراجات', 'MOTORCYCLES')}
          </div>
          <span className="section-index">01 / THE COLLECTION</span>
          <h1 className="page-title">
            {pick(locale, 'دراجات صنعت للشغف', 'MACHINES WITH A PURPOSE')}
          </h1>
          <p>
            {pick(
              locale,
              'مجموعة منتقاة من الدراجات الجديدة والمستعملة، كل واحدة منها بداية لقصة جديدة.',
              'A curated collection of new and pre-owned motorcycles. Every machine is the start of a new story.',
            )}
          </p>
        </div>
      </section>
      <div className="shell section-small">
        <form
          className="toolbar"
          action={`/${locale}/motorcycles${condition ? `/${condition}` : ''}`}
        >
          <label>
            {pick(locale, 'بحث', 'Search')}
            <input className="input" name="q" defaultValue={query.q || ''} />
          </label>
          <label>
            {pick(locale, 'أقل سعر', 'Min EGP')}
            <input
              className="input"
              name="min"
              type="number"
              min="0"
              step="0.01"
              defaultValue={query.min || ''}
            />
          </label>
          <label>
            {pick(locale, 'أعلى سعر', 'Max EGP')}
            <input
              className="input"
              name="max"
              type="number"
              min="0"
              step="0.01"
              defaultValue={query.max || ''}
            />
          </label>
          <label>
            {pick(locale, 'سعة المحرك من', 'Min CC')}
            <input
              className="input"
              name="cc_min"
              type="number"
              min="0"
              max="5000"
              defaultValue={query.cc_min || ''}
            />
          </label>
          <label>
            {pick(locale, 'سعة المحرك إلى', 'Max CC')}
            <input
              className="input"
              name="cc_max"
              type="number"
              min="0"
              max="5000"
              defaultValue={query.cc_max || ''}
            />
          </label>
          <label>
            {pick(locale, 'سنة الصنع', 'Year')}
            <input
              className="input"
              name="year"
              type="number"
              min="1950"
              max="2100"
              defaultValue={query.year || ''}
            />
          </label>
          <label>
            {pick(locale, 'التوفر', 'Availability')}
            <select
              className="input"
              name="availability"
              defaultValue={query.availability || ''}
            >
              <option value="">{pick(locale, 'الكل', 'All')}</option>
              <option value="available">
                {pick(locale, 'متاح', 'Available')}
              </option>
              <option value="reserved">
                {pick(locale, 'محجوز', 'Reserved')}
              </option>
            </select>
          </label>
          <label>
            {pick(locale, 'الترتيب', 'Sort')}
            <select className="input" name="sort" defaultValue={sort}>
              <option value="newest">{pick(locale, 'الأحدث', 'Newest')}</option>
              <option value="price_asc">
                {pick(locale, 'السعر: الأقل أولاً', 'Price: low to high')}
              </option>
              <option value="price_desc">
                {pick(locale, 'السعر: الأعلى أولاً', 'Price: high to low')}
              </option>
              <option value="year_desc">
                {pick(locale, 'سنة الصنع', 'Year')}
              </option>
            </select>
          </label>
          <button className="button button-ghost" type="submit">
            {pick(locale, 'تطبيق', 'Apply')}
          </button>
        </form>
        <div className="toolbar">
          <Link
            className={`chip ${!condition ? 'active' : ''}`}
            href={`/${locale}/motorcycles`}
          >
            {pick(locale, 'الكل', 'ALL')}
          </Link>
          <Link
            className={`chip ${condition === 'new' ? 'active' : ''}`}
            href={`/${locale}/motorcycles/new`}
          >
            {pick(locale, 'جديد', 'NEW')}
          </Link>
          <Link
            className={`chip ${condition === 'used' ? 'active' : ''}`}
            href={`/${locale}/motorcycles/used`}
          >
            {pick(locale, 'مستعمل', 'PRE-OWNED')}
          </Link>
        </div>
        {items.length ? (
          <div className="card-grid">
            {items.map((item) => (
              <MotorcycleCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        ) : (
          <Empty locale={locale} />
        )}
        {total > pageSize && (
          <nav
            className="toolbar"
            aria-label={pick(locale, 'صفحات الدراجات', 'Motorcycle pages')}
          >
            {page > 1 && (
              <Link className="chip" href={pageHref(page - 1)}>
                {pick(locale, 'السابق', 'PREVIOUS')}
              </Link>
            )}
            <span aria-current="page">
              {pick(locale, 'صفحة', 'Page')} {page} /{' '}
              {Math.ceil(total / pageSize)}
            </span>
            {page * pageSize < total && (
              <Link className="chip" href={pageHref(page + 1)}>
                {pick(locale, 'التالي', 'NEXT')}
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
