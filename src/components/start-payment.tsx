'use client';
import { useState, useTransition } from 'react';
import { pick, type Locale } from '@/lib/i18n';
export function StartPayment({ id, locale }: { id: string; locale: Locale }) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return (
    <>
      <button
        className="button button-accent"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const response = await fetch(
                `/api/payments/${id}/start?locale=${locale}`,
                {
                  method: 'POST',
                },
              );
              const result = await response.json();
              if (!response.ok)
                throw new Error(result.error || 'Payment initiation failed');
              if (result.checkoutUrl) {
                location.assign(result.checkoutUrl);
                return;
              }
              setMessage(
                pick(
                  locale,
                  'الدفع في انتظار مزود خدمة معتمد. لم يتم خصم أي مبلغ.',
                  'Payment is awaiting an approved provider. No charge was made.',
                ),
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Payment initiation failed',
              );
            }
          })
        }
      >
        {pending ? '...' : pick(locale, 'ابدأ الدفع', 'START PAYMENT')}
      </button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}
