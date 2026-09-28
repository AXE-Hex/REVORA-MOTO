import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    !url ||
    !key ||
    url.includes('your-project') ||
    key.includes('replace-with')
  )
    return null;
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(
        values: { name: string; value: string; options: CookieOptions }[],
      ) {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Components cannot set cookies. Middleware refreshes sessions. */
        }
      },
    },
  });
}

export async function currentUser() {
  const db = await supabase();
  if (!db) return null;
  const {
    data: { user },
  } = await db.auth.getUser();
  return user;
}
