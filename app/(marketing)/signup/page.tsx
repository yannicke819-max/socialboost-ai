import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'Sign up — SocialBoost AI' };

export default function SignupPage() {
  const t = getDict().auth.signup;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t.subtitle}</p>

        <form className="mt-6 space-y-4">
          <Field label={t.email}>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </Field>
          <Field label={t.password} hint={t.passwordHint}>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </Field>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            {t.submit}
          </button>
          <p className="text-xs text-gray-500">
            {t.termsBefore}
            <Link href="/legal/terms" className="font-medium text-brand-600 hover:underline">
              {t.termsLink}
            </Link>
            {t.termsAnd}
            <Link href="/legal/privacy" className="font-medium text-brand-600 hover:underline">
              {t.privacyLink}
            </Link>
            {t.termsAfter}
          </p>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs uppercase tracking-wider text-gray-400">{t.orContinue}</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <button
          type="button"
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-700"
        >
          {t.google}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
        {t.alreadyAccount}{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          {t.loginLink}
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
