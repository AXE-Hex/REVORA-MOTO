'use client';

export function ConfirmSubmitButton({
  label,
  message,
  className = 'button button-ghost',
}: {
  label: string;
  message: string;
  className?: string;
}) {
  return (
    <button
      className={className}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
