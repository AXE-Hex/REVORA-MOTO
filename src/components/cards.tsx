import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Gauge, CalendarDays } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { money, pick } from '@/lib/i18n';
import type { Motorcycle, Product } from '@/lib/catalog';

function Photo({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 700px) 90vw, 33vw"
      className="card-photo"
    />
  ) : (
    <div className="image-fallback">
      REVORA<span>R/</span>
    </div>
  );
}
export function MotorcycleCard({
  item,
  locale,
}: {
  item: Motorcycle;
  locale: Locale;
}) {
  const name = pick(locale, item.name_ar, item.name_en);
  return (
    <Link href={`/${locale}/motorcycles/${item.slug}`} className="catalog-card">
      <div className="card-image">
        <Photo src={item.image_url} alt={name} />
        <span className="card-tag">
          {item.condition === 'new'
            ? pick(locale, 'جديد', 'NEW')
            : pick(locale, 'مستعمل', 'PRE-OWNED')}
        </span>
        {item.is_demo && (
          <span className="demo-tag">{pick(locale, 'تجريبي', 'DEMO')}</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-kicker">
          REVORA MOTORCYCLES <span>↗</span>
        </div>
        <h3>{name}</h3>
        <div className="card-meta">
          <span>
            <CalendarDays size={14} />
            {item.year}
          </span>
          {item.engine_cc && (
            <span>
              <Gauge size={14} />
              {item.engine_cc} CC
            </span>
          )}
        </div>
        <div className="card-bottom">
          <div>
            <small>{pick(locale, 'السعر', 'PRICE')}</small>
            <strong>{money(item.price_egp, locale)}</strong>
          </div>
          <span className="circle-arrow">
            <ArrowUpRight size={20} />
          </span>
        </div>
      </div>
    </Link>
  );
}
export function ProductCard({
  item,
  locale,
  fitment = 'unknown',
}: {
  item: Product;
  locale: Locale;
  fitment?: 'compatible' | 'incompatible' | 'unknown';
}) {
  const name = pick(locale, item.name_ar, item.name_en);
  return (
    <Link href={`/${locale}/shop/${item.slug}`} className="catalog-card">
      <div className="card-image">
        <Photo src={item.image_url} alt={name} />
        {item.sale_price_egp && <span className="card-tag sale">SALE</span>}
        {item.is_demo && (
          <span className="demo-tag">{pick(locale, 'تجريبي', 'DEMO')}</span>
        )}
        {fitment !== 'unknown' && (
          <span className={`fitment-tag ${fitment}`}>
            {fitment === 'compatible'
              ? pick(locale, 'متوافق', 'FITS YOUR BIKE')
              : pick(locale, 'غير متوافق', 'DOES NOT FIT')}
          </span>
        )}
      </div>
      <div className="card-body">
        <div className="card-kicker">{item.sku}</div>
        <h3>{name}</h3>
        <div className="card-bottom">
          <div>
            <small>{pick(locale, 'السعر', 'PRICE')}</small>
            <strong>
              {money(item.sale_price_egp || item.price_egp, locale)}
            </strong>
          </div>
          <span className="circle-arrow">
            <ArrowUpRight size={20} />
          </span>
        </div>
      </div>
    </Link>
  );
}
