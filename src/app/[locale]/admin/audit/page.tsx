import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { localizedAuditAction, localizedAuditEntity } from '@/lib/admin-format';

type Audit = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: unknown;
  created_at: string;
};

export default async function AdminAudit({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !(await currentUser())) notFound();
  const db = await supabase();
  const { data: allowed } = await db!.rpc('has_permission', {
    p_permission: 'audit.read',
  });
  if (!allowed) notFound();
  const query = await searchParams;
  const page = Math.max(
    1,
    Math.min(200, Number.parseInt(query.page || '1', 10) || 1),
  );
  const entity = (query.entity || '').trim().slice(0, 80);
  let request = db!
    .from('audit_logs')
    .select('id,actor_id,action,entity,entity_id,detail,created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (entity) request = request.eq('entity', entity);
  const { data, error } = await request;
  const rows = (data || []) as Audit[];
  const href = (nextPage: number) =>
    `/${locale}/admin/audit?${new URLSearchParams({ entity, page: String(nextPage) })}`;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / AUDIT
      </div>
      <h1 className="page-title">{pick(locale, 'سجل التدقيق', 'AUDIT LOG')}</h1>
      <form className="toolbar" method="get">
        <input
          className="input"
          name="entity"
          defaultValue={entity}
          maxLength={80}
          placeholder={pick(locale, 'اسم الجدول', 'Entity name')}
        />
        <button className="button button-accent" type="submit">
          {pick(locale, 'تصفية', 'FILTER')}
        </button>
      </form>
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل السجل', 'Could not load audit log')}
        </p>
      )}
      <div className="panel" style={{ marginTop: 20 }}>
        {rows.map((row) => (
          <details key={row.id} className="spec-row admin-audit-card">
            <summary>
              {new Date(row.created_at).toLocaleString(
                locale === 'ar' ? 'ar-EG' : 'en-GB',
              )}{' '}
              · {localizedAuditAction(locale, row.action)} ·{' '}
              {localizedAuditEntity(locale, row.entity)}
            </summary>
            <div style={{ overflowWrap: 'anywhere' }}>
              <p>
                {pick(locale, 'المنفذ', 'Actor')}: {row.actor_id || 'system'}
              </p>
              <p>
                {pick(locale, 'السجل', 'Record')}: {row.entity_id || '—'}
              </p>
              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {JSON.stringify(row.detail, null, 2)}
              </pre>
            </div>
          </details>
        ))}
        {!rows.length && !error && (
          <p>{pick(locale, 'لا توجد أحداث', 'No events')}</p>
        )}
      </div>
      <div className="toolbar" style={{ marginTop: 20 }}>
        {page > 1 && (
          <Link className="button button-ghost" href={href(page - 1)}>
            {pick(locale, 'السابق', 'PREVIOUS')}
          </Link>
        )}
        <span>
          {pick(locale, 'صفحة', 'Page')} {page}
        </span>
        {rows.length === 50 && (
          <Link className="button button-ghost" href={href(page + 1)}>
            {pick(locale, 'التالي', 'NEXT')}
          </Link>
        )}
      </div>
    </div>
  );
}
