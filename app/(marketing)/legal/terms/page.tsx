import { LegalPage } from '@/components/marketing/LegalPage';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'Terms of Service — SocialBoost AI' };

export default function TermsPage() {
  const dict = getDict();
  return (
    <LegalPage
      title={dict.legal.terms.title}
      updated={dict.legal.terms.updated}
      updatedLabel={dict.legal.updatedLabel}
      sections={dict.legal.terms.sections}
    />
  );
}
