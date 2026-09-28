import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, currentUser } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { ProductCard } from '@/components/cards';
import { AddGarage } from '@/components/add-garage';
import type { Product } from '@/lib/catalog';
import { setActiveGarage } from '@/app/garage-actions';
export default async function Fitment({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ variant?: string; year?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const q = await searchParams;
  const db = await supabase();
  const [{ data: brands }, { data: models }, { data: variants }, user] = db
    ? await Promise.all([
        db.from('motorcycle_brands').select('id,name').order('name'),
        db.from('motorcycle_models').select('id,brand_id,name').order('name'),
        db
          .from('motorcycle_variants')
          .select('id,model_id,name,start_year,end_year')
          .order('name'),
        currentUser(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, null];
  const year = Number(q.year);
  const selected = variants?.find((v) => v.id === q.variant);
  let compatible: Product[] = [];
  if (
    db &&
    selected &&
    Number.isInteger(year) &&
    year >= selected.start_year &&
    year <= (selected.end_year || 2100)
  ) {
    const { data: matches } = await db.rpc('compatible_product_ids', {
      p_variant: selected.id,
      p_year: year,
    });
    const ids = (matches || []).map(
      (x: { product_id: string }) => x.product_id,
    );
    if (ids.length) {
      const { data } = await db
        .from('public_products')
        .select('*')
        .in('id', ids);
      compatible = data || [];
    }
  }
  const garage =
    user && db
      ? await db
          .from('garage_motorcycles')
          .select('id,variant_id,year,active')
          .eq('user_id', user.id)
      : null;
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <div className="breadcrumbs">
            <Link href={`/${locale}`}>REVORA</Link> / FITMENT
          </div>
          <span className="section-index">PRECISION FITMENT</span>
          <h1 className="page-title">
            {pick(locale, 'القطعة المناسبة لدراجتك', 'FIND YOUR PERFECT FIT')}
          </h1>
          <p>
            {pick(
              locale,
              'اختر الماركة والطراز والسنة والنسخة، ثم اكتشف القطع المناسبة.',
              'Select your brand, model, year and variant to see compatible parts.',
            )}
          </p>
        </div>
      </section>
      <div className="shell section-small">
        {q.error && <div className="notice error">{q.error}</div>}
        <AddGarage
          locale={locale}
          brands={brands || []}
          models={models || []}
          variants={variants || []}
          selectedYear={q.year || ''}
          selectedVariant={q.variant || ''}
        />
        {user && selected && year > 0 && (
          <form
            action={async (formData: FormData) => {
              'use server';
              const { addGarage } = await import('@/app/actions');
              await addGarage(formData);
            }}
            style={{ marginTop: 14 }}
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="variant" value={selected.id} />
            <input type="hidden" name="year" value={year} />
            <button className="button button-ghost">
              {pick(locale, 'أضف إلى مرآبي', 'ADD TO MY GARAGE')}
            </button>
          </form>
        )}
        {garage?.data?.length ? (
          <div className="panel" style={{ marginTop: 25 }}>
            <h2>{pick(locale, 'دراجاتي المحفوظة', 'MY GARAGE')}</h2>
            {garage.data.map((g) => (
              <div className="garage-row" key={g.id}>
                <Link
                  className="text-link"
                  href={`/${locale}/fitment?variant=${g.variant_id}&year=${g.year}`}
                >
                  {variants?.find((v) => v.id === g.variant_id)?.name ||
                    'Motorcycle'}{' '}
                  · {g.year} ↗
                </Link>
                {g.active ? (
                  <span className="status">
                    {pick(locale, 'الدراجة النشطة', 'ACTIVE MOTORCYCLE')}
                  </span>
                ) : (
                  <form action={setActiveGarage}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="garage" value={g.id} />
                    <button className="button button-ghost" type="submit">
                      {pick(locale, 'تفعيل', 'SET ACTIVE')}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {selected && (
          <div className="section-heading" style={{ marginTop: 55 }}>
            <div>
              <span className="section-index">COMPATIBLE PARTS</span>
              <h2>{pick(locale, 'القطع المتوافقة', 'PARTS THAT FIT')}</h2>
            </div>
          </div>
        )}
        {selected &&
          (compatible.length ? (
            <div className="card-grid product-grid">
              {compatible.map((p) => (
                <ProductCard key={p.id} item={p} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {pick(
                locale,
                'لا توجد قطع متوافقة مسجلة لهذا الطراز حالياً.',
                'No compatible parts have been listed for this variant yet.',
              )}
            </div>
          ))}
      </div>
    </>
  );
}
