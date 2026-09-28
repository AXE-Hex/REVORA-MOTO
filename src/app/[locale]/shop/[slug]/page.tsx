import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { product } from '@/lib/catalog';
import { isLocale, money, pick } from '@/lib/i18n';
import { operationFailed } from '@/lib/action-feedback';
import { AddToCart } from '@/components/add-to-cart';
import {
  ProductGallery,
  type ProductMedia,
} from '@/components/product-gallery';
import { WishlistButton } from '@/components/wishlist-button';
import { currentUser, supabase } from '@/lib/supabase/server';
import { submitReview } from '@/app/actions';
import {
  absoluteMediaUrl,
  detailBreadcrumbs,
  serializeJsonLd,
  siteUrl,
} from '@/lib/structured-data';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const item = await product(slug);
  if (!item) return {};
  const name = pick(locale, item.name_ar, item.name_en);
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return {
    title: `${name} | REVORA MOTO`,
    description: pick(
      locale,
      item.description_ar || name,
      item.description_en || name,
    ),
    alternates: {
      canonical: `${base}/${locale}/shop/${slug}`,
      languages: {
        ar: `${base}/ar/shop/${slug}`,
        en: `${base}/en/shop/${slug}`,
      },
    },
    openGraph: { title: name, images: item.image_url ? [item.image_url] : [] },
  };
}
export default async function ProductDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    review?: string;
    review_error?: string;
    review_sort?: string;
  }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const item = await product(slug);
  if (!item) notFound();
  const name = pick(locale, item.name_ar, item.name_en);
  const db = await supabase();
  const { data: variants } = db
    ? await db
        .from('public_product_variants')
        .select('id,sku,attributes,price_egp,stock,image_url')
        .eq('product_id', item.id)
        .order('sku')
    : { data: [] };
  const { data: galleryImages } = db
    ? await db
        .from('product_images')
        .select('id,url,alt_ar,alt_en')
        .eq('product_id', item.id)
        .order('sort_order')
    : { data: [] };
  const media: ProductMedia[] = [];
  if (item.image_url)
    media.push({ id: 'primary', url: item.image_url, alt: name });
  for (const image of galleryImages || []) {
    if (!media.some((entry) => entry.url === image.url))
      media.push({
        id: image.id,
        url: image.url,
        alt: pick(locale, image.alt_ar || name, image.alt_en || name),
      });
  }
  for (const variant of variants || []) {
    if (
      variant.image_url &&
      !media.some((entry) => entry.url === variant.image_url)
    )
      media.push({
        id: variant.id,
        url: variant.image_url,
        alt: name + ' / ' + variant.sku,
      });
  }
  const user = await currentUser();
  const { data: activeGarage } =
    db && user
      ? await db
          .from('garage_motorcycles')
          .select('variant_id,year')
          .eq('user_id', user.id)
          .eq('active', true)
          .maybeSingle()
      : { data: null };
  const { data: rules } = db
    ? await db
        .from('fitment_rules')
        .select('id')
        .eq('product_id', item.id)
        .limit(1)
    : { data: [] };
  const { data: matches } =
    db && activeGarage && rules?.length
      ? await db.rpc('compatible_product_ids', {
          p_variant: activeGarage.variant_id,
          p_year: activeGarage.year,
        })
      : { data: [] };
  const fitmentKnown = Boolean(activeGarage && rules?.length);
  const compatible = Boolean(
    (matches as { product_id: string }[] | null)?.some(
      (match) => match.product_id === item.id,
    ),
  );
  const query = await searchParams;
  const reviewOrder = query.review_sort === 'highest' ? 'rating' : 'created_at';
  const ascending = query.review_sort === 'oldest';
  const { data: reviews } = db
    ? await db
        .from('reviews')
        .select('id,order_id,rating,body,created_at')
        .eq('product_id', item.id)
        .eq('status', 'published')
        .order(reviewOrder, { ascending })
        .limit(20)
    : { data: [] };
  const reviewCounts = await Promise.all(
    [1, 2, 3, 4, 5].map(async (rating) => {
      if (!db) return 0;
      const { count } = await db
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', item.id)
        .eq('status', 'published')
        .eq('rating', rating);
      return count || 0;
    }),
  );
  const reviewCount = reviewCounts.reduce((total, count) => total + count, 0);
  const averageRating = reviewCount
    ? reviewCounts.reduce(
        (total, count, index) => total + count * (index + 1),
        0,
      ) / reviewCount
    : 0;
  const publishedOrderIds = [
    ...new Set((reviews || []).map((review) => review.order_id)),
  ];
  const { data: publishedOrders } =
    db && publishedOrderIds.length
      ? await db
          .from('orders')
          .select('id,order_number')
          .in('id', publishedOrderIds)
      : { data: [] };
  const publishedOrderNumbers = new Map(
    (publishedOrders || []).map((order) => [order.id, order.order_number]),
  );
  let eligible: string[] = [];
  let eligibleOrderNumbers = new Map<string, number>();
  if (db && user) {
    const { data: items } = await db
      .from('order_items')
      .select('order_id')
      .eq('product_id', item.id);
    const ids = (items || []).map((x) => x.order_id);
    if (ids.length) {
      const { data: orders } = await db
        .from('orders')
        .select('id,order_number')
        .eq('user_id', user.id)
        .eq('status', 'delivered')
        .in('id', ids);
      const { data: existingReviews } = await db
        .from('reviews')
        .select('order_id')
        .eq('user_id', user.id)
        .eq('product_id', item.id);
      const reviewedOrderIds = new Set(
        (existingReviews || []).map((review) => review.order_id),
      );
      const availableOrders = (orders || []).filter(
        (order) => !reviewedOrderIds.has(order.id),
      );
      eligible = availableOrders.map((order) => order.id);
      eligibleOrderNumbers = new Map(
        availableOrders.map((order) => [order.id, order.order_number]),
      );
    }
  }
  const canonical = siteUrl(`/${locale}/shop/${encodeURIComponent(slug)}`);
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': siteUrl('/#organization'),
        name: 'REVORA MOTO',
        url: siteUrl('/'),
      },
      detailBreadcrumbs(locale, 'shop', slug, name),
      ...(!item.is_demo
        ? [
            {
              '@type': 'Product',
              '@id': `${canonical}#product`,
              name,
              description: pick(
                locale,
                item.description_ar || name,
                item.description_en || name,
              ),
              sku: item.sku,
              image: absoluteMediaUrl(item.image_url),
              url: canonical,
              offers: {
                '@type': 'Offer',
                url: canonical,
                priceCurrency: 'EGP',
                price: item.sale_price_egp ?? item.price_egp,
                availability: `https://schema.org/${item.stock > 0 ? 'InStock' : 'OutOfStock'}`,
              },
            },
          ]
        : []),
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="page-hero">
        <div className="shell">
          <div className="breadcrumbs">
            <Link href={`/${locale}`}>REVORA</Link> /{' '}
            <Link href={`/${locale}/shop`}>SHOP</Link> / {name}
          </div>
          <span className="section-index">REVORA SHOP / {item.sku}</span>
          <h1 className="page-title">{name}</h1>
        </div>
      </section>
      <div className="shell detail-layout">
        <ProductGallery images={media} fallbackAlt={name} />
        <div className="detail-copy">
          {item.is_demo && (
            <div className="notice">
              {pick(
                locale,
                'منتج تجريبي: تحقق من المواصفات والصورة قبل الشراء الفعلي.',
                'Demo product: verify specifications and images before an actual purchase.',
              )}
            </div>
          )}
          <span className="section-index">{item.sku}</span>
          <h2 className="page-title">{name}</h2>
          <p>
            {pick(locale, item.description_ar || '', item.description_en || '')}
          </p>
          <div className="detail-purchase-panel">
            <div className="price">
              {money(item.sale_price_egp ?? item.price_egp, locale)}
            </div>
            {fitmentKnown && (
              <div className={`notice ${compatible ? '' : 'error'}`}>
                {compatible
                  ? pick(
                      locale,
                      'هذه القطعة متوافقة مع دراجتك النشطة في مرآبي.',
                      'This part fits your active motorcycle in My Garage.',
                    )
                  : pick(
                      locale,
                      'هذه القطعة غير متوافقة مع دراجتك النشطة. تحقق من الطراز والسنة قبل الشراء.',
                      'This part does not fit your active motorcycle. Check model and year before buying.',
                    )}
              </div>
            )}
            <p>
              {item.stock > 0
                ? pick(
                    locale,
                    `متوفر (${item.stock})`,
                    `In stock (${item.stock})`,
                  )
                : pick(locale, 'غير متوفر حالياً', 'Currently unavailable')}
            </p>
            <div className="detail-actions">
              <AddToCart
                id={item.id}
                locale={locale}
                disabled={item.stock < 1}
                variants={variants || []}
              />
              <WishlistButton id={item.id} kind="product" locale={locale} />
            </div>
          </div>
          <div className="spec-list">
            <div className="spec-row">
              <span>SKU</span>
              <strong>{item.sku}</strong>
            </div>
            <div className="spec-row">
              <span>{pick(locale, 'التوافق', 'FITMENT')}</span>
              <strong>
                {pick(
                  locale,
                  'تحقق من التوافق قبل الشراء',
                  'Check fitment before buying',
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <section className="shell section-small">
        <div className="product-reviews-heading" id="reviews">
          <div>
            <span className="section-index">
              {pick(locale, 'آراء مشترين موثقين', 'VERIFIED PURCHASES')}
            </span>
            <h2 className="page-title">
              {pick(locale, 'تقييمات العملاء', 'CUSTOMER REVIEWS')}
            </h2>
          </div>
          {reviewCount > 0 && (
            <div
              className="product-rating-summary"
              aria-label={pick(locale, 'ملخص التقييمات', 'Review summary')}
            >
              <strong>{averageRating.toFixed(1)}</strong>
              <span aria-label={`${averageRating.toFixed(1)} / 5`}>★★★★★</span>
              <small>
                {pick(locale, `${reviewCount} تقييم`, `${reviewCount} reviews`)}
              </small>
            </div>
          )}
        </div>
        {reviewCount > 0 && (
          <div
            className="review-distribution"
            aria-label={pick(locale, 'توزيع التقييمات', 'Rating distribution')}
          >
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviewCounts[rating - 1];
              const percent = Math.round((count / reviewCount) * 100);
              return (
                <div className="review-distribution-row" key={rating}>
                  <span>{rating} ★</span>
                  <div
                    className="review-distribution-track"
                    role="progressbar"
                    aria-label={pick(
                      locale,
                      `${rating} نجوم`,
                      `${rating} stars`,
                    )}
                    aria-valuemin={0}
                    aria-valuemax={reviewCount}
                    aria-valuenow={count}
                  >
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  <small>{count}</small>
                </div>
              );
            })}
          </div>
        )}
        <nav
          className="review-controls"
          aria-label={pick(locale, 'ترتيب التقييمات', 'Review filters')}
        >
          {(
            [
              ['newest', pick(locale, 'الأحدث', 'Newest')],
              ['highest', pick(locale, 'الأعلى تقييماً', 'Highest rated')],
              ['oldest', pick(locale, 'الأقدم', 'Oldest')],
            ] as const
          ).map(([sort, label]) => (
            <Link
              key={sort}
              className={`button ${query.review_sort === sort || (!query.review_sort && sort === 'newest') ? 'button-accent' : 'button-ghost'}`}
              href={`/${locale}/shop/${slug}?review_sort=${sort}#reviews`}
              aria-current={
                query.review_sort === sort ||
                (!query.review_sort && sort === 'newest')
                  ? 'true'
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          <span
            className="review-verified-filter"
            aria-label={pick(
              locale,
              'تظهر التقييمات المنشورة من مشتريات موثقة فقط',
              'Showing published verified purchases only',
            )}
          >
            {pick(locale, '✓ مشتريات موثقة', '✓ Verified purchases')}
          </span>
        </nav>
        {reviews?.length ? (
          reviews.map((r) => (
            <div key={r.id} className="panel" style={{ marginBottom: 12 }}>
              <strong>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </strong>
              <p>{r.body}</p>
              <small>
                {pick(locale, 'شراء موثق', 'Verified purchase')} ·{' '}
                {pick(locale, 'الطلب', 'Order')} #
                {publishedOrderNumbers.get(r.order_id) ?? '—'} ·{' '}
                {new Date(r.created_at).toLocaleDateString(locale)}
              </small>
            </div>
          ))
        ) : (
          <p>
            {pick(
              locale,
              'لا توجد تقييمات منشورة بعد',
              'No published reviews yet',
            )}
          </p>
        )}
        {query.review === 'pending' && (
          <p className="notice">
            {pick(
              locale,
              'أُرسل التقييم للمراجعة',
              'Review submitted for moderation',
            )}
          </p>
        )}
        {query.review_error && (
          <p className="notice error">{operationFailed(locale)}</p>
        )}
        {eligible.length > 0 && (
          <form action={submitReview} className="form-stack panel">
            <h3>{pick(locale, 'اكتب تقييمك', 'WRITE A REVIEW')}</h3>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="product" value={item.id} />
            <label className="field-label">
              {pick(locale, 'الطلب', 'ORDER')}
              <select className="input" name="order">
                {eligible.map((id) => (
                  <option value={id} key={id}>
                    #{eligibleOrderNumbers.get(id)}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="field-label review-star-picker">
              <legend>
                {pick(locale, 'تقييمك من خمس نجوم', 'Your five-star rating')}
              </legend>
              <div
                role="radiogroup"
                aria-label={pick(locale, 'اختيار التقييم', 'Choose a rating')}
              >
                {[5, 4, 3, 2, 1].map((x) => (
                  <label key={x}>
                    <input
                      type="radio"
                      name="rating"
                      value={x}
                      defaultChecked={x === 5}
                    />
                    <span aria-hidden="true">★</span>
                    <span className="visually-hidden">
                      {pick(locale, `${x} من 5 نجوم`, `${x} out of 5 stars`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field-label">
              {pick(locale, 'تقييمك', 'YOUR REVIEW')}
              <textarea
                className="input"
                name="body"
                minLength={10}
                maxLength={2000}
                required
                rows={4}
                aria-describedby="review-body-help"
              />
              <small id="review-body-help">
                {pick(
                  locale,
                  'اكتب من 10 إلى 2000 حرف.',
                  'Write between 10 and 2,000 characters.',
                )}
              </small>
            </label>
            <button className="button button-accent">
              {pick(locale, 'إرسال التقييم', 'SUBMIT REVIEW')}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
