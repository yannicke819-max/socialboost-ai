import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  cached = new Anthropic({ apiKey });
  return cached;
}

export const MODELS = {
  workhorse: 'claude-sonnet-4-6',
  fast: 'claude-haiku-4-5-20251001',
  premium: 'claude-opus-4-7',
} as const;

export type ModelTier = keyof typeof MODELS;
