import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motorcycle } from '@/lib/catalog';
import { money, isLocale, pick } from '@/lib/i18n';
import { ReserveButton } from '@/components/reserve-button';
import { ShowroomGallery } from '@/components/showroom-gallery';
import { supabase } from '@/lib/supabase/server';
import { WishlistButton } from '@/components/wishlist-button';
import {
  motorcycleAvailability,
  motorcycleCondition,
  motorcycleSpecRows,
} from '@/lib/motorcycle-format';
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
  const item = await motorcycle(slug);
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
      canonical: `${base}/${locale}/motorcycles/${slug}`,
      languages: {
        ar: `${base}/ar/motorcycles/${slug}`,
        en: `${base}/en/motorcycles/${slug}`,
      },
    },
    openGraph: { title: name, images: item.image_url ? [item.image_url] : [] },
  };
}
export default async function MotorcycleDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const item = await motorcycle(slug);
  if (!item) notFound();
  const name = pick(locale, item.name_ar, item.name_en);
  const db = await supabase();
  const { data: photos } = db
    ? await db
        .from('motorcycle_images')
        .select('id,url,alt_ar,alt_en')
        .eq('motorcycle_id', item.id)
        .order('sort_order')
    : { data: [] };
  const images = photos?.length
    ? photos
    : item.image_url
      ? [{ id: item.id, url: item.image_url, alt_ar: name, alt_en: name }]
      : [];
  const canonical = siteUrl(
    `/${locale}/motorcycles/${encodeURIComponent(slug)}`,
  );
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': siteUrl('/#organization'),
        name: 'REVORA MOTO',
        url: siteUrl('/'),
      },
      detailBreadcrumbs(locale, 'motorcycles', slug, name),
      ...(!item.is_demo
        ? [
            {
              '@type': 'Vehicle',
              '@id': `${canonical}#vehicle`,
              name,
              description: pick(
                locale,
                item.description_ar || name,
                item.description_en || name,
              ),
              url: canonical,
              image: images
                .map((photo) => absoluteMediaUrl(photo.url))
                .filter(Boolean),
              vehicleModelDate: String(item.year),
              mileageFromOdometer:
                item.mileage_km == null
                  ? undefined
                  : {
                      '@type': 'QuantitativeValue',
                      value: item.mileage_km,
                      unitCode: 'KMT',
                    },
              offers: {
                '@type': 'Offer',
                url: canonical,
                priceCurrency: 'EGP',
                price: item.price_egp,
                availability: `https://schema.org/${item.availability === 'available' ? 'InStock' : 'SoldOut'}`,
              },
            },
          ]
        : []),
    ],
  };
  const specs = motorcycleSpecRows(
    {
      year: item.year,
      engineCc: item.engine_cc,
      horsepower: item.horsepower,
      mileageKm: item.mileage_km,
      condition: item.condition,
      availability: item.availability,
      specs: item.specs,
    },
    locale,
  );
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
            <Link href={`/${locale}/motorcycles`}>
              {pick(locale, 'الدراجات النارية', 'Motorcycles')}
            </Link>{' '}
            / {name}
          </div>
          <span className="section-index">REVORA SHOWROOM / {item.year}</span>
          <h1 className="page-title">{name}</h1>
        </div>
      </section>
      <div className="shell detail-layout motorcycle-detail-layout">
        <div>
          <ShowroomGallery images={images} name={name} locale={locale} />
          <div className="spec-list">
            {specs.map((spec) => (
              <div className="spec-row" key={spec.key}>
                <span>{spec.label}</span>
                <strong>{spec.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-copy">
          {item.is_demo && (
            <div className="notice">
              {pick(
                locale,
                'إعلان تجريبي: الصورة تمثيلية ولا تعرض المركبة الفعلية.',
                'Demo listing: the image is illustrative and does not show the actual vehicle.',
              )}
            </div>
          )}
          <span className="section-index">
            {motorcycleCondition(item.condition, locale)}
          </span>
          <h2 className="page-title">{name}</h2>
          <p>
            {pick(locale, item.description_ar || '', item.description_en || '')}
          </p>
          <div className="price">{money(item.price_egp, locale)}</div>
          <div className="motorcycle-availability">
            <span>{pick(locale, 'التوفر', 'Availability')}</span>
            <strong>{motorcycleAvailability(item.availability, locale)}</strong>
          </div>
          <div className="notice">
            {pick(
              locale,
              `عربون الحجز: ${money(item.deposit_egp, locale)}. تأكيد الدفع يتم بعد التحقق من مزود الخدمة.`,
              `Reservation deposit: ${money(item.deposit_egp, locale)}. Payment is confirmed after provider verification.`,
            )}
          </div>
          <div className="detail-actions">
            <ReserveButton
              id={item.id}
              locale={locale}
              available={item.availability === 'available'}
            />
            <Link
              className="button button-ghost"
              href={`/${locale}/compare?ids=${item.id}`}
            >
              {pick(locale, 'إضافة للمقارنة', 'ADD TO COMPARE')}
            </Link>
            <WishlistButton id={item.id} kind="motorcycle" locale={locale} />
          </div>
          <p>
            {pick(
              locale,
              'الدراجات تحجز بعربون وتتابع مع فريق المبيعات. لا تضاف لسلة المنتجات.',
              'Motorcycles are reserved with a deposit and followed up by our sales team.',
            )}
          </p>
          <p className="motorcycle-branch-note">
            {pick(
              locale,
              'اختر الفرع المناسب في الخطوة التالية من الحجز. بيانات الفرع ستظهر قبل التأكيد.',
              'Choose your preferred branch during the next reservation step. Branch details are shown before confirmation.',
            )}
          </p>
        </div>
      </div>
      <div className="motorcycle-mobile-cta">
        <div>
          <span>{pick(locale, 'عربون الحجز', 'Reservation deposit')}</span>
          <strong>{money(item.deposit_egp, locale)}</strong>
        </div>
        <ReserveButton
          id={item.id}
          locale={locale}
          available={item.availability === 'available'}
        />
      </div>
    </>
  );
}
