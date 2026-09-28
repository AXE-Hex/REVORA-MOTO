import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { saveBranch } from '@/app/admin-vehicle-actions';

export default async function AdminBranches({
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
    p_permission: 'motorcycles.write',
  });
  if (!allowed) notFound();
  const { data: branches, error: listError } = await db!
    .from('branches')
    .select('id,name_ar,name_en,address_ar,address_en,active')
    .order('name_en');
  const query = await searchParams;
  const selected = (branches || []).find((branch) => branch.id === query.edit);
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / BRANCHES
      </div>
      <h1 className="page-title">
        {pick(locale, 'إدارة الفروع', 'BRANCH MANAGEMENT')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر حفظ الفرع', 'Could not save branch')}
        </p>
      )}
      {query.saved && (
        <p className="notice">{pick(locale, 'تم الحفظ', 'Saved')}</p>
      )}
      <div className="two-column">
        <div className="panel">
          <h2>{pick(locale, 'الفروع', 'BRANCHES')}</h2>
          {listError && (
            <p className="notice error" role="alert">
              {pick(locale, 'تعذر تحميل القائمة', 'Could not load the list')}
            </p>
          )}
          {!listError && !(branches || []).length && (
            <p className="admin-empty-table">
              {pick(locale, 'لا توجد عناصر بعد.', 'No entries yet.')}
            </p>
          )}
          {(branches || []).map((branch) => (
            <div className="spec-row" key={branch.id}>
              <Link href={`/${locale}/admin/branches?edit=${branch.id}`}>
                {pick(locale, branch.name_ar, branch.name_en)}
              </Link>
              <span>
                {branch.active
                  ? pick(locale, 'نشط', 'Active')
                  : pick(locale, 'غير نشط', 'Inactive')}
              </span>
            </div>
          ))}
        </div>
        <form action={saveBranch} className="panel form-stack">
          <h2>
            {selected
              ? pick(locale, 'تعديل فرع', 'EDIT BRANCH')
              : pick(locale, 'فرع جديد', 'NEW BRANCH')}
          </h2>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={selected?.id || ''} />
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
            {pick(locale, 'العنوان بالعربية', 'ARABIC ADDRESS')}
            <input
              className="input"
              name="address_ar"
              defaultValue={selected?.address_ar || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'العنوان بالإنجليزية', 'ENGLISH ADDRESS')}
            <input
              className="input"
              name="address_en"
              defaultValue={selected?.address_en || ''}
            />
          </label>
          <label className="field-label">
            {pick(locale, 'الحالة', 'STATUS')}
            <select
              className="input"
              name="active"
              defaultValue={selected?.active === false ? 'false' : 'true'}
            >
              <option value="true">{pick(locale, 'نشط', 'Active')}</option>
              <option value="false">
                {pick(locale, 'غير نشط', 'Inactive')}
              </option>
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
