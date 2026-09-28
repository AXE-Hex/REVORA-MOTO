import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser, supabase } from '@/lib/supabase/server';
import { isLocale, pick } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmationForm } from '@/components/confirmation-form';
import {
  submitCustomerReview,
  updateOwnReview,
  deleteOwnReview,
} from '@/app/account-actions';
import { productListing } from '@/lib/catalog';

export default async function Reviews({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/auth?next=/${locale}/account/reviews`);
  const db = await supabase();
  const [
    { data: reviews, error },
    { data: candidates, error: candidatesError },
    query,
  ] = await Promise.all([
    db!
      .from('reviews')
      .select('id,product_id,order_id,rating,body,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    db!.rpc('customer_review_candidates', { p_limit: 50, p_offset: 0 }),
    searchParams,
  ]);
  const productIds: string[] = Array.from(
    new Set(
      (candidates || []).map((row: { product_id: string }) => row.product_id),
    ),
  );
  const reviewedProductIds = (reviews || []).map((review) => review.product_id);
  const allProductIds = [...new Set([...productIds, ...reviewedProductIds])];
  const listing = allProductIds.length
    ? await productListing({ ids: allProductIds, limit: 100 })
    : { items: [], total: 0 };
  const productById = new Map(
    listing.items.map((product) => [product.id, product]),
  );

  return (
    <section className="account-reviews-page">
      <div className="account-page-heading">
        <span className="section-index">
          {pick(locale, 'تجربتك مع منتجاتنا', 'YOUR PRODUCT EXPERIENCE')}
        </span>
        <h2 className="page-title">{pick(locale, 'تقييماتي', 'My reviews')}</h2>
      </div>
      {(error || candidatesError || query.error) && (
        <p className="notice error">
          {pick(
            locale,
            'تعذر تحميل أو حفظ التقييمات',
            'Could not load or save reviews',
          )}
        </p>
      )}
      {query.saved && (
        <p className="notice">
          {pick(
            locale,
            'تم إرسال التقييم للمراجعة',
            'Review submitted for moderation',
          )}
        </p>
      )}

      <section className="account-review-section">
        <div className="account-section-heading">
          <div>
            <span className="section-index">
              {pick(
                locale,
                'مؤهلة من طلباتك المستلمة',
                'ELIGIBLE FROM DELIVERED ORDERS',
              )}
            </span>
            <h3>
              {pick(locale, 'منتجات يمكنك تقييمها', 'Products you can review')}
            </h3>
          </div>
          <span className="muted">
            {pick(
              locale,
              'تقييم واحد لكل منتج في كل طلب',
              'One review per product per order',
            )}
          </span>
        </div>
        <div className="account-review-list">
          {(candidates || []).map(
            (candidate: {
              order_id: string;
              order_number: number;
              product_id: string;
              product_name_ar: string;
              product_name_en: string;
            }) => {
              const product = productById.get(candidate.product_id);
              const formId = `review-${candidate.order_id}-${candidate.product_id}`;
              return (
                <article
                  className="panel account-review-candidate"
                  key={formId}
                >
                  <div className="account-review-product">
                    <span className="section-index">
                      {pick(locale, 'طلب مستلم', 'DELIVERED ORDER')} #
                      {candidate.order_number}
                    </span>
                    <strong>
                      {pick(
                        locale,
                        candidate.product_name_ar,
                        candidate.product_name_en,
                      )}
                    </strong>
                    {product && (
                      <Link href={`/${locale}/shop/${product.slug}`}>
                        {pick(locale, 'عرض المنتج', 'View product')} ↗
                      </Link>
                    )}
                  </div>
                  <form
                    action={submitCustomerReview}
                    className="account-review-form"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="order"
                      value={candidate.order_id}
                    />
                    <input
                      type="hidden"
                      name="product"
                      value={candidate.product_id}
                    />
                    <fieldset className="rating-selector">
                      <legend>
                        {pick(
                          locale,
                          'تقييمك من نجمة إلى خمس نجوم',
                          'Your rating, one to five stars',
                        )}
                      </legend>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <span key={rating}>
                            <input
                              aria-label={`${rating} / 5`}
                              defaultChecked={rating === 5}
                              id={`${formId}-${rating}`}
                              name="rating"
                              required
                              type="radio"
                              value={rating}
                            />
                            <label htmlFor={`${formId}-${rating}`}>
                              <span aria-hidden="true">★</span>
                              <span className="sr-only">{rating} / 5</span>
                            </label>
                          </span>
                        ))}
                      </div>
                    </fieldset>
                    <label className="field-label" htmlFor={`${formId}-body`}>
                      {pick(locale, 'التعليق', 'Review')}
                      <textarea
                        className="input"
                        id={`${formId}-body`}
                        maxLength={2000}
                        minLength={10}
                        name="body"
                        required
                        rows={4}
                      />
                      <small className="muted">
                        {pick(
                          locale,
                          'من 10 إلى 2000 حرف.',
                          '10 to 2,000 characters.',
                        )}
                      </small>
                    </label>
                    <button className="button button-primary" type="submit">
                      {pick(locale, 'إرسال للمراجعة', 'Submit for moderation')}
                    </button>
                  </form>
                </article>
              );
            },
          )}
        </div>
        {!candidates?.length && !candidatesError && (
          <div className="panel account-empty-state">
            <h4>
              {pick(
                locale,
                'لا توجد منتجات مؤهلة الآن',
                'No eligible products right now',
              )}
            </h4>
            <p className="muted">
              {pick(
                locale,
                'يمكنك تقييم منتجات طلباتك بعد تسليمها.',
                'You can review products after their orders are delivered.',
              )}
            </p>
          </div>
        )}
      </section>

      <section className="account-review-section">
        <div className="account-section-heading">
          <div>
            <span className="section-index">
              {pick(locale, 'سجل التقييمات', 'REVIEW HISTORY')}
            </span>
            <h3>{pick(locale, 'تقييماتي السابقة', 'Your previous reviews')}</h3>
          </div>
        </div>
        <div className="account-review-list">
          {(reviews || []).map((review) => {
            const product = productById.get(review.product_id);
            return (
              <article
                className="panel account-review-history-card"
                key={review.id}
              >
                <div className="account-review-history-heading">
                  <div>
                    <strong>
                      {product
                        ? pick(locale, product.name_ar, product.name_en)
                        : pick(locale, 'منتج من طلبك', 'Purchased product')}
                    </strong>
                    <time dateTime={review.created_at}>
                      {formatDate(review.created_at, locale)}
                    </time>
                  </div>
                  <div className="account-review-rating-status">
                    <span
                      className="review-rating-stars"
                      aria-label={`${review.rating} / 5`}
                    >
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                    <StatusBadge status={review.status} locale={locale} />
                  </div>
                </div>
                <p className="account-review-body">{review.body}</p>
                <span className="account-verified-review">
                  {pick(locale, 'شراء موثق', 'Verified purchase')}
                </span>
                <details className="account-review-edit">
                  <summary>
                    {pick(locale, 'تعديل التقييم', 'Edit review')}
                  </summary>
                  <form
                    action={updateOwnReview}
                    className="account-review-form"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={review.id} />
                    <fieldset className="rating-selector">
                      <legend>
                        {pick(
                          locale,
                          'تقييمك من نجمة إلى خمس نجوم',
                          'Your rating, one to five stars',
                        )}
                      </legend>
                      <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <span key={rating}>
                            <input
                              aria-label={`${rating} / 5`}
                              defaultChecked={rating === review.rating}
                              id={`${review.id}-${rating}`}
                              name="rating"
                              required
                              type="radio"
                              value={rating}
                            />
                            <label htmlFor={`${review.id}-${rating}`}>
                              <span aria-hidden="true">★</span>
                              <span className="sr-only">{rating} / 5</span>
                            </label>
                          </span>
                        ))}
                      </div>
                    </fieldset>
                    <label
                      className="field-label"
                      htmlFor={`${review.id}-body`}
                    >
                      {pick(locale, 'التعليق', 'Review')}
                      <textarea
                        className="input"
                        defaultValue={review.body}
                        id={`${review.id}-body`}
                        maxLength={2000}
                        minLength={10}
                        name="body"
                        required
                        rows={4}
                      />
                      <small className="muted">
                        {pick(
                          locale,
                          'من 10 إلى 2000 حرف.',
                          '10 to 2,000 characters.',
                        )}
                      </small>
                    </label>
                    <button className="button button-primary" type="submit">
                      {pick(
                        locale,
                        'حفظ وإعادة الإرسال للمراجعة',
                        'Save and resubmit for moderation',
                      )}
                    </button>
                  </form>
                </details>
                <ConfirmationForm
                  action={deleteOwnReview}
                  message={pick(
                    locale,
                    'هل تريد حذف هذا التقييم؟',
                    'Delete this review?',
                  )}
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={review.id} />
                  <button className="button button-danger-soft" type="submit">
                    {pick(locale, 'حذف التقييم', 'Delete review')}
                  </button>
                </ConfirmationForm>
              </article>
            );
          })}
        </div>
        {!reviews?.length && !error && (
          <div className="panel account-empty-state">
            <h4>
              {pick(
                locale,
                'لم ترسل أي تقييم بعد',
                'You have not submitted a review yet',
              )}
            </h4>
            <p className="muted">
              {pick(
                locale,
                'ستظهر تقييماتك وحالة مراجعتها هنا.',
                'Your reviews and moderation status will appear here.',
              )}
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
