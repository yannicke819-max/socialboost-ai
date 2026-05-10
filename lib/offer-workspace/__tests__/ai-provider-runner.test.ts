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

describe('preflightCheck — happy path', () => {
  it('a clean PromptVersion with matching offer language passes', () => {
    const r = preflightCheck({ promptVersion: basePrompt, offer: baseOffer });
    assert.deepEqual(r, { ok: true });
  });
});

describe('preflightCheck — failure modes', () => {
  it('blocks an unknown task', () => {
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
    // Inject a forbidden phrase directly into the prompt body.
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
    // basePrompt is FR, brief says EN → should fail.
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

  it('passes when every inspiration carries doNotCopy=true and the prompt frames "ne copie pas"', () => {
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

  it('blocks when an inspiration pastedText exceeds the cap', () => {
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

  it('blocks when the prompt body does not contain the "Do not copy" / "Ne copie pas" marker', () => {
    // Strip the marker by overriding the user prompt — should fail.
    const prompt = buildExternalInspirationPrompt({ offer: baseOffer, inspirations });
    const stripped = { ...prompt, userPrompt: 'Generic body without the marker.' };
    const r = preflightCheck({ promptVersion: stripped, offer: baseOffer, inspirations });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.blockedReason, 'inspiration_block_missing_do_not_copy_marker');
  });
});

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
        pastedText: 'Voici comment je suis passé de 3 leads par mois à un calendrier rempli sans changer d\'outil.',
        language: 'fr',
        doNotCopy: true,
      },
    ];
    const out = `Inspiré de l'exemple : Voici comment je suis passé de 3 leads par mois — adapté à mon offre.`;
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
    // SOURCE_COPY_WINDOW_CHARS is 30; "court extrait" is shorter so safe.
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

  it('returns empty result on a healthy short_copy output', () => {
    const r = postflightCheck({
      promptVersion: { ...basePrompt, outputFormat: 'short_copy' },
      outputText: 'Texte propre sans rien de problématique.',
    });
    assert.deepEqual(r, {});
  });
});

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

  it('dry-run EN message when prompt language is EN', () => {
    const enOffer = makeOffer({
      language: 'en',
      brief: { ...makeOffer().brief, language: 'en' },
    });
    const enPrompt = buildExpertPrompt({ offer: enOffer, task: 'user_advice' });
    const r = buildDryRunResult({ promptVersion: enPrompt });
    assert.match(r.outputText ?? '', /AI provider is disabled/);
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
    assert.equal(r.meta.flagEnabled, false);
    assert.equal(r.meta.dryRun, true);
  });

  it('determinism — same input → same requestId (no Date.now leakage)', () => {
    const a = buildDryRunResult({ promptVersion: basePrompt });
    const b = buildDryRunResult({ promptVersion: basePrompt });
    assert.equal(a.meta.requestId, b.meta.requestId);
    assert.equal(a.meta.startedAtMock, b.meta.startedAtMock);
    assert.equal(a.meta.finishedAtMock, b.meta.finishedAtMock);
  });

  it('explicit requestId is preserved', () => {
    const r = buildDryRunResult({ promptVersion: basePrompt, requestId: 'req_explicit' });
    assert.equal(r.meta.requestId, 'req_explicit');
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

describe('hygiene — pure module never reads process.env', () => {
  it('no process.env access from this test (sanity assert)', async () => {
    // The test fixture uses no env. If the runner module silently read env,
    // we would expect leakage in the result. As a smoke test, we run the
    // public helpers with no env touched and check determinism + shape.
    const a: AiProviderRunInput = { promptVersion: basePrompt };
    const r1 = buildDryRunResult(a);
    const r2 = buildDryRunResult(a);
    assert.deepEqual(r1, r2);
  });
});
