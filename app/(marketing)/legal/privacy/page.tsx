import { LegalPage } from '@/components/marketing/LegalPage';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'Privacy Policy — SocialBoost AI' };

export default function PrivacyPage() {
  const dict = getDict();
  return (
    <LegalPage
      title={dict.legal.privacy.title}
      updated={dict.legal.privacy.updated}
      updatedLabel={dict.legal.updatedLabel}
      sections={dict.legal.privacy.sections}
    />
  );
}
