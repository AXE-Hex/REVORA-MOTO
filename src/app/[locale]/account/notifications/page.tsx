import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { setNotificationRead } from '@/app/notification-actions';
export default async function Notifications({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth`);
  const { data: rows, error } = await (await supabase())!
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const query = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/account`}>ACCOUNT</Link> / NOTIFICATIONS
      </div>
      <h1 className="page-title">
        {pick(locale, 'الإشعارات', 'NOTIFICATIONS')}
      </h1>
      {(error || query.error) && (
        <p className="notice error">
          {pick(
            locale,
            'تعذر تحديث الإشعارات',
            'Could not update notifications',
          )}
        </p>
      )}
      {rows?.map((n) => (
        <div className="panel" style={{ marginBottom: 12 }} key={n.id}>
          <strong>{pick(locale, n.title_ar, n.title_en)}</strong>
          <p>{pick(locale, n.body_ar || '', n.body_en || '')}</p>
          <small>{new Date(n.created_at).toLocaleDateString()}</small>
          <form action={setNotificationRead}>
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="locale" value={locale} />
            <input
              type="hidden"
              name="read"
              value={n.read_at ? 'false' : 'true'}
            />
            <button className="button button-ghost" type="submit">
              {n.read_at
                ? pick(locale, 'تحديد كغير مقروء', 'Mark unread')
                : pick(locale, 'تحديد كمقروء', 'Mark read')}
            </button>
          </form>
        </div>
      ))}
      {!rows?.length && (
        <p>{pick(locale, 'لا توجد إشعارات بعد', 'No notifications yet')}</p>
      )}
    </div>
  );
}
