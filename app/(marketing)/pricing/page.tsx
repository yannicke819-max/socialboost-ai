import { PricingTable } from '@/components/marketing/PricingTable';
import { FAQ } from '@/components/marketing/FAQ';
import { Badge } from '@/components/ui/Badge';
import { getDict } from '@/lib/i18n';
import { buildPlans } from '@/lib/pricing';

export const metadata = {
  title: 'Pricing — SocialBoost AI',
  description:
    'Four plans for solo media operators. Free, Solo €17, Pro €39, Agency €89. 14-day Pro trial.',
};

export default function PricingPage() {
  const t = getDict();
  const plans = buildPlans(t);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <Badge variant="mono" className="mb-4">
            {t.pricingPage.eyebrow}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl md:text-5xl">
            {t.pricingPage.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-fg-muted sm:text-lg">
            {t.pricingPage.subtitle}
          </p>
        </div>
        <div className="mt-10 sm:mt-12">
          <PricingTable plans={plans} labels={t.pricingPage} />
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-fg sm:text-3xl">
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
