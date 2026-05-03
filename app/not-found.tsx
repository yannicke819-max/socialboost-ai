import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getDict } from '@/lib/i18n';

export default function NotFound() {
  const t = getDict().notFound;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-7xl font-bold tracking-tight text-brand-500 sm:text-8xl">{t.title}</p>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 sm:text-xl">{t.subtitle}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        <ArrowLeft size={16} /> {t.cta}
      </Link>
    </main>
  );
}
