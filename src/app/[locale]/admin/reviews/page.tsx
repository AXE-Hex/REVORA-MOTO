import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { StatusBadge, localizedStatus } from '@/components/ui/status-badge';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { adminModerateReview } from '@/app/admin-actions';

export default async function AdminReviews({
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
    p_permission: 'content.write',
  });
  if (!allowed) notFound();
  const { data: reviews, error } = await db!
    .from('reviews')
    .select('id,product_id,rating,body,status,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  const query = await searchParams;
  return (
    <div className="shell section-small">
      <div className="breadcrumbs">
        <Link href={`/${locale}/admin`}>ADMIN</Link> / REVIEWS
      </div>
      <h1 className="page-title">
        {pick(locale, 'مراجعة التقييمات', 'REVIEW MODERATION')}
      </h1>
      {query.error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحديث التقييم', 'Review update failed')}
        </p>
      )}
      {query.updated && (
        <p className="notice">
          {pick(locale, 'تم تحديث التقييم', 'Review updated')}
        </p>
      )}
      {error && (
        <p className="notice error">
          {pick(locale, 'تعذر تحميل التقييمات', 'Could not load reviews')}
        </p>
      )}
      {(reviews || []).map((review) => (
        <div className="panel" key={review.id} style={{ marginBottom: 12 }}>
          <p>
            <strong>{'★'.repeat(review.rating)}</strong> ·{' '}
            <StatusBadge status={review.status} locale={locale} />
          </p>
          <p>{review.body}</p>
          <small>
            {new Date(review.created_at).toLocaleDateString(locale)} ·{' '}
            {review.product_id.slice(0, 8)}
          </small>
          {review.status === 'pending' && (
            <div className="toolbar" style={{ marginTop: 12 }}>
              {(['published', 'rejected'] as const).map((status) => (
                <form action={adminModerateReview} key={status}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={review.id} />
                  <input type="hidden" name="status" value={status} />
                  {status === 'rejected' ? (
                    <ConfirmSubmitButton
                      label={localizedStatus(status, locale)}
                      message={pick(
                        locale,
                        'هل تريد رفض هذا التقييم؟',
                        'Reject this review?',
                      )}
                      className="button button-danger"
                    />
                  ) : (
                    <button className="button button-success" type="submit">
                      {localizedStatus(status, locale)}
                    </button>
                  )}
                </form>
              ))}
            </div>
          )}
        </div>
      ))}
      {!reviews?.length && (
        <p>{pick(locale, 'لا توجد تقييمات', 'No reviews')}</p>
      )}
    </div>
  );
}
