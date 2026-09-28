'use client';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/browser';
import { pick, type Locale } from '@/lib/i18n';
export function ResetForm({ locale }: { locale: Locale }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="auth-card">
      <h1>{pick(locale, 'كلمة مرور جديدة', 'NEW PASSWORD')}</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const db = browserSupabase();
          if (!db) return setMessage('Supabase is not configured');
          const { error } = await db.auth.updateUser({ password });
          setMessage(
            error?.message ||
              pick(locale, 'تم تحديث كلمة المرور', 'Password updated'),
          );
        }}
      >
        <label className="field-label">
          {pick(locale, 'كلمة المرور', 'PASSWORD')}
          <input
            className="input"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="button button-accent">
          {pick(locale, 'تحديث', 'UPDATE')}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
