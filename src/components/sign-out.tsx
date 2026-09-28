'use client';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase/browser';
import { pick, type Locale } from '@/lib/i18n';
export function SignOut({ locale }: { locale: Locale }) {
  const router = useRouter();
  return (
    <button
      className="button button-ghost"
      onClick={async () => {
        await browserSupabase()?.auth.signOut();
        router.push(`/${locale}`);
        router.refresh();
      }}
    >
      {pick(locale, 'تسجيل الخروج', 'SIGN OUT')}
    </button>
  );
}
