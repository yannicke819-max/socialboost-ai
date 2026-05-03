import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-gray-500">Publie moins, gagne plus.</p>
        </div>
        <FooterCol title="Produit">
          <FooterLink href="/#features">Fonctionnalités</FooterLink>
          <FooterLink href="/pricing">Tarifs</FooterLink>
          <FooterLink href="/#how">Comment ça marche</FooterLink>
          <FooterLink href="/#faq">FAQ</FooterLink>
        </FooterCol>
        <FooterCol title="Entreprise">
          <FooterLink href="/blog">Blog</FooterLink>
          <FooterLink href="/about">À propos</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
        </FooterCol>
        <FooterCol title="Légal">
          <FooterLink href="/legal/terms">CGU</FooterLink>
          <FooterLink href="/legal/privacy">Confidentialité</FooterLink>
          <FooterLink href="/legal/cookies">Cookies</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} SocialBoost AI. Tous droits réservés.</span>
          <span>Hébergé en Europe · RGPD</span>
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
