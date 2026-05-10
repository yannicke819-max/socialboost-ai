import { Topbar } from '@/components/app/Topbar';
import { OfferDetailClient } from '@/components/offer-workspace/OfferDetailClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface OfferDetailPageProps {
  params: { id: string };
}

export default function OfferDetailPage({ params }: OfferDetailPageProps) {
  // AI-016D — non-secret booleans derived server-side. The actual API key
  // never crosses to the client; only the on/off state is needed for the
  // smoke-test microcopy. `simulatedPlanAllowed` is gated to non-Production.
  const providerEnabled = process.env.SOCIALBOOST_AI_PROVIDER_ENABLED === 'true';
  const simulatedPlanAllowed = process.env.VERCEL_ENV !== 'production';
  return (
    <>
      <Topbar title="Offre" />
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <OfferDetailClient
            offerId={params.id}
            language="fr"
            providerEnabled={providerEnabled}
            simulatedPlanAllowed={simulatedPlanAllowed}
          />
        </div>
      </div>
    </>
  );
}
