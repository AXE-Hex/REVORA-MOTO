import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { setActiveGarage } from '@/app/garage-actions';
import { deleteGarageMotorcycle } from '@/app/account-actions';
import { ConfirmationForm } from '@/components/confirmation-form';

export default async function Garage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const db = await supabase();
  const [{ data: motorcycles, error }, query] = await Promise.all([
    db!
      .from('garage_motorcycles')
      .select('id,variant_id,year,active,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    searchParams,
  ]);
  const variantIds = [
    ...new Set((motorcycles || []).map((item) => item.variant_id)),
  ];
  const { data: variants } = variantIds.length
    ? await db!
        .from('motorcycle_variants')
        .select('id,model_id,name')
        .in('id', variantIds)
    : { data: [] };
  const modelIds = [
    ...new Set((variants || []).map((variant) => variant.model_id)),
  ];
  const { data: models } = modelIds.length
    ? await db!
        .from('motorcycle_models')
        .select('id,brand_id,name')
        .in('id', modelIds)
    : { data: [] };
  const brandIds = [...new Set((models || []).map((model) => model.brand_id))];
  const { data: brands } = brandIds.length
    ? await db!.from('motorcycle_brands').select('id,name').in('id', brandIds)
    : { data: [] };
  const variantById = new Map((variants || []).map((row) => [row.id, row]));
  const modelById = new Map((models || []).map((row) => [row.id, row]));
  const brandById = new Map((brands || []).map((row) => [row.id, row]));
  return (
    <section className="account-garage-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'التوافق مع مركباتك', 'YOUR FITMENT')}
        </span>
        <h2 className="page-title">{pick(locale, 'مرآبي', 'My garage')}</h2>
      </div>
      {(error || query.error) && (
        <p className="notice error">
          {pick(locale, 'تعذر تحديث المرآب', 'Could not update garage')}
        </p>
      )}
      {query.saved && (
        <p className="notice">
          {pick(locale, 'تم تحديث المرآب', 'Garage updated')}
        </p>
      )}
      <Link className="button button-primary" href={`/${locale}/fitment`}>
        {pick(locale, 'إضافة دراجة', 'Add a motorcycle')}
      </Link>
      <div className="card-grid account-garage-list">
        {(motorcycles || []).map((item) => {
          const variant = variantById.get(item.variant_id);
          const model = variant ? modelById.get(variant.model_id) : null;
          const brand = model ? brandById.get(model.brand_id) : null;
          return (
            <article className="panel account-garage-card" key={item.id}>
              <div className="account-garage-card-heading">
                {item.active && (
                  <span className="account-active-label">
                    {pick(locale, 'المركبة النشطة', 'ACTIVE VEHICLE')}
                  </span>
                )}
                <h3>
                  {[brand?.name, model?.name, variant?.name]
                    .filter(Boolean)
                    .join(' · ') ||
                    pick(locale, 'دراجة محفوظة', 'Saved motorcycle')}
                </h3>
              </div>
              <div className="spec-row">
                <span>{pick(locale, 'السنة', 'YEAR')}</span>
                <strong>{item.year}</strong>
              </div>
              <div className="account-garage-actions">
                <Link
                  className="button button-secondary"
                  href={`/${locale}/fitment?variant=${item.variant_id}&year=${item.year}`}
                >
                  {pick(locale, 'عرض القطع المتوافقة', 'View compatible parts')}
                </Link>
                {!item.active && (
                  <form action={setActiveGarage}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="garage" value={item.id} />
                    <button className="button button-primary" type="submit">
                      {pick(locale, 'تعيين كنشطة', 'Set active')}
                    </button>
                  </form>
                )}
                <ConfirmationForm
                  action={deleteGarageMotorcycle}
                  message={pick(
                    locale,
                    'هل تريد حذف هذه الدراجة من مرآبك؟',
                    'Remove this motorcycle from your garage?',
                  )}
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={item.id} />
                  <button className="button button-danger" type="submit">
                    {pick(locale, 'حذف', 'Remove')}
                  </button>
                </ConfirmationForm>
              </div>
            </article>
          );
        })}
      </div>
      {!motorcycles?.length && !error && (
        <div className="panel account-empty-state">
          <h3>{pick(locale, 'مرآبك فارغ', 'Your garage is empty')}</h3>
          <p className="muted">
            {pick(
              locale,
              'أضف دراجتك لتصفية القطع حسب التوافق أثناء التسوق.',
              'Add your motorcycle to filter compatible parts while shopping.',
            )}
          </p>
          <Link className="button button-primary" href={`/${locale}/fitment`}>
            {pick(locale, 'ابحث عن مركبتك', 'Find your motorcycle')}
          </Link>
        </div>
      )}
    </section>
  );
}
