// Barrel export for AI core types.
// Pure types — no runtime code, no side effects.
// These are NOT branched into the runtime pipeline at AI-000.
// They will be consumed by AI-001 (Offer Brain POC) and beyond, with Zod schemas
// added next to them for parse-time validation.

export * from './domain';
export * from './offer';
export * from './campaign';
export * from './asset';
export * from './style-dna';
export * from './critic';
export * from './credit';
export * from './agent';
export * from './provider';
export * from './revenue';
