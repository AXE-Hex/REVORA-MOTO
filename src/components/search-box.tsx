'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pick, type Locale } from '@/lib/i18n';

type Suggestion = {
  kind: 'product' | 'motorcycle';
  slug: string;
  name_ar: string;
  name_en: string;
};
type Popular = { term: string; searches: number };

export function SearchBox({
  locale,
  action,
  initial = '',
}: {
  locale: Locale;
  action: string;
  initial?: string;
}) {
  const [q, setQ] = useState(initial);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [popular, setPopular] = useState<Popular[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem('revora-recent-searches') || '[]');
      if (Array.isArray(value))
        setRecent(value.filter((term): term is string => typeof term === 'string').slice(0, 5));
    } catch {
      setRecent([]);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q.trim())}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = await response.json();
        setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
        setPopular(Array.isArray(result.popular) ? result.popular : []);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setPopular([]);
        }
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);
  return (
    <div>
      <form
        className="search-form"
        action={action}
        onSubmit={() => {
          const term = q.trim().slice(0, 80);
          if (term.length < 2) return;
          try {
            const next = [term, ...recent.filter((item) => item !== term)].slice(0, 5);
            localStorage.setItem('revora-recent-searches', JSON.stringify(next));
          } catch { /* Browsers may disable local storage. */ }
        }}
      >
        <input
          className="input"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          maxLength={80}
          aria-label={pick(locale, 'بحث', 'Search')}
          autoComplete="off"
          placeholder={pick(locale, 'دراجة أو منتج أو رقم قطعة', 'Motorcycle, product or SKU')}
        />
        <button className="button button-accent" type="submit">
          {pick(locale, 'بحث', 'SEARCH')}
        </button>
      </form>
      {suggestions.length > 0 && (
        <nav className="panel" aria-label={pick(locale, 'اقتراحات البحث', 'Search suggestions')}>
          {suggestions.map((item) => (
            <p key={`${item.kind}-${item.slug}`}>
              <Link href={`/${locale}/${item.kind === 'product' ? 'shop' : 'motorcycles'}/${item.slug}`}>
                {pick(locale, item.name_ar, item.name_en)} ↗
              </Link>
            </p>
          ))}
        </nav>
      )}
      {!q.trim() && (recent.length > 0 || popular.length > 0) && (
        <div className="toolbar">
          {recent.length > 0 && <span>{pick(locale, 'بحثت مؤخرًا', 'Recent searches')}:</span>}
          {recent.map((term) => (
            <Link key={`recent-${term}`} className="chip" href={`${action}?q=${encodeURIComponent(term)}`}>
              {term}
            </Link>
          ))}
          {popular.length > 0 && <span>{pick(locale, 'الأكثر بحثًا', 'Popular searches')}:</span>}
          {popular.map((entry) => (
            <Link key={`popular-${entry.term}`} className="chip" href={`${action}?q=${encodeURIComponent(entry.term)}`}>
              {entry.term}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
