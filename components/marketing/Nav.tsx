import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LangSwitcher } from '@/components/LangSwitcher';
import { getDict, getLocale } from '@/lib/i18n';

export function MarketingNav() {
  const locale = getLocale();
  const t = getDict(locale).nav;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Logo />
        <div className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link href="/#how" className="hover:text-brand-500">
            {t.how}
          </Link>
          <Link href="/#features" className="hover:text-brand-500">
            {t.features}
          </Link>
          <Link href="/pricing" className="hover:text-brand-500">
            {t.pricing}
          </Link>
          <Link href="/#faq" className="hover:text-brand-500">
            {t.faq}
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitcher current={locale} label={t.languageLabel} />
          <Link href="/login" className="hidden text-sm font-medium hover:text-brand-500 sm:block">
            {t.login}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 sm:px-4"
          >
            {t.signup}
          </Link>
        </div>
      </nav>
    </header>
  );
}
