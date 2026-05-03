import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LangSwitcher } from '@/components/LangSwitcher';
import { Button } from '@/components/ui/Button';
import { getDict, getLocale } from '@/lib/i18n';

export function MarketingNav() {
  const locale = getLocale();
  const t = getDict(locale).nav;

  const links = [
    { href: '/#how', label: t.how },
    { href: '/#features', label: t.features },
    { href: '/pricing', label: t.pricing },
    { href: '/#faq', label: t.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Logo />

        <div className="hidden items-center gap-7 text-sm text-fg-muted md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative transition-colors hover:text-fg after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-fg after:transition-all hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitcher current={locale} label={t.languageLabel} />
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <Link
            href="/login"
            className="hidden text-sm text-fg-muted transition-colors hover:text-fg sm:block"
          >
            {t.login}
          </Link>
          <Button href="/signup" variant="brand" size="sm">
            {t.signup}
          </Button>
        </div>
      </nav>
    </header>
  );
}
