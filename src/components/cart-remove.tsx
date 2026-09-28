'use client';
import { useTransition } from 'react';
import { removeFromCart } from '@/app/actions';
import type { Locale } from '@/lib/i18n';
export function CartRemove({ id, locale }: { id: string; locale: Locale }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      aria-label="Remove item"
      onClick={() =>
        start(async () => {
          await removeFromCart(id, locale);
        })
      }
      style={{ background: 'none', border: 0, color: 'var(--red)' }}
    >
      ✕
    </button>
  );
}
