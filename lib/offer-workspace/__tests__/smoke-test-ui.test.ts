/**
 * Smoke-test UI state + payload hygiene tests (AI-016D).
 *
 * Pins:
 *   - The (plan, providerEnabled) → state mapping.
 *   - That the client-side `PromptInspector.tsx` never references an
 *     API key, never imports the OpenAI adapter, never reads provider
 *     env vars.
 *   - That the microcopy strings exist and are non-empty.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SMOKE_TEST_UI_STATES,
  resolveSmokeTestUiState,
} from '../smoke-test-ui';
import { SOCIALBOOST_PLANS } from '../ai-cost-model';
import {
  PROMPT_INSPECTOR_FR,
  PROMPT_INSPECTOR_EN,
} from '../prompt-inspector-labels';

// -----------------------------------------------------------------------------
// resolveSmokeTestUiState — pure mapping
// -----------------------------------------------------------------------------

describe('resolveSmokeTestUiState — Free hard rule', () => {
  for (const providerEnabled of [true, false]) {
    it(`Free × providerEnabled=${providerEnabled} → 'free'`, () => {
      const r = resolveSmokeTestUiState({ plan: 'free', providerEnabled });
      assert.equal(r, 'free');
    });
  }
});

describe('resolveSmokeTestUiState — paid plans', () => {
  const paidPlans = SOCIALBOOST_PLANS.filter((p) => p !== 'free');
  for (const plan of paidPlans) {
    it(`${plan} + providerEnabled=false → 'paid_disabled'`, () => {
      const r = resolveSmokeTestUiState({ plan, providerEnabled: false });
      assert.equal(r, 'paid_disabled');
    });
    it(`${plan} + providerEnabled=true → 'paid_enabled'`, () => {
      const r = resolveSmokeTestUiState({ plan, providerEnabled: true });
      assert.equal(r, 'paid_enabled');
    });
  }
});

describe('SMOKE_TEST_UI_STATES exhaustiveness', () => {
  it('exposes the three documented states', () => {
    assert.deepEqual([...SMOKE_TEST_UI_STATES].sort(), [
      'free',
      'paid_disabled',
      'paid_enabled',
    ]);
  });
});

// -----------------------------------------------------------------------------
// Microcopy presence
// -----------------------------------------------------------------------------

describe('PromptInspector microcopy — AI-016D additions', () => {
  const required = [
    'smokeFreeStateExplain',
    'smokePaidDisabledExplain',
    'smokePaidEnabledCta',
    'smokeSimulatedPlanLabel',
    'smokeSimulatedPlanHint',
    'smokeSimulatedPlanReset',
    'resultPanelEstimatedCreditsLabel',
    'resultPanelStatusLabel',
    'resultPanelStatusOk',
    'resultPanelStatusBlocked',
    'resultPanelStatusDryRun',
  ] as const;

  for (const k of required) {
    it(`FR has non-empty ${k}`, () => {
      const v = (PROMPT_INSPECTOR_FR as unknown as Record<string, unknown>)[k];
      assert.equal(typeof v, 'string');
      assert.ok((v as string).length > 0);
    });
    it(`EN has non-empty ${k}`, () => {
      const v = (PROMPT_INSPECTOR_EN as unknown as Record<string, unknown>)[k];
      assert.equal(typeof v, 'string');
      assert.ok((v as string).length > 0);
    });
  }
});

// -----------------------------------------------------------------------------
// Client-side payload + import hygiene
// -----------------------------------------------------------------------------

describe('PromptInspector.tsx — client-side hygiene', () => {
  const file = resolve(
    __dirname,
    '..',
    '..',
    '..',
    'components',
    'offer-workspace',
    'PromptInspector.tsx',
  );
  const src = readFileSync(file, 'utf8');

  it("starts with 'use client' directive", () => {
    assert.match(src, /^'use client';/);
  });

  it('never references the OpenAI API key env var', () => {
    assert.equal(src.includes('OPENAI_API_KEY'), false);
    assert.equal(src.includes('SOCIALBOOST_OPENAI_API_KEY'), false);
  });

  it('never references a NEXT_PUBLIC_OPENAI_* var', () => {
    assert.equal(/NEXT_PUBLIC_OPENAI/i.test(src), false);
  });

  it('never reads process.env at runtime from a client component', () => {
    // Strip line + block comments before scanning. The runtime code must
    // never reach into `process.env`; only docstrings may reference the
    // env-var names for documentation purposes.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    assert.equal(/process\.env/.test(stripped), false);
  });

  it('never imports the OpenAI adapter from a client component', () => {
    assert.equal(src.includes('openai-provider-adapter'), false);
    assert.equal(src.includes('provider-gateway'), false);
  });

  it('only sends non-secret fields in the run-prompt payload', () => {
    // The single fetch call must include exactly these keys and nothing
    // else that could be a key-shaped string.
    const payloadMatch = src.match(/JSON\.stringify\(\{([\s\S]*?)\}\)/);
    assert.ok(payloadMatch, 'expected a JSON.stringify payload');
    const body = payloadMatch![1]!;
    for (const allowed of [
      'promptVersion',
      'inspirations',
      'offer',
      'plan',
      'remainingCredits',
      'action',
    ]) {
      assert.match(body, new RegExp(allowed));
    }
    assert.equal(/api[_-]?key|apiKey|bearer|authorization/i.test(body), false);
  });
});
