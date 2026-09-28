'use client';

import type { FormEvent, ReactNode } from 'react';

export function ConfirmationForm({
  action,
  message,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
}) {
  function confirm(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(message)) event.preventDefault();
  }
  return (
    <form action={action} onSubmit={confirm}>
      {children}
    </form>
  );
}
