import type { Dict } from '@/lib/i18n';
import type { Plan } from '@/components/marketing/PricingTable';

const PRICES = {
  free: { monthly: 0, yearly: 0 },
  solo: { monthly: 17, yearly: 14 },
  pro: { monthly: 39, yearly: 31 },
  agency: { monthly: 89, yearly: 71 },
} as const;

export function buildPlans(dict: Dict): Plan[] {
  return [
    { id: 'free', ...PRICES.free, ...dict.plans.free },
    { id: 'solo', ...PRICES.solo, ...dict.plans.solo },
    { id: 'pro', ...PRICES.pro, highlight: true, ...dict.plans.pro },
    {
      id: 'agency',
      ...PRICES.agency,
      beta: true,
      ...dict.plans.agency,
    },
  ];
}
