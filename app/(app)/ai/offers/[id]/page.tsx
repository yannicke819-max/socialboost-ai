import { Topbar } from '@/components/app/Topbar';
import { OfferDetailClient } from '@/components/offer-workspace/OfferDetailClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface OfferDetailPageProps {
  params: { id: string };
}

export default function OfferDetailPage({ params }: OfferDetailPageProps) {
  return (
    <>
      <Topbar title="Offre" />
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <OfferDetailClient offerId={params.id} language="fr" />
        </div>
      </div>
    </>
  );
}
