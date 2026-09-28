import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUpRight,
  ShieldCheck,
  Wrench,
  Truck,
  MoveUpRight,
} from 'lucide-react';
import { motorcycles, products } from '@/lib/catalog';
import { MotorcycleCard, ProductCard } from '@/components/cards';
import { Empty } from '@/components/empty';
import { copy, isLocale, pick, type Locale } from '@/lib/i18n';
import { notFound } from 'next/navigation';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = copy[locale];
  const [bikes, gear] = await Promise.all([
    motorcycles({ limit: 3 }),
    products({ limit: 4 }),
  ]);
  return (
    <>
      <section className="hero">
        <Image
          className="hero-bike-backdrop"
          src="/images/revora-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="hero-grid" />
        <div className="shell hero-content">
          <div className="eyebrow">
            <span className="eyebrow-line" /> REVORA MOTO{' '}
            <span className="eyebrow-index">/ 001</span>
          </div>
          <div className="hero-layout">
            <div>
              <p className="hero-overline">
                {pick(
                  locale,
                  'صُممنا لرحلتك القادمة',
                  'ENGINEERED FOR THE JOURNEY',
                )}
              </p>
              <h1>
                {locale === 'ar' ? (
                  <>
                    الطريق <em>لك.</em>
                    <br />
                    والقرار <em>لك.</em>
                  </>
                ) : (
                  <>
                    OWN THE <em>ROAD.</em>
                    <br />
                    FEEL THE <em>RIDE.</em>
                  </>
                )}
              </h1>
              <p className="hero-description">
                {pick(
                  locale,
                  'دراجات استثنائية، معدات مختارة بعناية، وكل ما تحتاجه للانطلاق بثقة.',
                  'Exceptional motorcycles. Purpose-built gear. Everything you need for the road ahead.',
                )}
              </p>
              <div className="hero-buttons">
                <Link
                  className="button button-accent"
                  href={`/${locale}/motorcycles`}
                >
                  {t.explore} <ArrowUpRight size={18} />
                </Link>
                <Link className="button button-ghost" href={`/${locale}/shop`}>
                  {t.shop} <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <span className="visual-caption">PRECISION. POWER. FREEDOM.</span>
            </div>
          </div>
          <div className="hero-bottom">
            <span>01 / 03 &nbsp;&nbsp; THE REVORA EXPERIENCE</span>
            <Link href="#collection">
              <ArrowDown size={18} />
              {pick(locale, 'مرر للاستكشاف', 'SCROLL TO EXPLORE')}
            </Link>
          </div>
        </div>
      </section>
      <section className="value-strip">
        <div className="shell value-inner">
          <span>
            <ShieldCheck size={20} />
            {pick(locale, 'اختيارات موثوقة', 'CURATED WITH CONFIDENCE')}
          </span>
          <span>
            <Wrench size={20} />
            {pick(locale, 'قطع متوافقة', 'PRECISION FITMENT')}
          </span>
          <span>
            <Truck size={20} />
            {pick(locale, 'توصيل داخل مصر', 'DELIVERY ACROSS EGYPT')}
          </span>
        </div>
      </section>
      <section className="section shell" id="collection">
        <div className="section-heading">
          <div>
            <span className="section-index">01 / MOTORCYCLES</span>
            <h2>
              {pick(locale, 'اكتشف دراجتك القادمة', 'FIND YOUR NEXT RIDE')}
            </h2>
            <p>
              {pick(
                locale,
                'اختر من مجموعتنا الجديدة والمستعملة.',
                'Explore our new and pre-owned motorcycles.',
              )}
            </p>
          </div>
          <Link className="text-link" href={`/${locale}/motorcycles`}>
            {pick(locale, 'عرض جميع الدراجات', 'VIEW ALL MOTORCYCLES')}{' '}
            <MoveUpRight size={18} />
          </Link>
        </div>
        {bikes.length ? (
          <div className="card-grid">
            {bikes.map((item) => (
              <MotorcycleCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        ) : (
          <Empty locale={locale} />
        )}
      </section>
      <section className="feature-banner">
        <div className="shell feature-inner">
          <span className="section-index">02 / YOUR MACHINE</span>
          <h2>
            {pick(
              locale,
              'القطعة المناسبة.\nلدراجتك تماماً.',
              'THE RIGHT PART.\nFOR YOUR RIDE.',
            )}
          </h2>
          <p>
            {pick(
              locale,
              'اختر طراز دراجتك وسنعرض لك القطع المتوافقة معها.',
              'Select your motorcycle and discover parts engineered to fit.',
            )}
          </p>
          <Link className="button button-accent" href={`/${locale}/fitment`}>
            {pick(locale, 'ابحث حسب الدراجة', 'FIND YOUR FIT')}{' '}
            <ArrowUpRight size={18} />
          </Link>
          <div className="feature-number">R/</div>
        </div>
      </section>
      <section className="section shell">
        <div className="section-heading">
          <div>
            <span className="section-index">03 / THE SHOP</span>
            <h2>{pick(locale, 'جهّز نفسك للطريق', 'GEAR UP FOR THE ROAD')}</h2>
            <p>
              {pick(
                locale,
                'معدات وقطع مختارة لكل رحلة.',
                'Selected gear and parts for every journey.',
              )}
            </p>
          </div>
          <Link className="text-link" href={`/${locale}/shop`}>
            {pick(locale, 'تسوق المجموعة', 'SHOP THE COLLECTION')}{' '}
            <MoveUpRight size={18} />
          </Link>
        </div>
        {gear.length ? (
          <div className="card-grid product-grid">
            {gear.map((item) => (
              <ProductCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        ) : (
          <Empty locale={locale} />
        )}
      </section>
      <section className="closing-cta">
        <div className="shell">
          <span className="section-index">REVORA MOTO / EGYPT</span>
          <h2>
            {pick(locale, 'رحلتك تبدأ من هنا.', 'YOUR RIDE STARTS HERE.')}
          </h2>
          <Link className="button button-accent" href={`/${locale}/contact`}>
            {t.contact} <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
