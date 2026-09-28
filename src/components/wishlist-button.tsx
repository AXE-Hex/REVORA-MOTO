'use client';
import { useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toggleWishlist } from '@/app/actions';
import { pick, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
export function WishlistButton({
  id,
  kind,
  locale,
}: {
  id: string;
  kind: 'product' | 'motorcycle';
  locale: Locale;
}) {
  const { showToast } = useToast();
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await toggleWishlist(id, kind, locale);
            showToast(
              result.error
                ? { kind: 'error', message: result.error }
                : {
                    kind: 'success',
                    message: pick(
                      locale,
                      'تم تحديث قائمة الرغبات',
                      'Wishlist updated',
                    ),
                  },
            );
          })
        }
      >
        <Heart size={18} />
        {pick(locale, 'قائمة الرغبات', 'WISHLIST')}
      </Button>
    </>
  );
}
