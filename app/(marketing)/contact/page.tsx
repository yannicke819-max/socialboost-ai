import { Mail } from 'lucide-react';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'Contact — SocialBoost AI' };

export default function ContactPage() {
  const t = getDict().contact;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600 sm:text-sm">
        {t.eyebrow}
      </p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{t.title}</h1>
      <p className="mt-4 text-base text-gray-600 dark:text-gray-300 sm:text-lg">{t.subtitle}</p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <form className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <Field label={t.name}>
            <input
              type="text"
              name="name"
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </Field>
          <Field label={t.email}>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </Field>
          <Field label={t.message}>
            <textarea
              name="message"
              required
              rows={5}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </Field>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 sm:w-auto"
          >
            {t.submit}
          </button>
        </form>

        <aside>
          <p className="text-sm font-semibold">{t.or}</p>
          <ul className="mt-4 space-y-3">
            {t.addresses.map((a) => (
              <li key={a.email} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <Mail size={18} className="mt-0.5 shrink-0 text-brand-500" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.label}</p>
                  <a href={`mailto:${a.email}`} className="break-all text-sm text-brand-600 hover:underline">
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
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
