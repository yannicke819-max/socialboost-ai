import { Topbar } from '@/components/app/Topbar';
import { OnboardingWizard } from '@/components/offer-workspace/OnboardingWizard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function OnboardingPage() {
  return (
    <>
      <Topbar title="Onboarding" />
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-2xl">
          <OnboardingWizard language="fr" />
        </div>
      </div>
    </>
  );
}
