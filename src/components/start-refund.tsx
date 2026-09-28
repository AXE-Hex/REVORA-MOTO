'use client';

import { useState, useTransition } from 'react';
import { pick, type Locale } from '@/lib/i18n';

export function StartRefund({ id, locale }: { id: string; locale: Locale }) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        className="button button-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const response = await fetch(`/api/refunds/${id}/start`, {
                method: 'POST',
              });
              const result = await response.json();
              if (!response.ok)
                throw new Error(result.error || 'Refund initiation failed');
              setMessage(
                pick(
                  locale,
                  'أُرسل طلب الاسترداد للمزود. ينتظر تأكيده.',
                  'Refund submitted to provider. Awaiting confirmation.',
                ),
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Refund initiation failed',
              );
            }
          })
        }
      >
        {pending ? '…' : pick(locale, 'تنفيذ الاسترداد', 'Start refund')}
      </button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </div>
  );
}
