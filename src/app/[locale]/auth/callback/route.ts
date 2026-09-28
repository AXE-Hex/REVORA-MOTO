import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { isLocale } from '@/lib/i18n';
import { safeAuthNext } from '@/lib/auth-redirect';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale))
    return NextResponse.redirect(new URL('/ar/auth', request.url));
  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const otpType = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next') || `/${locale}/account`;
  const safeNext = safeAuthNext(locale, next);
  const db = await supabase();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }
  if (
    tokenHash &&
    db &&
    (otpType === 'signup' ||
      otpType === 'recovery' ||
      otpType === 'email' ||
      otpType === 'invite')
  ) {
    const { error } = await db.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }
  return NextResponse.redirect(
    new URL(`/${locale}/auth?error=callback`, request.url),
  );
}
