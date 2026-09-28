import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'danger-soft'
  | 'success'
  | 'warning'
  | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'icon' ? 'button-icon button-secondary' : `button-${variant}`;
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      className={`button ${variantClass} ${loading ? 'button-loading' : ''} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <span className="button-spinner" aria-hidden="true" />
          <span>{loadingLabel || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
