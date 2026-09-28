'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { pick, type Locale } from '@/lib/i18n';

export function EditorSectionNav({
  locale,
  items,
}: {
  locale: Locale;
  items: { id: string; label: string; href?: string }[];
}) {
  return (
    <nav
      className="admin-editor-tabs"
      aria-label={pick(locale, 'أقسام المحرر', 'Editor sections')}
    >
      {items.map((item) =>
        item.href ? (
          <Link className="admin-editor-tab" href={item.href} key={item.id}>
            {item.label}
          </Link>
        ) : (
          <a className="admin-editor-tab" href={`#${item.id}`} key={item.id}>
            {item.label}
          </a>
        ),
      )}
    </nav>
  );
}

export function DirtyActionBar({
  locale,
  saveLabel,
}: {
  locale: Locale;
  saveLabel: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const form = root.current?.closest('form');
    if (!(form instanceof HTMLFormElement)) return;
    const snapshot = () =>
      JSON.stringify(
        [...new FormData(form).entries()].map(([key, value]) => [
          key,
          value instanceof File ? value.name : value,
        ]),
      );
    const initial = snapshot();
    const update = () => setDirty(snapshot() !== initial);
    const reset = () => window.setTimeout(() => setDirty(false), 0);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const confirmNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank')
        return;
      const destination = new URL(link.href, window.location.href);
      if (destination.href === window.location.href) return;
      if (
        !window.confirm(
          pick(
            locale,
            'لديك تغييرات غير محفوظة. هل تريد المغادرة؟',
            'You have unsaved changes. Leave this page?',
          ),
        )
      )
        event.preventDefault();
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('reset', reset);
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', confirmNavigation, true);
    return () => {
      form.removeEventListener('input', update);
      form.removeEventListener('change', update);
      form.removeEventListener('reset', reset);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', confirmNavigation, true);
    };
  }, [dirty, locale]);

  function discard() {
    const form = root.current?.closest('form');
    if (form instanceof HTMLFormElement) form.reset();
    setDirty(false);
  }

  return (
    <div className="admin-editor-actionbar" ref={root}>
      <span aria-live="polite">
        {dirty
          ? pick(locale, 'تغييرات غير محفوظة', 'Unsaved changes')
          : pick(locale, 'كل التغييرات محفوظة', 'No unsaved changes')}
      </span>
      <div>
        <button
          className="button button-secondary"
          type="reset"
          onClick={discard}
          disabled={!dirty}
        >
          {pick(locale, 'تراجع', 'Discard')}
        </button>
        <button
          className="button button-primary"
          type="submit"
          disabled={!dirty}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
