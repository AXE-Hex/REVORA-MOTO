import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { StatusBadge, localizedStatus } from '@/components/ui/status-badge';
import { advanceWarrantyClaim } from '@/app/admin-service-actions';

const nextStatus: Record<string, string[]> = {
  requested: ['reviewing'],
  reviewing: ['approved', 'rejected'],
  approved: ['completed'],
};

export default async function AdminWarranties({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'orders.read',
  });
  if (!allowed) notFound();
  const [{ data: claims }, { data: canWrite }] = await Promise.all([
    db!
      .from('warranty_claims')
      .select('id,warranty_id,details,admin_notes,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db!.rpc('has_permission', { p_permission: 'orders.write' }),
  ]);
  const query = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / WARRANTIES
      </div>
      <h1 className="page-title">
        {pick(locale, 'مطالبات الضمان', 'WARRANTY CLAIMS')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحديث المطالبة', 'Claim update failed')}
        </p>
      )}
      {query.updated && (
        <p className="notice">
          {pick(locale, 'تم تحديث المطالبة', 'Claim updated')}
        </p>
      )}
      {(claims || []).map((claim) => (
        <div className="panel" key={claim.id} style={{ marginBottom: 16 }}>
          <h2>
            {claim.id.slice(0, 8)} ·{' '}
            <StatusBadge status={claim.status} locale={locale} />
          </h2>
          <p>{claim.details}</p>
          {claim.admin_notes && (
            <p>
              {pick(locale, 'ملاحظات الإدارة', 'ADMIN NOTES')}:{' '}
              {claim.admin_notes}
            </p>
          )}
          {canWrite &&
            (nextStatus[claim.status] || []).map((status) => (
              <form
                action={advanceWarrantyClaim}
                className="form-stack"
                key={status}
                style={{ marginTop: 12 }}
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={claim.id} />
                <input type="hidden" name="status" value={status} />
                <input
                  className="input"
                  name="note"
                  maxLength={2000}
                  placeholder={pick(locale, 'ملاحظات الإدارة', 'Admin notes')}
                />
                <button
                  className={`button ${['approved', 'completed'].includes(status) ? 'button-success' : status === 'rejected' ? 'button-danger' : 'button-secondary'}`}
                  type="submit"
                >
                  {localizedStatus(status, locale)}
                </button>
              </form>
            ))}
        </div>
      ))}
      {!claims?.length && <p>{pick(locale, 'لا توجد مطالبات', 'No claims')}</p>}
    </div>
  );
}
