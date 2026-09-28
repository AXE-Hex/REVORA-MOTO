import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ProductCard, MotorcycleCard } from '@/components/cards';
import type { Motorcycle, Product } from '@/lib/catalog';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';

export default async function Wishlist({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/account/wishlist`);
  const db = await supabase();
  const { data: rows, error } = await db!
    .from('wishlist_items')
    .select('product_id,motorcycle_id,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const pids = (rows || []).flatMap((row) =>
    row.product_id ? [row.product_id] : [],
  );
  const mids = (rows || []).flatMap((row) =>
    row.motorcycle_id ? [row.motorcycle_id] : [],
  );
  const [
    { data: products, error: productError },
    { data: motorcycles, error: motorcycleError },
  ] = await Promise.all([
    pids.length
      ? db!.from('public_products').select('*').in('id', pids)
      : { data: [], error: null },
    mids.length
      ? db!.from('public_motorcycles').select('*').in('id', mids)
      : { data: [], error: null },
  ]);
  const failed = Boolean(error || productError || motorcycleError);
  const availableCount = (products?.length || 0) + (motorcycles?.length || 0);

  return (
    <section className="account-wishlist-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'محفوظاتك', 'SAVED FOR LATER')}
        </span>
        <h2 className="page-title">
          {pick(locale, 'قائمة الرغبات', 'Wishlist')}
        </h2>
      </div>
      {failed && (
        <p className="notice error">
          {pick(
            locale,
            'تعذر تحميل قائمة الرغبات',
            'Could not load your wishlist',
          )}
        </p>
      )}
      {!failed && rows?.length ? (
        <div className="card-grid account-wishlist-grid">
          {(products || []).map((product) => (
            <ProductCard
              item={product as Product}
              key={product.id}
              locale={locale}
            />
          ))}
          {(motorcycles || []).map((motorcycle) => (
            <MotorcycleCard
              item={motorcycle as Motorcycle}
              key={motorcycle.id}
              locale={locale}
            />
          ))}
        </div>
      ) : null}
      {!failed && !rows?.length && (
        <div className="panel account-empty-state">
          <h3>
            {pick(locale, 'قائمة الرغبات فارغة', 'Your wishlist is empty')}
          </h3>
          <p className="muted">
            {pick(
              locale,
              'احفظ المنتجات والدراجات التي تود الرجوع إليها لاحقاً.',
              'Save products and motorcycles to revisit them later.',
            )}
          </p>
          <Link className="button button-primary" href={`/${locale}/shop`}>
            {pick(locale, 'استكشف المنتجات', 'Explore products')}
          </Link>
        </div>
      )}
      {!failed && rows?.length && availableCount === 0 && (
        <div className="panel account-empty-state">
          <h3>
            {pick(
              locale,
              'العناصر المحفوظة لم تعد متاحة',
              'Saved items are no longer available',
            )}
          </h3>
          <p className="muted">
            {pick(
              locale,
              'بعض العناصر أزيلت من الكتالوج ويمكنك متابعة استكشاف المنتجات المتاحة.',
              'Some saved items are no longer in the catalog. Explore currently available items.',
            )}
          </p>
          <Link
            className="button button-secondary"
            href={`/${locale}/motorcycles`}
          >
            {pick(locale, 'استكشف الدراجات', 'Explore motorcycles')}
          </Link>
        </div>
      )}
    </section>
  );
}
