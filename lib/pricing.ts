import type { Dict } from '@/lib/i18n';
import type { Plan } from '@/components/marketing/PricingTable';

const PRICES = {
  starter: { monthly: 29, yearly: 24 },
  pro: { monthly: 79, yearly: 66 },
  studio: { monthly: 199, yearly: 166 },
} as const;

export function buildPlans(dict: Dict): Plan[] {
  return [
    { id: 'starter', ...PRICES.starter, ...dict.plans.starter },
    { id: 'pro', ...PRICES.pro, highlight: true, ...dict.plans.pro },
    { id: 'studio', ...PRICES.studio, ...dict.plans.studio },
  ];
}
