/**
 * Mock provider — zero cost, deterministic.
 *
 * The Mock provider does NOT execute the agent itself. It only declares its
 * identity and token estimation rules. Actual mock dispatch for Offer Brain
 * lives in lib/ai/offer-brain/mock.ts and is invoked by the contract adapter
 * via runOfferBrain({ forceMock: true }).
 */

import type { ProviderAdapter } from './types';

export const MOCK_PROVIDER: ProviderAdapter = {
  id: 'mock',
  name: 'Deterministic mock',
  default_model: 'mock-deterministic',
  supports: ['offer_brain'],
  estimateTokens: () => ({ input: 0, output: 0 }),
};
