'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';
type ToastInput = { kind: ToastKind; message: string };
type ToastEntry = ToastInput & { id: number };
type ToastContextValue = { showToast: (toast: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-region"
        aria-label={locale === 'ar' ? 'التنبيهات' : 'Notifications'}
      >
        {toasts.map((toast) => (
          <div
            className="toast"
            data-kind={toast.kind}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
            key={toast.id}
          >
            <span>{toast.message}</span>
            <button
              className="button button-icon button-ghost"
              type="button"
              aria-label={
                locale === 'ar' ? 'إغلاق التنبيه' : 'Dismiss notification'
              }
              onClick={() =>
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id),
                )
              }
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
