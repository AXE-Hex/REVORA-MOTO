import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { saveBrand } from '@/app/admin-catalog-actions';

export default async function AdminBrands({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'catalog.write',
  });
  if (!allowed) notFound();
  const { data: brands } = await db!
    .from('brands')
    .select('id,slug,name,active')
    .order('name');
  const query = await searchParams;
  const selected = (brands || []).find((brand) => brand.id === query.edit);
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / BRANDS
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة العلامات', 'BRAND MANAGEMENT')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ العلامة', 'Could not save brand')}
        </p>
      )}
      {query.saved && (
        <p className="notice">{pick(locale, 'تم الحفظ', 'Saved')}</p>
      )}
      <div className="two-column">
        <div className="panel">
          <h2>{pick(locale, 'العلامات', 'BRANDS')}</h2>
          {(brands || []).map((brand) => (
            <div className="spec-row" key={brand.id}>
              <Link href={`/${locale}/admin/brands?edit=${brand.id}`}>
                {brand.name}
              </Link>
              <span>{brand.active ? 'active' : 'inactive'}</span>
            </div>
          ))}
        </div>
        <form action={saveBrand} className="panel form-stack">
          <h2>
            {selected
              ? pick(locale, 'تعديل علامة', 'EDIT BRAND')
              : pick(locale, 'علامة جديدة', 'NEW BRAND')}
          </h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={selected?.id || ''} />
          <label className="field-label">
            Slug
            <input
              className="input"
              name="slug"
              required
              defaultValue={selected?.slug || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الاسم', 'NAME')}
            <input
              className="input"
              name="name"
              required
              defaultValue={selected?.name || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الحالة', 'STATUS')}
            <select
              className="input"
              name="active"
              defaultValue={selected?.active === false ? 'false' : 'true'}
            >
              <option value="true">active</option>
              <option value="false">inactive</option>
            </select>
          </label>
          <button className="button button-accent" type="submit">
            {pick(locale, 'حفظ', 'SAVE')}
          </button>
        </form>
      </div>
    </div>
  );
}
