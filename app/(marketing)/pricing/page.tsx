import { PricingTable } from '@/components/marketing/PricingTable';
import { FAQ } from '@/components/marketing/FAQ';
import { getDict } from '@/lib/i18n';
import { buildPlans } from '@/lib/pricing';

export const metadata = {
  title: 'Pricing — SocialBoost AI',
  description:
    'Three plans for solo media operators. Starter €29, Pro €79, Studio €199. 14-day Pro trial.',
};

export default function PricingPage() {
  const t = getDict();
  const plans = buildPlans(t);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600 sm:text-sm">
            {t.pricingPage.eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t.pricingPage.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            {t.pricingPage.subtitle}
          </p>
        </div>
        <div className="mt-10 sm:mt-12">
          <PricingTable plans={plans} labels={t.pricingPage} />
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-16 dark:border-gray-800 dark:bg-gray-900 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            {t.pricingPage.questionsTitle}
          </h2>
          <div className="mt-8 sm:mt-10">
            <FAQ items={t.faq.items} />
          </div>
        </div>
      </section>
    </>
  );
}
