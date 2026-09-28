import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
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
    .select('id,title_ar,title_en,body_ar,body_en,created_at,read_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const query = await searchParams;
  return (
    <section className="account-notifications-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'تحديثات الحساب', 'ACCOUNT UPDATES')}
        </span>
        <h2 className="page-title">
          {pick(locale, 'الإشعارات', 'Notifications')}
        </h2>
      </div>
      {(error || query.error) && (
        <p className="notice error">
          {pick(
            locale,
            'تعذر تحديث الإشعارات',
            'Could not update notifications',
          )}
        </p>
      )}
      <div className="account-notification-list">
        {rows?.map((notification) => (
          <article
            className={`account-notification-card panel${notification.read_at ? '' : ' is-unread'}`}
            key={notification.id}
          >
            <div className="account-notification-copy">
              <div className="account-notification-title">
                <strong>
                  {pick(locale, notification.title_ar, notification.title_en)}
                </strong>
                {!notification.read_at && (
                  <span className="account-unread-indicator">
                    {pick(locale, 'جديد', 'New')}
                  </span>
                )}
              </div>
              {pick(
                locale,
                notification.body_ar || '',
                notification.body_en || '',
              ) && (
                <p>
                  {pick(
                    locale,
                    notification.body_ar || '',
                    notification.body_en || '',
                  )}
                </p>
              )}
              <time dateTime={notification.created_at}>
                {formatDate(notification.created_at, locale)}
              </time>
            </div>
            <form action={setNotificationRead}>
              <input type="hidden" name="id" value={notification.id} />
              <input type="hidden" name="locale" value={locale} />
              <input
                type="hidden"
                name="read"
                value={notification.read_at ? 'false' : 'true'}
              />
              <button className="button button-secondary" type="submit">
                {notification.read_at
                  ? pick(locale, 'تحديد كغير مقروء', 'Mark unread')
                  : pick(locale, 'تحديد كمقروء', 'Mark read')}
              </button>
            </form>
          </article>
        ))}
      </div>
      {!error && !query.error && !rows?.length && (
        <div className="panel account-empty-state">
          <h3>{pick(locale, 'أنت على اطلاع', 'You are all caught up')}</h3>
          <p className="muted">
            {pick(
              locale,
              'ستجد هنا تحديثات الطلبات والحجوزات والحساب.',
              'Order, reservation and account updates will appear here.',
            )}
          </p>
          <Link className="button button-secondary" href={`/${locale}/shop`}>
            {pick(locale, 'متابعة التسوق', 'Continue shopping')}
          </Link>
        </div>
      )}
    </section>
  );
}
