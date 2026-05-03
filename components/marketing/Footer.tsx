import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LangSwitcher } from '@/components/LangSwitcher';
import { getDict, getLocale } from '@/lib/i18n';

export function MarketingFooter() {
  const locale = getLocale();
  const dict = getDict(locale);
  const t = dict.footer;

  return (
    <footer className="border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-gray-500">{t.tagline}</p>
          <div className="mt-4">
            <LangSwitcher current={locale} label={dict.nav.languageLabel} />
          </div>
        </div>
        <FooterCol title={t.productCol}>
          <FooterLink href="/#features">{t.features}</FooterLink>
          <FooterLink href="/pricing">{t.pricing}</FooterLink>
          <FooterLink href="/#how">{t.how}</FooterLink>
          <FooterLink href="/#faq">{t.faq}</FooterLink>
        </FooterCol>
        <FooterCol title={t.companyCol}>
          <FooterLink href="/about">{t.about}</FooterLink>
          <FooterLink href="/contact">{t.contact}</FooterLink>
          <FooterLink href="/blog">{t.blog}</FooterLink>
        </FooterCol>
        <FooterCol title={t.legalCol}>
          <FooterLink href="/legal/terms">{t.terms}</FooterLink>
          <FooterLink href="/legal/privacy">{t.privacy}</FooterLink>
          <FooterLink href="/legal/cookies">{t.cookies}</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-gray-500 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} SocialBoost AI. {t.rights}</span>
          <span>{t.hosted}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-gray-500">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-brand-500">
        {children}
      </Link>
    </li>
  );
}
