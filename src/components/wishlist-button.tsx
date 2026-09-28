'use client';
import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toggleWishlist } from '@/app/actions';
import { pick, type Locale } from '@/lib/i18n';
export function WishlistButton({
  id,
  kind,
  locale,
}: {
  id: string;
  kind: 'product' | 'motorcycle';
  locale: Locale;
}) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return (
    <>
      <button
        className="button button-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await toggleWishlist(id, kind, locale);
            setMessage(
              result.error ||
                pick(locale, 'تم تحديث قائمة الرغبات', 'Wishlist updated'),
            );
          })
        }
      >
        <Heart size={18} />
        {pick(locale, 'قائمة الرغبات', 'WISHLIST')}
      </button>
      {message && (
        <span role="status" className="notice">
          {message}
        </span>
      )}
    </>
  );
}
