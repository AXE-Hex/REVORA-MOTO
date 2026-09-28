import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { saveCategory } from '@/app/admin-catalog-actions';

export default async function AdminCategories({
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
  const { data: categories } = await db!
    .from('categories')
    .select('id,parent_id,slug,name_ar,name_en,active')
    .order('name_en');
  const query = await searchParams;
  const selected = (categories || []).find(
    (category) => category.id === query.edit,
  );
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / CATEGORIES
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة الفئات', 'CATEGORY MANAGEMENT')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ الفئة', 'Could not save category')}
        </p>
      )}
      {query.saved && (
        <p className="notice">{pick(locale, 'تم الحفظ', 'Saved')}</p>
      )}
      <div className="two-column">
        <div className="panel">
          <h2>{pick(locale, 'الفئات', 'CATEGORIES')}</h2>
          {(categories || []).map((category) => (
            <div className="spec-row" key={category.id}>
              <Link href={`/${locale}/admin/categories?edit=${category.id}`}>
                {pick(locale, category.name_ar, category.name_en)}
              </Link>
              <span>{category.active ? 'active' : 'inactive'}</span>
            </div>
          ))}
        </div>
        <form action={saveCategory} className="panel form-stack">
          <h2>
            {selected
              ? pick(locale, 'تعديل فئة', 'EDIT CATEGORY')
              : pick(locale, 'فئة جديدة', 'NEW CATEGORY')}
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
            {pick(locale, 'الاسم بالعربية', 'ARABIC NAME')}
            <input
              className="input"
              name="name_ar"
              required
              defaultValue={selected?.name_ar || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الاسم بالإنجليزية', 'ENGLISH NAME')}
            <input
              className="input"
              name="name_en"
              required
              defaultValue={selected?.name_en || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الفئة الأم', 'PARENT CATEGORY')}
            <select
              className="input"
              name="parent_id"
              defaultValue={selected?.parent_id || ''}
            >
              <option value="">—</option>
              {(categories || [])
                .filter((category) => category.id !== selected?.id)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {pick(locale, category.name_ar, category.name_en)}
                  </option>
                ))}
            </select>
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
