'use client';
import { createBrowserClient } from '@supabase/ssr';
export function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    !url ||
    !key ||
    url.includes('your-project') ||
    key.includes('replace-with')
  )
    return null;
  return createBrowserClient(url, key);
}
