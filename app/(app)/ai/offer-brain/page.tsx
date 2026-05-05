import { Topbar } from '@/components/app/Topbar';
import { OfferBrainStudio } from '@/components/offer-brain/OfferBrainStudio';
import { endpointEnabled } from '@/lib/ai/offer-brain/api-flag';

// Read OFFER_BRAIN_API_ENABLED at request time (env-var driven).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function OfferBrainPage() {
  const enabled = endpointEnabled();
  return (
    <>
      <Topbar title="Offer Brain" />
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <OfferBrainStudio endpointEnabled={enabled} />
        </div>
      </div>
    </>
  );
}
