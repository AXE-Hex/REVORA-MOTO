import { pick, type Locale } from '@/lib/i18n';

/** Never pass database, storage, or provider error details to a customer. */
export function operationFailed(locale: Locale) {
  return pick(
    locale,
    'تعذر إكمال العملية. حاول مرة أخرى، وإذا استمرت المشكلة فتواصل مع الدعم.',
    'We could not complete that action. Please try again or contact support.',
  );
}
