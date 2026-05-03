import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'Log in — SocialBoost AI' };

export default function LoginPage() {
  const t = getDict().auth.login;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-bg-elevated p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t.subtitle}</p>

        <form className="mt-6 space-y-4">
          <Field label={t.email}>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>
          <Field label={t.password}>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>
          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-fg-muted transition-colors hover:text-fg"
            >
              {t.forgot}
            </Link>
          </div>
          <Button type="submit" variant="brand" className="w-full">
            {t.submit}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.orContinue}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full">
          {t.google}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {t.noAccount}{' '}
        <Link href="/signup" className="font-semibold text-fg transition-colors hover:text-brand">
          {t.signupLink}
        </Link>
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-fg">{label}</span>
      {children}
    </label>
  );
}
