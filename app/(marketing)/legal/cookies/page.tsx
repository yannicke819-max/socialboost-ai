import { LegalPage } from '@/components/marketing/LegalPage';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'Cookie Policy — SocialBoost AI' };

export default function CookiesPage() {
  const dict = getDict();
  return (
    <LegalPage
      title={dict.legal.cookies.title}
      updated={dict.legal.cookies.updated}
      updatedLabel={dict.legal.updatedLabel}
      sections={dict.legal.cookies.sections}
    />
  );
}
