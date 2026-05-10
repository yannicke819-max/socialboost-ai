/**
 * AI Provider Gateway — orchestration tests (AI-016C).
 *
 * Verifies the full chain: preflight → entitlements → flag → key → fetch →
 * postflight. Uses dependency injection on `runAiProvider` to avoid
 * touching `process.env` or hitting the network.
 *
 * Hard rules pinned here:
 *   - Free + flag ON + key present → 0 fetch (entitlements blocks first).
 *   - Paid + flag OFF → blocked `provider_disabled`, 0 fetch.
 *   - Paid + flag ON + key absent → blocked `provider_missing_key`, 0 fetch.
 *   - Paid + flag ON + key + sufficient credits → fetch happens.
 *   - Paid + insufficient credits → 0 fetch.
 *   - Preflight forbidden phrase → 0 fetch.
 *   - Postflight forbidden phrase → blocked.
 *   - JSON validation surfaces parse errors.
 *   - Adapter errors map to stable blockedReasons.
 *   - No prompt body or API key in `warn` log.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAiProvider, type RunAiProviderDeps } from '../../ai/provider-gateway';
import {
  OpenAiAdapterError,
  type AiProviderRawResult,
  type OpenAiProviderAdapter,
  type OpenAiProviderAdapterOptions,
  type RunOpenAiPromptInput,
} from '../../ai/openai-provider-adapter';
import { buildExpertPrompt } from '../prompt-orchestrator';
import { type AiProviderRunInput } from '../ai-provider-runner';
import { type Offer } from '../types';
import { type SocialBoostPlan } from '../ai-cost-model';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const NOW = '2026-05-04T00:00:00Z';

function makeOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 'ofr_gw',
    name: 'Atelier Nova',
    status: 'draft',
    goal: 'social_content',
    language: 'fr',
    brief: {
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
    ...over,
  };
}

const baseOffer = makeOffer();
const basePrompt = buildExpertPrompt({ offer: baseOffer, task: 'user_advice' });

function makeInput(over: Partial<AiProviderRunInput> = {}): AiProviderRunInput {
  return {
    promptVersion: basePrompt,
    plan: 'free',
    remainingCredits: 0,
    action: 'user_advice',
    ...over,
  };
}

interface FakeAdapterCalls {
  count: number;
  lastInput?: RunOpenAiPromptInput;
  lastOptions?: OpenAiProviderAdapterOptions;
}

function makeAdapterFactory(
  raw: AiProviderRawResult,
  calls: FakeAdapterCalls,
): typeof import('../../ai/openai-provider-adapter').createOpenAiProviderAdapter {
  return ((options: OpenAiProviderAdapterOptions): OpenAiProviderAdapter => {
    calls.lastOptions = options;
    return {
      model: options.model,
      buildPayload: () => ({}),
      runOpenAiPrompt: async (input: RunOpenAiPromptInput) => {
        calls.count += 1;
        calls.lastInput = input;
        return raw;
      },
    };
  }) as typeof import('../../ai/openai-provider-adapter').createOpenAiProviderAdapter;
}

function makeFailingAdapterFactory(
  err: unknown,
  calls: FakeAdapterCalls,
): typeof import('../../ai/openai-provider-adapter').createOpenAiProviderAdapter {
  return ((options: OpenAiProviderAdapterOptions): OpenAiProviderAdapter => ({
    model: options.model,
    buildPayload: () => ({}),
    runOpenAiPrompt: async () => {
      calls.count += 1;
      throw err;
    },
  })) as typeof import('../../ai/openai-provider-adapter').createOpenAiProviderAdapter;
}

function depsBuilder(
  adapterCalls: FakeAdapterCalls,
  warnSink: string[],
  over: Partial<RunAiProviderDeps> = {},
): RunAiProviderDeps {
  return {
    flagReader: () => true,
    providerResolver: () => 'openai',
    modelResolver: () => 'gpt-4.1-mini',
    openaiKeyReader: () => 'sk-test-key',
    warn: (m: string) => warnSink.push(m),
    isoNow: () => NOW,
    openaiAdapterFactory: makeAdapterFactory(
      {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        outputText: '{"advice":"sample output text"}',
      },
      adapterCalls,
    ),
    ...over,
  };
}

// -----------------------------------------------------------------------------
// Free hard rule — gateway side.
// -----------------------------------------------------------------------------

describe('runAiProvider — Free plan never reaches the adapter', () => {
  for (const flagOn of [true, false]) {
    for (const hasKey of [true, false]) {
      for (const hasUserKey of [false, true]) {
        it(`Free × flag=${flagOn} × envKey=${hasKey} × byok=${hasUserKey} → 0 fetch`, async () => {
          const calls: FakeAdapterCalls = { count: 0 };
          const warns: string[] = [];
          const result = await runAiProvider(
            makeInput({ plan: 'free', hasUserProvidedApiKey: hasUserKey }),
            depsBuilder(calls, warns, {
              flagReader: () => flagOn,
              openaiKeyReader: () => (hasKey ? 'sk-test' : null),
            }),
          );
          assert.equal(calls.count, 0);
          assert.equal(result.meta.dryRun, true);
          assert.equal(result.provider, 'mock');
        });
      }
    }
  }
});

// -----------------------------------------------------------------------------
// Paid plan — flag and key gating.
// -----------------------------------------------------------------------------

describe('runAiProvider — paid plan flag/key gating', () => {
  it('Starter + flag OFF → blocked provider_disabled, 0 fetch', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 1000, action: 'user_advice' }),
      depsBuilder(calls, warns, { flagReader: () => false }),
    );
    assert.equal(calls.count, 0);
    assert.equal(r.ok, false);
    assert.equal(r.blockedReason, 'provider_disabled');
    assert.equal(r.meta.flagEnabled, false);
  });

  it('Starter + flag ON + key absent → blocked provider_missing_key, 0 fetch', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 1000, action: 'user_advice' }),
      depsBuilder(calls, warns, { openaiKeyReader: () => null }),
    );
    assert.equal(calls.count, 0);
    assert.equal(r.ok, false);
    assert.equal(r.blockedReason, 'provider_missing_key');
    assert.equal(r.meta.flagEnabled, true);
  });

  it('Starter + flag ON + key present + sufficient credits → fetch happens', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000, action: 'user_advice' }),
      depsBuilder(calls, warns),
    );
    assert.equal(calls.count, 1);
    assert.equal(r.ok, true);
    assert.equal(r.provider, 'openai');
    assert.equal(r.model, 'gpt-4.1-mini');
    assert.equal(r.outputText, '{"advice":"sample output text"}');
    assert.equal(r.meta.dryRun, false);
  });

  it('Starter + insufficient credits → 0 fetch (entitlements blocks)', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 0, action: 'user_advice' }),
      depsBuilder(calls, warns),
    );
    assert.equal(calls.count, 0);
    assert.equal(r.ok, false);
  });

  it('Pro + ad_generation + flag ON + key + credits → fetch happens', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const r = await runAiProvider(
      makeInput({
        plan: 'pro' as SocialBoostPlan,
        remainingCredits: 50_000,
        action: 'ad_generation',
      }),
      depsBuilder(calls, warns),
    );
    assert.equal(calls.count, 1);
    assert.equal(r.ok, true);
  });
});

// -----------------------------------------------------------------------------
// Preflight + Postflight integration.
// -----------------------------------------------------------------------------

describe('runAiProvider — preflight blocks before fetch', () => {
  it('forbidden phrase in prompt → 0 fetch, blocked', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const taintedPrompt = {
      ...basePrompt,
      userPrompt: `${basePrompt.userPrompt} guaranteed results in 24 hours`,
    };
    const r = await runAiProvider(
      makeInput({
        plan: 'starter',
        remainingCredits: 5000,
        promptVersion: taintedPrompt,
      }),
      depsBuilder(calls, warns),
    );
    assert.equal(calls.count, 0);
    assert.equal(r.ok, false);
    assert.equal(r.blockedReason, 'forbidden_phrase_in_prompt');
  });

  it('preflight runs before entitlements (preflight wins)', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const tainted = {
      ...basePrompt,
      userPrompt: `${basePrompt.userPrompt} guaranteed results in 24 hours`,
    };
    const r = await runAiProvider(
      makeInput({ plan: 'free', promptVersion: tainted }),
      depsBuilder(calls, warns),
    );
    assert.equal(calls.count, 0);
    assert.equal(r.blockedReason, 'forbidden_phrase_in_prompt');
  });
});

describe('runAiProvider — postflight scans the model output', () => {
  it('forbidden phrase in output → blocked', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const factory = makeAdapterFactory(
      {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        outputText: 'guaranteed results in 24 hours starting tomorrow',
      },
      calls,
    );
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000 }),
      depsBuilder(calls, warns, { openaiAdapterFactory: factory }),
    );
    assert.equal(calls.count, 1);
    assert.equal(r.ok, false);
    assert.equal(r.blockedReason, 'forbidden_phrase_in_output');
  });

  it('json output format with invalid JSON surfaces validationErrors', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const jsonPrompt = { ...basePrompt, outputFormat: 'json' as const };
    const factory = makeAdapterFactory(
      {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        outputText: '{not really json',
      },
      calls,
    );
    const r = await runAiProvider(
      makeInput({
        plan: 'starter',
        remainingCredits: 5000,
        promptVersion: jsonPrompt,
      }),
      depsBuilder(calls, warns, { openaiAdapterFactory: factory }),
    );
    assert.equal(calls.count, 1);
    assert.equal(r.ok, false);
    assert.equal(Array.isArray(r.validationErrors), true);
    assert.equal(r.validationErrors?.[0], 'invalid_json');
  });
});

// -----------------------------------------------------------------------------
// Adapter error mapping integration.
// -----------------------------------------------------------------------------

describe('runAiProvider — adapter error mapping', () => {
  it('401 (provider_auth_error) → blocked with same code', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const factory = makeFailingAdapterFactory(
      new OpenAiAdapterError('provider_auth_error', 'http_401', 401),
      calls,
    );
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000 }),
      depsBuilder(calls, warns, { openaiAdapterFactory: factory }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.blockedReason, 'provider_auth_error');
  });

  it('429 (provider_rate_limited) → blocked with same code', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const factory = makeFailingAdapterFactory(
      new OpenAiAdapterError('provider_rate_limited', 'http_429', 429),
      calls,
    );
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000 }),
      depsBuilder(calls, warns, { openaiAdapterFactory: factory }),
    );
    assert.equal(r.blockedReason, 'provider_rate_limited');
  });

  it('5xx (provider_unavailable) → blocked with same code', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const factory = makeFailingAdapterFactory(
      new OpenAiAdapterError('provider_unavailable', 'http_503', 503),
      calls,
    );
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000 }),
      depsBuilder(calls, warns, { openaiAdapterFactory: factory }),
    );
    assert.equal(r.blockedReason, 'provider_unavailable');
  });

  it('timeout → blocked provider_timeout', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const factory = makeFailingAdapterFactory(
      new OpenAiAdapterError('provider_timeout', 'timed_out'),
      calls,
    );
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000 }),
      depsBuilder(calls, warns, { openaiAdapterFactory: factory }),
    );
    assert.equal(r.blockedReason, 'provider_timeout');
  });

  it('arbitrary thrown error → blocked provider_call_failed', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const factory = makeFailingAdapterFactory(new Error('boom'), calls);
    const r = await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000 }),
      depsBuilder(calls, warns, { openaiAdapterFactory: factory }),
    );
    assert.equal(r.blockedReason, 'provider_call_failed');
  });
});

// -----------------------------------------------------------------------------
// Logging hygiene.
// -----------------------------------------------------------------------------

describe('runAiProvider — log redaction', () => {
  it('warn on adapter error never contains prompt body or API key', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    const sentinelPrompt = {
      ...basePrompt,
      userPrompt: `${basePrompt.userPrompt} PROMPT-LEAK-SENTINEL`,
    };
    const secretKey = 'sk-supersecret-1234567890';
    const factory = makeFailingAdapterFactory(
      new OpenAiAdapterError('provider_unavailable', 'http_502', 502),
      calls,
    );
    await runAiProvider(
      makeInput({
        plan: 'starter',
        remainingCredits: 5000,
        promptVersion: sentinelPrompt,
      }),
      depsBuilder(calls, warns, {
        openaiKeyReader: () => secretKey,
        openaiAdapterFactory: factory,
      }),
    );
    const all = warns.join('\n');
    assert.equal(all.includes('PROMPT-LEAK-SENTINEL'), false);
    assert.equal(all.includes(secretKey), false);
    assert.match(all, /provider=openai/);
    assert.match(all, /provider_unavailable/);
  });

  it('happy path emits no warn line', async () => {
    const calls: FakeAdapterCalls = { count: 0 };
    const warns: string[] = [];
    await runAiProvider(
      makeInput({ plan: 'starter', remainingCredits: 5000 }),
      depsBuilder(calls, warns),
    );
    assert.equal(warns.length, 0);
  });
});
