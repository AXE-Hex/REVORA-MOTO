import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
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
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const { data: rows } = await db!
    .from('wishlist_items')
    .select('product_id,motorcycle_id,created_at')
    .eq('user_id', user.id);
  const pids = (rows || []).flatMap((r) =>
    r.product_id ? [r.product_id] : [],
  );
  const mids = (rows || []).flatMap((r) =>
    r.motorcycle_id ? [r.motorcycle_id] : [],
  );
  const [{ data: gear }, { data: bikes }] = await Promise.all([
    pids.length
      ? db!
          .from('public_products')
          .select('id,slug,name_ar,name_en')
          .in('id', pids)
      : { data: [] },
    mids.length
      ? db!
          .from('public_motorcycles')
          .select('id,slug,name_ar,name_en')
          .in('id', mids)
      : { data: [] },
  ]);
  return (
    <div className="shell section-small">
      <span className="section-index">REVORA / WISHLIST</span>
      <h1 className="page-title">
        {pick(locale, 'قائمة الرغبات', 'WISHLIST')}
      </h1>
      <div className="card-grid">
        {gear?.map((p) => (
          <Link className="panel" key={p.id} href={`/${locale}/shop/${p.slug}`}>
            {pick(locale, p.name_ar, p.name_en)} ↗
          </Link>
        ))}
        {bikes?.map((b) => (
          <Link
            className="panel"
            key={b.id}
            href={`/${locale}/motorcycles/${b.slug}`}
          >
            {pick(locale, b.name_ar, b.name_en)} ↗
          </Link>
        ))}
      </div>
      {!rows?.length && (
        <p>{pick(locale, 'قائمة الرغبات فارغة', 'Your wishlist is empty')}</p>
      )}
    </div>
  );
}
