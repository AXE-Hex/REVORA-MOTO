import type { Locale } from './i18n';

export function safeAuthNext(
  locale: Locale,
  candidate: string | null | undefined,
) {
  const fallback = `/${locale}/account`;
  if (
    !candidate ||
    candidate.includes('\\') ||
    /[\u0000-\u001f]/.test(candidate)
  )
    return fallback;
  try {
    const url = new URL(candidate, 'https://revora.invalid');
    if (url.origin !== 'https://revora.invalid') return fallback;
    if (
      url.pathname !== `/${locale}` &&
      !url.pathname.startsWith(`/${locale}/`)
    )
      return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
