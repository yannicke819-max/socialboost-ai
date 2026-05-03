import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <section className="space-y-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-600">
          SocialBoost AI
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Publie moins, gagne plus.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          L&apos;IA qui idée, rédige, planifie et publie ton contenu sur Instagram, TikTok,
          LinkedIn, X et Facebook. Tu gardes le contrôle, l&apos;IA fait le reste.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
          >
            Essayer gratuitement
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold transition hover:border-brand-500 hover:text-brand-600"
          >
            Voir les tarifs
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          7 jours gratuits • Sans carte bleue • Annulation en 1 clic
        </p>
      </section>
    </main>
  );
}
