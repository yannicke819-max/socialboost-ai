import { Topbar } from '@/components/app/Topbar';
import { OffersWorkspaceClient } from '@/components/offer-workspace/OffersWorkspaceClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function OffersWorkspacePage() {
  return (
    <>
      <Topbar title="Offres" />
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <OffersWorkspaceClient language="fr" />
        </div>
      </div>
    </>
  );
}
