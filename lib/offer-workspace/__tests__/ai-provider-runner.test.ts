import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PASTED_TEXT_CHARS,
  MAX_PROMPT_CHARS,
  SOURCE_COPY_WINDOW_CHARS,
  buildBlockedResult,
  buildDryRunResult,
  buildRequestId,
  postflightCheck,
  preflightCheck,
  type AiProviderRunInput,
} from '../ai-provider-runner';
import {
  buildExpertPrompt,
  buildExternalInspirationPrompt,
  type ExternalInspirationInput,
} from '../prompt-orchestrator';
import { decideAiExecution } from '../ai-entitlements';
import { type Offer } from '../types';

const NOW = '2026-05-04T00:00:00Z';

function makeOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 'ofr_runner',
    name: 'Atelier Nova',
    status: 'draft',
    goal: 'social_content',
    language: over.language ?? 'fr',
    brief: over.brief ?? {
      businessName: 'Atelier Nova',
      offer: "Programme de 4 semaines pour clarifier l'offre.",
      targetAudience: 'indépendants B2B',
      tone: 'professional',
      language: 'fr',
      platforms: ['linkedin', 'email'],
      proofPoints: ['Méthode testée sur 12 offres'],
    },
    confidence_score: 80,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const baseOffer = makeOffer();
const basePrompt = buildExpertPrompt({ offer: baseOffer, task: 'user_advice' });

// -----------------------------------------------------------------------------
// preflightCheck
// -----------------------------------------------------------------------------

describe('preflightCheck — happy path + failure modes', () => {
  it('clean PromptVersion + matching offer language passes', () => {
    const r = preflightCheck({ promptVersion: basePrompt, offer: baseOffer });
    assert.deepEqual(r, { ok: true });
  });

  it('blocks unknown task', () => {
    const bad = { ...basePrompt, task: 'not_a_task' as never };
    const r = preflightCheck({ promptVersion: bad });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'unknown_task');
  });

  it('blocks empty expectedOutput', () => {
    const bad = { ...basePrompt, expectedOutput: '' };
    const r = preflightCheck({ promptVersion: bad });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'missing_expected_output');
  });

  it('blocks empty guardrails', () => {
    const bad = { ...basePrompt, guardrails: [] };
    const r = preflightCheck({ promptVersion: bad });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'missing_guardrails');
  });

  it('blocks oversized prompts', () => {
    const huge = 'A'.repeat(MAX_PROMPT_CHARS + 10);
    const bad = { ...basePrompt, userPrompt: huge };
    const r = preflightCheck({ promptVersion: bad });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'prompt_too_long');
  });

  it('blocks prompts that contain a forbidden phrase', () => {
    const bad = {
      ...basePrompt,
      userPrompt: `${basePrompt.userPrompt}\n\nNote: nous garantissons un viral garanti.`,
    };
    const r = preflightCheck({ promptVersion: bad });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'forbidden_phrase_in_prompt');
  });

  it('blocks language mismatch with the offer brief', () => {
    const enOffer = makeOffer({
      language: 'en',
      brief: { ...makeOffer().brief, language: 'en' },
    });
    const r = preflightCheck({ promptVersion: basePrompt, offer: enOffer });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'language_mismatch_with_offer');
  });
});

describe('preflightCheck — external inspirations hardening', () => {
  const inspirations: ExternalInspirationInput[] = [
    {
      sourcePlatform: 'linkedin',
      sourceType: 'organic_post',
      pastedText: 'Court extrait FR.',
      observedSignals: ['beaucoup de commentaires'],
      language: 'fr',
      doNotCopy: true,
    },
  ];

  it('passes when every inspiration carries doNotCopy=true', () => {
    const prompt = buildExternalInspirationPrompt({ offer: baseOffer, inspirations });
    const r = preflightCheck({ promptVersion: prompt, offer: baseOffer, inspirations });
    assert.deepEqual(r, { ok: true });
  });

  it('blocks when any inspiration has doNotCopy=false', () => {
    const broken = [{ ...inspirations[0]!, doNotCopy: false as unknown as true }];
    const prompt = buildExternalInspirationPrompt({ offer: baseOffer, inspirations });
    const r = preflightCheck({ promptVersion: prompt, offer: baseOffer, inspirations: broken });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'inspiration_missing_do_not_copy');
  });

  it('blocks oversized pastedText', () => {
    const huge: ExternalInspirationInput = {
      sourcePlatform: 'linkedin',
      sourceType: 'organic_post',
      pastedText: 'A'.repeat(MAX_PASTED_TEXT_CHARS + 1),
      language: 'fr',
      doNotCopy: true,
    };
    const prompt = buildExternalInspirationPrompt({ offer: baseOffer, inspirations: [huge] });
    const r = preflightCheck({ promptVersion: prompt, offer: baseOffer, inspirations: [huge] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'inspiration_pasted_text_too_long');
  });

  it('blocks when the prompt body lacks the "do not copy" marker', () => {
    const prompt = buildExternalInspirationPrompt({ offer: baseOffer, inspirations });
    const stripped = { ...prompt, userPrompt: 'Generic body without the marker.' };
    const r = preflightCheck({ promptVersion: stripped, offer: baseOffer, inspirations });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'inspiration_block_missing_do_not_copy_marker');
  });
});

// -----------------------------------------------------------------------------
// postflightCheck
// -----------------------------------------------------------------------------

describe('postflightCheck', () => {
  it('blocks output that contains a forbidden phrase', () => {
    const r = postflightCheck({
      promptVersion: { ...basePrompt, outputFormat: 'short_copy' },
      outputText: 'Voici un viral garanti pour ton offre.',
    });
    assert.equal(r.blockedReason, 'forbidden_phrase_in_output');
  });

  it('detects suspected source copying (≥ 30 char verbatim window)', () => {
    const inspirations: ExternalInspirationInput[] = [
      {
        sourcePlatform: 'linkedin',
        sourceType: 'organic_post',
        pastedText: "Voici comment je suis passé de 3 leads par mois à un calendrier rempli sans changer d'outil.",
        language: 'fr',
        doNotCopy: true,
      },
    ];
    const out = `Inspiré : Voici comment je suis passé de 3 leads par mois — adapté.`;
    const r = postflightCheck({
      promptVersion: { ...basePrompt, outputFormat: 'short_copy' },
      outputText: out,
      inspirations,
    });
    assert.equal(r.blockedReason, 'suspected_source_copying');
  });

  it('does not flag short verbatim windows below the threshold', () => {
    const inspirations: ExternalInspirationInput[] = [
      {
        sourcePlatform: 'linkedin',
        sourceType: 'organic_post',
        pastedText: 'court extrait',
        language: 'fr',
        doNotCopy: true,
      },
    ];
    assert.ok('court extrait'.length < SOURCE_COPY_WINDOW_CHARS);
    const r = postflightCheck({
      promptVersion: { ...basePrompt, outputFormat: 'short_copy' },
      outputText: 'court extrait',
      inspirations,
    });
    assert.equal(r.blockedReason, undefined);
  });

  it('returns validationErrors when output_format=json but output is invalid JSON', () => {
    const r = postflightCheck({
      promptVersion: { ...basePrompt, outputFormat: 'json' },
      outputText: '{ invalid',
    });
    assert.deepEqual(r.validationErrors?.[0], 'invalid_json');
  });

  it('parses valid JSON when output_format=json', () => {
    const r = postflightCheck({
      promptVersion: { ...basePrompt, outputFormat: 'json' },
      outputText: '{"advice":"go","recommendedAction":"x","why":"y"}',
    });
    assert.deepEqual(r.outputJson, { advice: 'go', recommendedAction: 'x', why: 'y' });
  });
});

// -----------------------------------------------------------------------------
// Result builders
// -----------------------------------------------------------------------------

describe('buildDryRunResult + buildBlockedResult', () => {
  it('dry-run result has dryRun=true / flagEnabled=false / mock provider by default', () => {
    const r = buildDryRunResult({ promptVersion: basePrompt });
    assert.equal(r.meta.dryRun, true);
    assert.equal(r.meta.flagEnabled, false);
    assert.equal(r.provider, 'mock');
    assert.match(r.outputText ?? '', /Provider IA désactivé/);
    assert.equal(r.task, basePrompt.task);
    assert.ok(r.meta.requestId.startsWith('req_'));
  });

  it('dry-run with flagEnabled=true marks the env-flag side correctly', () => {
    const r = buildDryRunResult({ promptVersion: basePrompt }, { flagEnabled: true });
    assert.equal(r.meta.flagEnabled, true);
    assert.equal(r.meta.dryRun, true);
  });

  it('blocked result carries the reason and ok=false', () => {
    const r = buildBlockedResult({ promptVersion: basePrompt }, 'forbidden_phrase_in_prompt', false);
    assert.equal(r.ok, false);
    assert.equal(r.blockedReason, 'forbidden_phrase_in_prompt');
  });

  it('determinism — same input → same requestId (no Date.now leakage)', () => {
    const a = buildDryRunResult({ promptVersion: basePrompt });
    const b = buildDryRunResult({ promptVersion: basePrompt });
    assert.equal(a.meta.requestId, b.meta.requestId);
    assert.equal(a.meta.startedAtMock, b.meta.startedAtMock);
    assert.equal(a.meta.finishedAtMock, b.meta.finishedAtMock);
  });

  it('plan + decisionReason surface in meta when supplied', () => {
    const input: AiProviderRunInput = { promptVersion: basePrompt, plan: 'starter' };
    const r = buildDryRunResult(input, { decisionReason: 'allowed_included_credits' });
    assert.equal(r.meta.plan, 'starter');
    assert.equal(r.meta.decisionReason, 'allowed_included_credits');
  });
});

describe('buildRequestId', () => {
  it('derives a stable id from the prompt id when none is supplied', () => {
    const id = buildRequestId({ promptVersion: basePrompt });
    assert.match(id, new RegExp(`^req_${basePrompt.id}$`));
  });
  it('appends the userId tag', () => {
    const id = buildRequestId({ promptVersion: basePrompt, userId: 'user_42' });
    assert.match(id, /_user_42$/);
  });
});

// -----------------------------------------------------------------------------
// AI-016B Free-bypass-prevention contract — verified at the entitlements
// layer (which the gateway must consult BEFORE the env flag).
// -----------------------------------------------------------------------------

describe('AI-016B Free hard rule — entitlements layer', () => {
  it('Free + providerFlagEnabled=true → providerCallAllowed=false (flag NEVER bypasses Free)', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 999_999,
      action: 'ad_generation',
      providerFlagEnabled: true,
    });
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.mode, 'dry_run');
  });

  it('Free + hasUserProvidedApiKey → mode=byok but providerCallAllowed=false (BYOK reserved future)', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 0,
      action: 'ad_generation',
      hasUserProvidedApiKey: true,
      providerFlagEnabled: true,
    });
    assert.equal(d.mode, 'byok');
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.reason, 'byok_reserved_for_future');
  });

  it('Free across every action × every flag/key combination → providerCallAllowed=false', () => {
    const actions = [
      'offer_diagnosis', 'external_inspiration_analysis', 'angle_discovery',
      'post_ideas', 'ad_generation', 'ad_critique', 'ad_improvement',
      'weekly_plan', 'user_advice', 'full_campaign_pack',
    ] as const;
    for (const action of actions) {
      for (const flag of [false, true]) {
        for (const key of [false, true]) {
          const d = decideAiExecution({
            plan: 'free',
            remainingCredits: 100_000,
            action,
            providerFlagEnabled: flag,
            hasUserProvidedApiKey: key,
          });
          assert.equal(
            d.providerCallAllowed,
            false,
            `Free leaked provider for action=${action} flag=${flag} key=${key}`,
          );
          assert.equal(
            d.adminCostAllowed,
            false,
            `Free would charge admin for action=${action} flag=${flag} key=${key}`,
          );
        }
      }
    }
  });

  it('Starter + providerFlagEnabled=true + sufficient credits → providerCallAllowed=true', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 1_000,
      action: 'user_advice',
      providerFlagEnabled: true,
    });
    assert.equal(d.providerCallAllowed, true);
    assert.equal(d.adminCostAllowed, true);
    assert.equal(d.mode, 'included_credits');
  });

  it('Starter + insufficient credits → providerCallAllowed=false even with flag ON', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 0,
      action: 'ad_generation',
      providerFlagEnabled: true,
    });
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.reason, 'insufficient_credits');
  });

  it('Starter + sonnet → premium_not_allowed (premium gate above credits)', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 1000,
      action: 'ad_critique',
      requestedProvider: 'anthropic',
      requestedModel: 'claude-sonnet-4.6',
      providerFlagEnabled: true,
    });
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.reason, 'premium_not_allowed');
  });

  it('Pro + sonnet on high-stakes action → providerCallAllowed=true', () => {
    const d = decideAiExecution({
      plan: 'pro',
      remainingCredits: 4000,
      action: 'offer_diagnosis',
      requestedProvider: 'anthropic',
      requestedModel: 'claude-sonnet-4.6',
      providerFlagEnabled: true,
    });
    assert.equal(d.providerCallAllowed, true);
  });

  it('Opus on every plan → expert_never_auto, providerCallAllowed=false', () => {
    for (const plan of ['free', 'starter', 'pro', 'business', 'agency'] as const) {
      const d = decideAiExecution({
        plan,
        remainingCredits: 100_000,
        action: 'full_campaign_pack',
        requestedProvider: 'anthropic',
        requestedModel: 'claude-opus-4.6',
        providerFlagEnabled: true,
      });
      assert.equal(d.providerCallAllowed, false, `${plan} leaked opus`);
      // Free returns its own free_prompt_pack_only reason; paid plans return expert_never_auto.
      const expected = plan === 'free' ? 'free_prompt_pack_only' : 'expert_never_auto';
      assert.equal(d.reason, expected);
    }
  });
});

// -----------------------------------------------------------------------------
// Hygiene
// -----------------------------------------------------------------------------

describe('hygiene — pure module', () => {
  it('no process.env access from this test (sanity assert)', () => {
    const a: AiProviderRunInput = { promptVersion: basePrompt };
    const r1 = buildDryRunResult(a);
    const r2 = buildDryRunResult(a);
    assert.deepEqual(r1, r2);
  });
});
