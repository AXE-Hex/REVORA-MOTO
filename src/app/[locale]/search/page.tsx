import Link from 'next/link';
import { notFound } from 'next/navigation';
import { productListing, motorcycleListing } from '@/lib/catalog';
import { MotorcycleCard, ProductCard } from '@/components/cards';
import { isLocale, pick } from '@/lib/i18n';
import { Empty } from '@/components/empty';
import { SearchBox } from '@/components/search-box';
import { currentUser, supabase } from '@/lib/supabase/server';
export default async function Search({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { q = '', page: requested = '1' } = await searchParams;
  const parsedPage = Number(requested);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, 1000)
      : 1;
  const pageSize = 12;
  const [gearListing, bikeListing] = q.trim()
    ? await Promise.all([
        productListing({ q, limit: pageSize, offset: (page - 1) * pageSize }),
        motorcycleListing({
          q,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
      ])
    : [
        { items: [], total: 0 },
        { items: [], total: 0 },
      ];
  if (q.trim().length >= 2) {
    const user = await currentUser();
    const db = await supabase();
    if (user && db) await db.rpc('record_search_term', { p_term: q.trim() });
  }
  const gear = gearListing.items;
  const bikes = bikeListing.items;
  const searchHref = (target: number) =>
    `/${locale}/search?q=${encodeURIComponent(q)}&page=${target}`;
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <div className="breadcrumbs">
            <Link href={`/${locale}`}>REVORA</Link> / SEARCH
          </div>
          <h1 className="page-title">
            {pick(locale, 'ابحث في REVORA', 'SEARCH REVORA')}
          </h1>
          <SearchBox locale={locale} action={`/${locale}/search`} initial={q} />
        </div>
      </section>
      <div className="shell section-small">
        {bikes.length > 0 && (
          <>
            <h2>{pick(locale, 'الدراجات', 'MOTORCYCLES')}</h2>
            <div className="card-grid">
              {bikes.map((x) => (
                <MotorcycleCard key={x.id} item={x} locale={locale} />
              ))}
            </div>
          </>
        )}
        {gear.length > 0 && (
          <>
            <h2>{pick(locale, 'المنتجات', 'PRODUCTS')}</h2>
            <div className="card-grid product-grid">
              {gear.map((x) => (
                <ProductCard key={x.id} item={x} locale={locale} />
              ))}
            </div>
          </>
        )}
        {q && !bikes.length && !gear.length && page === 1 && (
          <Empty locale={locale} />
        )}
        {q && Math.max(gearListing.total, bikeListing.total) > pageSize && (
          <nav
            className="toolbar"
            aria-label={pick(
              locale,
              'صفحات نتائج البحث',
              'Search result pages',
            )}
          >
            {page > 1 && (
              <Link className="chip" href={searchHref(page - 1)}>
                {pick(locale, 'السابق', 'Previous')}
              </Link>
            )}
            <span aria-current="page">
              {pick(locale, 'صفحة', 'Page')} {page}
            </span>
            {page * pageSize <
              Math.max(gearListing.total, bikeListing.total) && (
              <Link className="chip" href={searchHref(page + 1)}>
                {pick(locale, 'التالي', 'Next')}
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
