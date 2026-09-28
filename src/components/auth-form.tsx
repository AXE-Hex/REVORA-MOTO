'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase/browser';
import { pick, type Locale } from '@/lib/i18n';
import { safeAuthNext } from '@/lib/auth-redirect';
type Mode = 'signin' | 'signup' | 'forgot';
export function AuthForm({ locale, next }: { locale: Locale; next: string }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const safeNext = safeAuthNext(locale, next);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const db = browserSupabase();
    if (!db) {
      setMessage('Supabase is not configured');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'forgot') {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/auth/reset`)}`,
        });
        if (error) throw error;
        setMessage(
          pick(locale, 'تحقق من بريدك الإلكتروني', 'Check your email'),
        );
      } else if (mode === 'signup') {
        const { error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${location.origin}/${locale}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          },
        });
        if (error) throw error;
        setMessage(
          pick(
            locale,
            'تحقق من بريدك الإلكتروني لتأكيد الحساب',
            'Check your email to confirm your account',
          ),
        );
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(safeNext);
        router.refresh();
      }
    } catch {
      setMessage(
        pick(
          locale,
          'تعذر إكمال تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.',
          'We could not complete sign in. Check your details and try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }
  async function google() {
    const db = browserSupabase();
    if (!db) {
      setMessage('Supabase is not configured');
      return;
    }
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/${locale}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
    if (error)
      setMessage(
        pick(
          locale,
          'تعذر بدء تسجيل الدخول عبر Google. حاول مرة أخرى.',
          'Could not start Google sign in. Please try again.',
        ),
      );
  }
  return (
    <div className="auth-card">
      <span className="section-index">REVORA MOTO / ACCOUNT</span>
      <h1>
        {mode === 'signin'
          ? pick(locale, 'أهلاً بعودتك', 'WELCOME BACK')
          : mode === 'signup'
            ? pick(locale, 'أنشئ حسابك', 'JOIN THE RIDE')
            : pick(locale, 'استعادة كلمة المرور', 'RESET PASSWORD')}
      </h1>
      <form onSubmit={submit}>
        {mode === 'signup' && (
          <label className="field-label">
            {pick(locale, 'الاسم الكامل', 'FULL NAME')}
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
        )}
        <label className="field-label">
          {pick(locale, 'البريد الإلكتروني', 'EMAIL')}
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {mode !== 'forgot' && (
          <label className="field-label">
            {pick(locale, 'كلمة المرور', 'PASSWORD')}
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={
                mode === 'signup' ? 'new-password' : 'current-password'
              }
            />
          </label>
        )}
        <button className="button button-accent" disabled={loading}>
          {loading
            ? '...'
            : mode === 'signin'
              ? pick(locale, 'تسجيل الدخول', 'SIGN IN')
              : mode === 'signup'
                ? pick(locale, 'إنشاء الحساب', 'CREATE ACCOUNT')
                : pick(locale, 'إرسال رابط الاستعادة', 'SEND RESET LINK')}
        </button>
      </form>
      {mode !== 'forgot' && (
        <button
          className="button button-ghost"
          style={{ width: '100%', marginTop: 14 }}
          onClick={google}
        >
          GOOGLE
        </button>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <p>
        <button
          className="text-link"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setMessage('');
          }}
        >
          {mode === 'signup'
            ? pick(
                locale,
                'لديك حساب؟ سجّل دخولك',
                'Already have an account? Sign in',
              )
            : pick(
                locale,
                'ليس لديك حساب؟ أنشئ حساباً',
                'New here? Create account',
              )}
        </button>
      </p>
      <p>
        <button
          className="text-link"
          onClick={() => {
            setMode('forgot');
            setMessage('');
          }}
        >
          {pick(locale, 'نسيت كلمة المرور؟', 'Forgot password?')}
        </button>
      </p>
    </div>
  );
}
