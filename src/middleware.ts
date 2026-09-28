import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './lib/i18n';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === '/') return NextResponse.redirect(new URL('/ar', request.url));
  if (
    !locales.some(
      (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`),
    )
  )
    return NextResponse.next();
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-revora-pathname', path);
  let response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && !url.includes('your-project')) {
    const db = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          values: { name: string; value: string; options: CookieOptions }[],
        ) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: forwardedHeaders },
          });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    await db.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)',
  ],
};
