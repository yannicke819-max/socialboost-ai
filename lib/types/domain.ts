// Domain primitives — referenced everywhere in the AI core.
// Pure types, no runtime code. Branched into agent contracts in AI-001 and beyond.

export type Platform =
  | 'linkedin'
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'facebook';

export type GoalType = 'sales' | 'leads' | 'authority' | 'audience';

export type PlanId = 'free' | 'solo' | 'pro' | 'agency';

export type Locale = 'fr' | 'en' | 'es' | 'it' | 'de';

export type ModelTier = 'fast' | 'standard' | 'premium' | 'frontier';

export type HookType =
  | 'question'
  | 'contradiction'
  | 'story'
  | 'stat'
  | 'teaser'
  | 'analogy';

export type NarrativeStructure =
  | 'PAS'           // Problem - Agitate - Solve
  | 'AIDA'          // Attention - Interest - Desire - Action
  | 'story-lesson'
  | 'contrarian'
  | 'list'
  | 'tutorial';

export type FunnelStage = 'awareness' | 'consideration' | 'decision';

export type Period = string; // ISO month, e.g. '2026-05'
