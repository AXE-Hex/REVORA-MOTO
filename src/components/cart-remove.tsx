'use client';
import { useTransition } from 'react';
import { removeFromCart } from '@/app/actions';
import type { Locale } from '@/lib/i18n';
import { pick } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast-provider';
export function CartRemove({ id, locale }: { id: string; locale: Locale }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();
  return (
    <Button
      variant="danger-soft"
      type="button"
      disabled={pending}
      aria-label={pick(
        locale,
        'إزالة المنتج من السلة',
        'Remove item from cart',
      )}
      onClick={() =>
        start(async () => {
          const result = await removeFromCart(id, locale);
          if (result.error) {
            showToast({ kind: 'error', message: result.error });
            return;
          }
          showToast({
            kind: 'success',
            message: pick(
              locale,
              'تمت إزالة المنتج من السلة.',
              'Item removed from cart.',
            ),
          });
          router.refresh();
        })
      }
    >
      <X size={18} aria-hidden="true" />
    </Button>
  );
}
