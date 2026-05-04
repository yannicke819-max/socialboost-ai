/**
 * Provider registry — by id.
 *
 * Static. AI-003 only registers mock + anthropic. Future providers (image,
 * video, audio) will live in their own registries (per-category) per
 * docs/provider-lab.md, NOT extend this one.
 */

import type { ProviderAdapter } from './types';
import { MOCK_PROVIDER } from './mock';
import { ANTHROPIC_PROVIDER } from './anthropic';

const PROVIDERS: Record<ProviderAdapter['id'], ProviderAdapter> = {
  mock: MOCK_PROVIDER,
  anthropic: ANTHROPIC_PROVIDER,
};

export function getProvider(id: ProviderAdapter['id']): ProviderAdapter {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`Unknown provider id: ${id}`);
  return p;
}

export function listProviders(): ProviderAdapter[] {
  return Object.values(PROVIDERS);
}
