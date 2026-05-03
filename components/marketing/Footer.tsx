import Link from 'next/link';
import { LangSwitcher } from '@/components/LangSwitcher';
import { getDict, getLocale } from '@/lib/i18n';

export function MarketingFooter() {
  const locale = getLocale();
  const dict = getDict(locale);
  const t = dict.footer;

  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <p className="font-display text-2xl tracking-tight text-fg">
              SocialBoost
              <span className="italic text-fg-muted">.ai</span>
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber align-middle" />
            </p>
            <p className="mt-3 max-w-xs text-sm text-fg-muted">{t.tagline}</p>
            <div className="mt-5">
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

        {/* Massive editorial wordmark — purely decorative */}
        <div className="mt-16 select-none border-t border-border pt-10 sm:mt-20 sm:pt-12">
          <p
            aria-hidden
            className="font-display leading-[0.85] tracking-tighter text-fg/[0.06]"
            style={{ fontSize: 'clamp(4rem, 18vw, 14rem)' }}
          >
            SocialBoost<span className="italic">.ai</span>
          </p>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 text-xs text-fg-subtle sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} SocialBoost AI. {t.rights}</span>
          <span className="font-mono uppercase tracking-wider">{t.hosted}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-mono text-xs uppercase tracking-wider text-fg-subtle">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-fg-muted transition-colors hover:text-fg">
        {children}
      </Link>
    </li>
  );
}
