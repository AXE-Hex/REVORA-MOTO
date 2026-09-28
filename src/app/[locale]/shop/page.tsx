import Link from 'next/link';
import { notFound } from 'next/navigation';
import { productListing, categories, brands } from '@/lib/catalog';
import { ProductCard } from '@/components/cards';
import { Empty } from '@/components/empty';
import { isLocale, pick } from '@/lib/i18n';
import { currentUser, supabase } from '@/lib/supabase/server';
import { SearchBox } from '@/components/search-box';
import { ShopFilters } from '@/components/shop-filters';
export default async function Shop({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    compatible?: string;
    page?: string;
    sort?: string;
    min?: string;
    max?: string;
    stock?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const requestedPage = Number(query.page);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 1000)
      : 1;
  const pageSize = 12;
  const sort = [
    'featured',
    'newest',
    'price_asc',
    'price_desc',
    'name',
  ].includes(query.sort || '')
    ? (query.sort as
        'featured' | 'newest' | 'price_asc' | 'price_desc' | 'name')
    : 'featured';
  const parsePrice = (value?: string) => {
    if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
    const amount = Number(value);
    return amount <= 100000000 ? amount : undefined;
  };
  const minPrice = parsePrice(query.min);
  const maxPrice = parsePrice(query.max);
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    for (const key of [
      'q',
      'category',
      'brand',
      'compatible',
      'sort',
      'min',
      'max',
      'stock',
    ] as const) {
      if (query[key]) params.set(key, query[key]);
    }
    params.set('page', String(target));
    return `/${locale}/shop?${params}`;
  };
  const db = await supabase();
  const user = await currentUser();
  const { data: active } =
    db && user
      ? await db
          .from('garage_motorcycles')
          .select('variant_id,year')
          .eq('user_id', user.id)
          .eq('active', true)
          .maybeSingle()
      : { data: null };
  const { data: matched } =
    db && active
      ? await db.rpc('compatible_product_ids', {
          p_variant: active.variant_id,
          p_year: active.year,
        })
      : { data: [] };
  const matchingIds = new Set<string>(
    ((matched || []) as { product_id: string }[]).map((row) => row.product_id),
  );
  const [listing, cats, brandList] = await Promise.all([
    productListing({
      q: query.q,
      category: query.category,
      brand: query.brand,
      ids:
        query.compatible === '1' ? (active ? [...matchingIds] : []) : undefined,
      sort,
      minPrice,
      maxPrice,
      inStock: query.stock === '1',
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    categories(),
    brands(),
  ]);
  const { items, total } = listing;
  const { data: fitmentRules } =
    db && active && items.length
      ? await db
          .from('fitment_rules')
          .select('product_id')
          .in(
            'product_id',
            items.map((item) => item.id),
          )
      : { data: [] };
  const fitmentProducts = new Set(
    (fitmentRules || []).map((rule) => rule.product_id),
  );
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <div className="breadcrumbs">
            <Link href={`/${locale}`}>REVORA</Link> /{' '}
            {pick(locale, 'المتجر', 'SHOP')}
          </div>
          <span className="section-index">02 / GEAR & PARTS</span>
          <h1 className="page-title">
            {pick(locale, 'جهّز نفسك لكل منعطف', 'EQUIPPED FOR EVERY TURN')}
          </h1>
          <p>
            {pick(
              locale,
              'معدات قيادة وقطع غيار مختارة بعناية لدراجتك ورحلتك.',
              'Purpose-built gear and carefully selected parts for every machine and rider.',
            )}
          </p>
        </div>
      </section>
      <div className="shell section-small">
        <SearchBox
          locale={locale}
          action={`/${locale}/shop`}
          initial={query.q || ''}
        />
        <div className="toolbar" style={{ overflowX: 'auto' }}>
          <Link
            className={`chip ${!query.category ? 'active' : ''}`}
            href={`/${locale}/shop`}
          >
            {pick(locale, 'الكل', 'ALL')}
          </Link>
          {cats
            .filter((c) => !c.parent_id)
            .map((c) => (
              <Link
                className={`chip ${query.category === c.slug ? 'active' : ''}`}
                key={c.id}
                href={`/${locale}/shop?category=${c.slug}`}
              >
                {pick(locale, c.name_ar, c.name_en)}
              </Link>
            ))}
        </div>
        {active ? (
          <div className="toolbar">
            <Link
              className={`chip ${query.compatible === '1' ? 'active' : ''}`}
              href={`/${locale}/shop?compatible=1`}
            >
              {pick(
                locale,
                'المتوافق مع دراجتي فقط',
                'FITS MY MOTORCYCLE ONLY',
              )}
            </Link>
            <Link className="chip" href={`/${locale}/fitment`}>
              {pick(locale, 'تغيير الدراجة النشطة', 'CHANGE ACTIVE MOTORCYCLE')}
            </Link>
          </div>
        ) : user ? (
          <p className="notice">
            <Link href={`/${locale}/fitment`}>
              {pick(
                locale,
                'فعّل دراجة في مرآبي لعرض القطع المتوافقة.',
                'Set an active motorcycle in My Garage to filter compatible parts.',
              )}
            </Link>
          </p>
        ) : null}
        <div className="shop-catalog-layout">
          <aside className="shop-filter-sidebar">
            <ShopFilters
              locale={locale}
              q={query.q}
              compatible={query.compatible}
              category={query.category}
              brand={query.brand}
              sort={sort}
              min={query.min}
              max={query.max}
              stock={query.stock}
              categories={cats}
              brands={brandList}
            />
          </aside>
          <div className="shop-results">
            {items.length ? (
              <div className="card-grid product-grid">
                {items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    fitment={
                      active && fitmentProducts.has(item.id)
                        ? matchingIds.has(item.id)
                          ? 'compatible'
                          : 'incompatible'
                        : 'unknown'
                    }
                  />
                ))}
              </div>
            ) : (
              <Empty locale={locale} />
            )}
            {total > pageSize && (
              <nav
                className="toolbar"
                aria-label={pick(locale, 'صفحات المنتجات', 'Product pages')}
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
        </div>
      </div>
    </>
  );
}
