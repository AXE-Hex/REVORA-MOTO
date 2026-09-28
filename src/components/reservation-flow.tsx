'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { reserve } from '@/app/actions';
import { money, pick, type Locale } from '@/lib/i18n';

export type ReservationBike = {
  id: string;
  slug: string;
  name: string;
  year: number;
  condition: string;
  deposit: number;
  image: string | null;
};
export type ReservationBranch = {
  id: string;
  name: string;
  address: string | null;
};

export function ReservationFlow({
  locale,
  bike,
  branches,
  fullName,
  email,
  phone,
}: {
  locale: Locale;
  bike: ReservationBike;
  branches: ReservationBranch[];
  fullName: string;
  email: string;
  phone: string;
}) {
  const labels = [
    pick(locale, 'الدراجة', 'Motorcycle'),
    pick(locale, 'الفرع', 'Branch'),
    pick(locale, 'بيانات العميل', 'Customer information'),
    pick(locale, 'العربون والدفع', 'Deposit / payment'),
    pick(locale, 'مراجعة الحجز', 'Review'),
    pick(locale, 'التأكيد', 'Confirmation'),
  ];
  const [step, setStep] = useState(0);
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [stepError, setStepError] = useState(false);
  const branch = branches.find((item) => item.id === branchId);
  const ForwardIcon = locale === 'ar' ? ArrowLeft : ArrowRight;
  const proceed = () => {
    if (step === 1 && !branchId) {
      setStepError(true);
      return;
    }
    setStepError(false);
    setStep((current) => Math.min(4, current + 1));
  };
  const previous = () => {
    setStepError(false);
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <div className="reservation-flow">
      <nav
        className="reservation-stepper"
        aria-label={pick(locale, 'خطوات الحجز', 'Reservation steps')}
      >
        {labels.map((label, index) => (
          <div
            className={`reservation-step ${index === step ? 'is-current' : ''} ${index < step ? 'is-complete' : ''}`}
            key={label}
            aria-current={index === step ? 'step' : undefined}
          >
            <span>
              {index < step ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <b>{label}</b>
          </div>
        ))}
      </nav>
      <div className="reservation-content">
        <section className="panel reservation-stage" aria-live="polite">
          <span className="section-index">
            {pick(locale, `الخطوة ${step + 1} من 6`, `STEP ${step + 1} OF 6`)}
          </span>
          <h2>{labels[step]}</h2>
          {step === 0 && (
            <article className="reservation-bike-choice">
              {bike.image ? (
                <Image
                  src={bike.image}
                  alt={bike.name}
                  width={120}
                  height={96}
                  unoptimized
                />
              ) : (
                <span aria-hidden="true">R/</span>
              )}
              <div>
                <strong>{bike.name}</strong>
                <p>
                  {bike.year} ·{' '}
                  {bike.condition === 'used'
                    ? pick(locale, 'مستعملة', 'Pre-owned')
                    : pick(locale, 'جديدة', 'New')}
                </p>
                <b>{money(bike.deposit, locale)}</b>
              </div>
              <Link href={`/${locale}/motorcycles/${bike.slug}`}>
                {pick(locale, 'عرض التفاصيل', 'View details')}
              </Link>
            </article>
          )}
          {step === 1 && (
            <div className="reservation-branch-options">
              {branches.length ? (
                branches.map((item) => (
                  <label
                    className={`checkout-choice-card ${branchId === item.id ? 'is-selected' : ''}`}
                    key={item.id}
                  >
                    <input
                      type="radio"
                      name="reservation-branch"
                      value={item.id}
                      checked={branchId === item.id}
                      onChange={() => {
                        setBranchId(item.id);
                        setStepError(false);
                      }}
                    />
                    <span>
                      <strong>{item.name}</strong>
                      {item.address && <small>{item.address}</small>}
                    </span>
                  </label>
                ))
              ) : (
                <p className="notice error" role="alert">
                  {pick(
                    locale,
                    'لا توجد فروع متاحة للحجز حالياً.',
                    'No active branches are available for reservations.',
                  )}
                </p>
              )}
              {stepError && (
                <p className="notice error" role="alert">
                  {pick(
                    locale,
                    'اختر الفرع للمتابعة.',
                    'Choose a branch to continue.',
                  )}
                </p>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="reservation-contact-card">
              <p>
                {pick(
                  locale,
                  'سيستخدم فريق المبيعات بيانات ملفك الشخصي المسجلة حالياً.',
                  'The sales team will use the contact details currently saved to your account.',
                )}
              </p>
              <dl>
                <div>
                  <dt>{pick(locale, 'الاسم', 'Name')}</dt>
                  <dd>{fullName || email}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'البريد الإلكتروني', 'Email')}</dt>
                  <dd dir="ltr">{email}</dd>
                </div>
                <div>
                  <dt>{pick(locale, 'الهاتف', 'Phone')}</dt>
                  <dd dir="ltr">
                    {phone || pick(locale, 'غير مضاف', 'Not provided')}
                  </dd>
                </div>
              </dl>
              <Link
                className="button button-secondary"
                href={`/${locale}/account/profile`}
              >
                {pick(locale, 'تحديث بيانات التواصل', 'Update contact details')}
              </Link>
            </div>
          )}
          {step === 3 && (
            <div className="reservation-deposit-card">
              <span>{pick(locale, 'العربون المطلوب', 'Deposit due')}</span>
              <strong>{money(bike.deposit, locale)}</strong>
              <p>
                {pick(
                  locale,
                  'سيُنشأ طلب دفع بالبطاقة بحالة انتظار التحقق. لم يتم اختيار مزود دفع أو تفعيل تحصيل مباشر.',
                  'A card payment request will be created as pending verification. No payment provider is selected or live collection enabled.',
                )}
              </p>
              <div className="reservation-payment-state">
                <span aria-hidden="true">◷</span>
                {pick(
                  locale,
                  'الدفع: بانتظار التحقق من مزود معتمد',
                  'Payment: awaiting verified provider confirmation',
                )}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="reservation-review-card">
              <div>
                <span>{pick(locale, 'الدراجة', 'Motorcycle')}</span>
                <strong>
                  {bike.name} · {bike.year}
                </strong>
              </div>
              <div>
                <span>{pick(locale, 'الحالة', 'Condition')}</span>
                <strong>
                  {bike.condition === 'used'
                    ? pick(locale, 'مستعملة', 'Pre-owned')
                    : pick(locale, 'جديدة', 'New')}
                </strong>
              </div>
              <div>
                <span>{pick(locale, 'الفرع', 'Branch')}</span>
                <strong>{branch?.name || '—'}</strong>
              </div>
              <div>
                <span>{pick(locale, 'العميل', 'Customer')}</span>
                <strong>{fullName || email}</strong>
              </div>
              <div>
                <span>{pick(locale, 'العربون', 'Deposit')}</span>
                <strong>{money(bike.deposit, locale)}</strong>
              </div>
              <p className="notice">
                {pick(
                  locale,
                  'سيُسجل الحجز بحالة انتظار الدفع، وسيبقى مؤكداً فقط بعد وصول حدث دفع موثوق.',
                  'The reservation will be recorded awaiting payment and will only be paid after a verified payment event.',
                )}
              </p>
              <form action={reserve} className="reservation-submit-desktop">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="motorcycle" value={bike.id} />
                <input type="hidden" name="branch" value={branchId} />
                <button className="button button-primary" type="submit">
                  {pick(locale, 'تأكيد الحجز', 'Confirm reservation')}
                </button>
              </form>
            </div>
          )}
          <div className="reservation-stage-actions">
            {step > 0 && (
              <button
                className="button button-ghost"
                type="button"
                onClick={previous}
              >
                {pick(locale, 'رجوع', 'Back')}
              </button>
            )}
            {step < 4 && (
              <button
                className="button button-primary"
                type="button"
                onClick={proceed}
                disabled={
                  (step === 1 && !branches.length) || (step === 2 && !email)
                }
              >
                {pick(locale, 'متابعة', 'Continue')}{' '}
                <ForwardIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
        <aside className="reservation-summary panel">
          <span className="section-index">
            {pick(locale, 'ملخص الحجز', 'RESERVATION SUMMARY')}
          </span>
          {bike.image ? (
            <Image
              src={bike.image}
              alt=""
              width={600}
              height={400}
              unoptimized
            />
          ) : null}
          <h2>{bike.name}</h2>
          <p>
            {bike.year} ·{' '}
            {bike.condition === 'used'
              ? pick(locale, 'مستعملة', 'Pre-owned')
              : pick(locale, 'جديدة', 'New')}
          </p>
          {branch && (
            <p>
              {pick(locale, 'الفرع', 'Branch')}: {branch.name}
            </p>
          )}
          <div className="spec-row">
            <span>{pick(locale, 'العربون', 'Deposit')}</span>
            <strong>{money(bike.deposit, locale)}</strong>
          </div>
          <p>
            {pick(
              locale,
              'الحجز سيبقى بانتظار التحقق من الدفع.',
              'Reservation stays pending until payment is verified.',
            )}
          </p>
        </aside>
      </div>
      <div className="reservation-mobile-cta">
        {step === 4 ? (
          <form action={reserve}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="motorcycle" value={bike.id} />
            <input type="hidden" name="branch" value={branchId} />
            <button className="button button-primary" type="submit">
              {pick(locale, 'تأكيد الحجز', 'Confirm reservation')}
            </button>
          </form>
        ) : (
          <button
            className="button button-primary"
            type="button"
            onClick={proceed}
            disabled={
              (step === 1 && !branches.length) || (step === 2 && !email)
            }
          >
            {pick(locale, 'متابعة', 'Continue')}{' '}
            <ForwardIcon size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
