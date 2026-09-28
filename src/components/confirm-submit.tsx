'use client';

import { useFormStatus } from 'react-dom';

export function ConfirmSubmit({
  label,
  confirmation,
}: {
  label: string;
  confirmation: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-ghost"
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
