import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'Contact — SocialBoost AI' };

export default function ContactPage() {
  const t = getDict().contact;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <Badge variant="mono" className="mb-4">
        {t.eyebrow}
      </Badge>
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl md:text-5xl">
        {t.title}
      </h1>
      <p className="mt-4 text-base text-fg-muted sm:text-lg">{t.subtitle}</p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <form className="space-y-4 rounded-2xl border border-border bg-bg-elevated p-6">
          <Field label={t.name}>
            <input
              type="text"
              name="name"
              required
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>
          <Field label={t.email}>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>
          <Field label={t.message}>
            <textarea
              name="message"
              required
              rows={5}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>
          <Button type="submit" variant="brand" className="w-full sm:w-auto">
            {t.submit}
          </Button>
        </form>

        <aside>
          <p className="text-sm font-semibold text-fg">{t.or}</p>
          <ul className="mt-4 space-y-3">
            {t.addresses.map((a) => (
              <li
                key={a.email}
                className="flex items-start gap-3 rounded-lg border border-border bg-bg-elevated p-3"
              >
                <Mail size={18} className="mt-0.5 shrink-0 text-amber" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{a.label}</p>
                  <a
                    href={`mailto:${a.email}`}
                    className="break-all font-mono text-xs text-fg-muted hover:text-fg"
                  >
                    {a.email}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
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
