import { PricingTable } from '@/components/marketing/PricingTable';
import { FAQ } from '@/components/marketing/FAQ';

export const metadata = {
  title: 'Tarifs — SocialBoost AI',
  description: 'Trois plans pour les médias solos. Starter 29 €, Pro 79 €, Studio 199 €. Trial 14 jours sur le Pro.',
};

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-600">
            Tarifs
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Trois plans. Pas de free tier.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Tous les plans incluent le Brand Voice Setup et la génération multi-plateformes.
            Trial 14 jours offert sur le Pro. Annulation en 1 clic.
          </p>
        </div>
        <div className="mt-12">
          <PricingTable />
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold">Questions fréquentes</h2>
          <div className="mt-10">
            <FAQ />
          </div>
        </div>
      </section>
    </>
  );
}
