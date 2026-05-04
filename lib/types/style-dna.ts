import type { HookType, NarrativeStructure, Platform } from './domain';

// Style DNA — per-user editorial fingerprint. The moat.

export type FormalityLevel = 1 | 2 | 3 | 4 | 5;
export type WarmthLevel = 1 | 2 | 3 | 4 | 5;
export type AssertivenessLevel = 1 | 2 | 3 | 4 | 5;
export type HumorLevel = 1 | 2 | 3 | 4 | 5;

export interface ToneProfile {
  adjectives: string[];                // ['direct', 'ironic', 'warm']
  formality: FormalityLevel;
  warmth: WarmthLevel;
  assertiveness: AssertivenessLevel;
  humor: HumorLevel;
}

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert' | 'authority';

export interface RhythmProfile {
  sentence_length: 'short' | 'mixed' | 'long';
  paragraph_size: 'small' | 'medium' | 'large';
  pacing: 'punchy' | 'measured' | 'flowing';
}

export interface VocabularyProfile {
  signature_words: string[];           // extracted via TF-IDF on approved posts
  banned_words: string[];              // never use
  brand_idioms: string[];              // signature expressions
}

export interface HookPreferences {
  preferred_types: HookType[];
  avoid_types: HookType[];
}

export interface ChannelStylePref {
  preferred_format: AssetFormatPref[];
  hashtag_strategy: 'sparse' | 'medium' | 'dense' | 'none';
  cta_style: 'soft' | 'direct' | 'question';
  emoji_density: 'none' | 'minimal' | 'moderate' | 'heavy';
}

export type AssetFormatPref =
  | 'long-form'
  | 'carousel'
  | 'thread'
  | 'short-video'
  | 'short-post';

export interface StyleDNA {
  user_id: string;
  brand_profile_id: string;
  version: number;                     // bumped on each retraining
  active: boolean;                     // exactly one active version per profile

  // Structured (JSONB at storage)
  tone: ToneProfile;
  expertise_level: ExpertiseLevel;
  rhythm: RhythmProfile;
  vocabulary: VocabularyProfile;
  hooks: HookPreferences;
  narrative_structures: NarrativeStructure[];
  channel_preferences: Record<Platform, ChannelStylePref>;

  // Embeddings (pgvector at storage)
  voice_embedding?: number[];          // computed from approved examples

  // Audit
  created_at: string;
  last_updated: string;
  training_corrections_count: number;  // grows with usage — moat metric
}

// Examples — approved or rejected, with embeddings.
// NOTE: at MVP we deliberately do NOT aggregate a single rejected_embedding.
// Rejected examples are stored individually with structured rejection_reason.
// Aggregate anti-style embedding will be reconsidered after 2-3 months of real data.

export type ExampleStatus = 'approved' | 'rejected' | 'reference';

export interface StyleDNAExample {
  id: string;
  style_dna_id: string;
  platform: Platform;
  content: string;
  status: ExampleStatus;
  rejection_reason?: RejectionReason;
  performance_metric?: number;         // engagement rate if available
  embedding?: number[];                // pgvector
  created_at: string;
}

export type RejectionReason =
  | 'tone-off'
  | 'vocabulary-off'
  | 'too-generic'
  | 'wrong-hook'
  | 'wrong-cta'
  | 'wrong-format'
  | 'business-irrelevant'
  | 'legal-risk'
  | 'other';
