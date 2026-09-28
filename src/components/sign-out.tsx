'use client';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase/browser';
import { pick, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
export function SignOut({ locale }: { locale: Locale }) {
  const router = useRouter();
  return (
    <Button
      variant="danger-soft"
      onClick={async () => {
        await browserSupabase()?.auth.signOut();
        router.push(`/${locale}`);
        router.refresh();
      }}
    >
      {pick(locale, 'تسجيل الخروج', 'SIGN OUT')}
    </Button>
  );
}
