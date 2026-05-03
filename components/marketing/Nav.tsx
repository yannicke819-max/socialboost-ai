import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link href="/#how" className="hover:text-brand-500">Comment ça marche</Link>
          <Link href="/#features" className="hover:text-brand-500">Fonctionnalités</Link>
          <Link href="/pricing" className="hover:text-brand-500">Tarifs</Link>
          <Link href="/#faq" className="hover:text-brand-500">FAQ</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium hover:text-brand-500 sm:block">
            Connexion
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Essayer gratuitement
          </Link>
        </div>
      </nav>
    </header>
  );
}
