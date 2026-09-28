'use client';

export function PrintInvoiceButton({ label }: { label: string }) {
  return (
    <button
      className="button button-accent print-hidden"
      type="button"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
