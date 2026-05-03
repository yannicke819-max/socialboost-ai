import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'About — SocialBoost AI' };

export default function AboutPage() {
  const t = getDict().about;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600 sm:text-sm">
        {t.eyebrow}
      </p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{t.title}</h1>
      <p className="mt-5 text-base text-gray-600 dark:text-gray-300 sm:text-lg">{t.subtitle}</p>

      <div className="mt-12 space-y-10">
        {t.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-bold sm:text-2xl">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
              {s.p}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-gray-100 pt-8 dark:border-gray-800">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          {getDict().hero.primaryCta} <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
