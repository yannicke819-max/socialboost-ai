import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_MINIMUM_CREDITS,
  ACTION_TOKEN_BUDGETS,
  AI_MODEL_PRICING,
  PLAN_QUOTAS,
  canRunAiAction,
  estimateAiActionCost,
  selectRecommendedModel,
  type SocialBoostAction,
  type SocialBoostPlan,
} from '../ai-cost-model';
import {
  decideAiExecution,
  isKnownModel,
} from '../ai-entitlements';
import {
  PROMPT_INSPECTOR_FR,
  PROMPT_INSPECTOR_EN,
} from '../prompt-inspector-labels';

// -----------------------------------------------------------------------------
// Pricing table
// -----------------------------------------------------------------------------

describe('AI_MODEL_PRICING — required entries are present', () => {
  const required = [
    'openai:gpt-4.1-mini',
    'google:gemini-2.5-flash',
    'mistral:mistral-medium-3',
    'anthropic:claude-haiku-4.5',
    'anthropic:claude-sonnet-4.6',
    'anthropic:claude-opus-4.6',
  ];
  for (const key of required) {
    it(`includes ${key}`, () => {
      assert.ok(AI_MODEL_PRICING[key], `${key} missing from pricing table`);
    });
  }

  it('opus is tagged expert (never auto-routed)', () => {
    assert.equal(AI_MODEL_PRICING['anthropic:claude-opus-4.6']!.qualityTier, 'expert');
  });

  it('sonnet is tagged premium', () => {
    assert.equal(AI_MODEL_PRICING['anthropic:claude-sonnet-4.6']!.qualityTier, 'premium');
  });

  it('gpt-4.1-mini is tagged economy', () => {
    assert.equal(AI_MODEL_PRICING['openai:gpt-4.1-mini']!.qualityTier, 'economy');
  });
});

// -----------------------------------------------------------------------------
// estimateAiActionCost
// -----------------------------------------------------------------------------

describe('estimateAiActionCost', () => {
  it('full_campaign_pack on gpt-4.1-mini computes a USD cost > 0', () => {
    const e = estimateAiActionCost({
      action: 'full_campaign_pack',
      provider: 'openai',
      model: 'gpt-4.1-mini',
    });
    assert.ok(e.estimatedUsd > 0);
    assert.ok(e.inputTokens >= ACTION_TOKEN_BUDGETS.full_campaign_pack.input * 3);
    assert.ok(e.outputTokens >= ACTION_TOKEN_BUDGETS.full_campaign_pack.output * 3);
    assert.ok(e.estimatedCredits >= ACTION_MINIMUM_CREDITS.full_campaign_pack);
  });

  it('Sonnet costs more than gpt-4.1-mini for the same action', () => {
    const a = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'openai',
      model: 'gpt-4.1-mini',
    });
    const b = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'anthropic',
      model: 'claude-sonnet-4.6',
    });
    assert.ok(b.estimatedUsd > a.estimatedUsd, 'Sonnet must cost more than gpt-4.1-mini');
    assert.ok(b.estimatedCredits > a.estimatedCredits);
  });

  it('safetyMultiplier increases the cost', () => {
    const lo = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      safetyMultiplier: 1,
    });
    const hi = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      safetyMultiplier: 5,
    });
    assert.ok(hi.estimatedUsd > lo.estimatedUsd * 4);
  });

  it('action minimum credits floor is respected', () => {
    // user_advice on gemini-flash — extremely cheap, should clamp to 3.
    const e = estimateAiActionCost({
      action: 'user_advice',
      provider: 'google',
      model: 'gemini-2.5-flash',
      safetyMultiplier: 1,
    });
    assert.equal(e.estimatedCredits >= ACTION_MINIMUM_CREDITS.user_advice, true);
  });

  it('unknown model returns a high-risk safe estimate', () => {
    const e = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'openai',
      model: 'gpt-9000-not-a-thing',
    });
    assert.equal(e.riskLevel, 'high');
    assert.ok(e.notes.some((n) => n.startsWith('unknown_model:')));
  });
});

// -----------------------------------------------------------------------------
// canRunAiAction
// -----------------------------------------------------------------------------

describe('canRunAiAction — caps + quotas', () => {
  it('free blocks an action that exceeds maxCreditsPerAction', () => {
    const r = canRunAiAction({
      plan: 'free',
      remainingCredits: 100,
      estimatedCredits: 50, // > free.maxCreditsPerAction (25)
      action: 'ad_generation',
      requestedModel: 'gpt-4.1-mini',
      requestedProvider: 'openai',
    });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'over_action_cap');
  });

  it('starter blocks a premium model (sonnet) — premium not allowed', () => {
    const r = canRunAiAction({
      plan: 'starter',
      remainingCredits: 1000,
      estimatedCredits: 30,
      action: 'ad_generation',
      requestedModel: 'claude-sonnet-4.6',
      requestedProvider: 'anthropic',
    });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'premium_not_allowed');
  });

  it('pro allows premium when within the action cap', () => {
    const r = canRunAiAction({
      plan: 'pro',
      remainingCredits: 4000,
      estimatedCredits: 200,
      action: 'ad_critique',
      requestedModel: 'claude-sonnet-4.6',
      requestedProvider: 'anthropic',
    });
    assert.equal(r.allowed, true);
    assert.equal(r.remainingAfter, 3800);
  });

  it('opus is never auto-allowed (expert_never_auto)', () => {
    for (const plan of ['free', 'starter', 'pro', 'business', 'agency'] as SocialBoostPlan[]) {
      const r = canRunAiAction({
        plan,
        remainingCredits: 100_000,
        estimatedCredits: 200,
        action: 'full_campaign_pack',
        requestedModel: 'claude-opus-4.6',
        requestedProvider: 'anthropic',
      });
      assert.equal(r.allowed, false, `${plan} should block opus`);
      assert.equal(r.reason, 'expert_never_auto');
      assert.equal(r.suggestedDowngradeModel, 'claude-sonnet-4.6');
    }
  });

  it('blocks when remainingCredits < estimatedCredits on hard-cap plans', () => {
    const r = canRunAiAction({
      plan: 'starter',
      remainingCredits: 5,
      estimatedCredits: 50,
      action: 'ad_generation',
      requestedModel: 'gpt-4.1-mini',
      requestedProvider: 'openai',
    });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'insufficient_credits');
  });
});

// -----------------------------------------------------------------------------
// selectRecommendedModel
// -----------------------------------------------------------------------------

describe('selectRecommendedModel', () => {
  it('free always returns an economy model', () => {
    for (const action of [
      'ad_generation',
      'offer_diagnosis',
      'ad_critique',
      'full_campaign_pack',
    ] as SocialBoostAction[]) {
      for (const mode of ['economy', 'balanced', 'premium'] as const) {
        const r = selectRecommendedModel({ action, plan: 'free', qualityMode: mode });
        assert.equal(r.qualityTier, 'economy', `free/${mode}/${action} must stay economy`);
      }
    }
  });

  it('starter premium is downgraded to standard (haiku)', () => {
    const r = selectRecommendedModel({
      action: 'ad_critique',
      plan: 'starter',
      qualityMode: 'premium',
    });
    assert.equal(r.qualityTier, 'standard');
    assert.equal(r.model, 'claude-haiku-4.5');
  });

  it('pro premium for high-stakes actions returns Sonnet', () => {
    const r = selectRecommendedModel({
      action: 'offer_diagnosis',
      plan: 'pro',
      qualityMode: 'premium',
    });
    assert.equal(r.model, 'claude-sonnet-4.6');
    assert.equal(r.qualityTier, 'premium');
  });

  it('opus is NEVER selected automatically', () => {
    for (const plan of ['free', 'starter', 'pro', 'business', 'agency'] as SocialBoostPlan[]) {
      for (const mode of ['economy', 'balanced', 'premium'] as const) {
        for (const action of [
          'ad_generation',
          'offer_diagnosis',
          'full_campaign_pack',
        ] as SocialBoostAction[]) {
          const r = selectRecommendedModel({ action, plan, qualityMode: mode });
          assert.notEqual(r.model, 'claude-opus-4.6', `${plan}/${mode}/${action} returned opus`);
        }
      }
    }
  });
});

// -----------------------------------------------------------------------------
// decideAiExecution — Free-mode hard rule
// -----------------------------------------------------------------------------

describe('decideAiExecution — Free plan never reaches a real provider', () => {
  it('free without user key → mode=dry_run, providerCallAllowed=false, adminCostAllowed=false', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 100,
      action: 'ad_generation',
    });
    assert.equal(d.allowed, true, 'free can prepare a brief — allowed=true');
    assert.equal(d.mode, 'dry_run');
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.reason, 'free_plan_dry_run_only');
    assert.equal(d.suggestedUpgradePlan, 'starter');
  });

  it('free does NOT consume remaining credits (remainingAfter undefined)', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 50,
      action: 'ad_generation',
    });
    assert.equal(d.remainingCredits, 50);
    assert.equal(d.remainingAfter, undefined);
  });

  it('free + hasUserProvidedApiKey → still dry_run (BYOK not yet supported)', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 100,
      action: 'ad_generation',
      hasUserProvidedApiKey: true,
    });
    assert.equal(d.allowed, true);
    assert.equal(d.mode, 'dry_run');
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.reason, 'byok_not_yet_supported');
  });

  it('free even with a high credit balance never gets providerCallAllowed=true', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 999_999_999,
      action: 'ad_generation',
    });
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
  });

  it('free invariant holds across every action', () => {
    const actions: SocialBoostAction[] = [
      'offer_diagnosis',
      'external_inspiration_analysis',
      'angle_discovery',
      'post_ideas',
      'ad_generation',
      'ad_critique',
      'ad_improvement',
      'weekly_plan',
      'user_advice',
      'full_campaign_pack',
    ];
    for (const action of actions) {
      const d = decideAiExecution({ plan: 'free', remainingCredits: 100, action });
      assert.equal(d.providerCallAllowed, false, `${action} leaks provider for free`);
      assert.equal(d.adminCostAllowed, false, `${action} would charge admin for free`);
    }
  });
});

describe('decideAiExecution — paid plans', () => {
  it('starter with enough credits → mode=included_credits, providerCallAllowed=true, adminCostAllowed=true', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 1000,
      action: 'user_advice',
    });
    assert.equal(d.allowed, true);
    assert.equal(d.mode, 'included_credits');
    assert.equal(d.providerCallAllowed, true);
    assert.equal(d.adminCostAllowed, true);
    assert.equal(d.reason, 'allowed_included_credits');
  });

  it('starter with zero credits → blocked insufficient_credits, providerCallAllowed=false', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 0,
      action: 'ad_generation',
    });
    assert.equal(d.allowed, false);
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.reason, 'insufficient_credits');
  });

  it('pro with premium model on high-stakes action → allowed', () => {
    const d = decideAiExecution({
      plan: 'pro',
      remainingCredits: 4000,
      action: 'offer_diagnosis',
      requestedProvider: 'anthropic',
      requestedModel: 'claude-sonnet-4.6',
    });
    assert.equal(d.allowed, true);
    assert.equal(d.providerCallAllowed, true);
    assert.equal(d.adminCostAllowed, true);
  });

  it('starter requesting opus → blocked expert_never_auto', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 1000,
      action: 'full_campaign_pack',
      requestedProvider: 'anthropic',
      requestedModel: 'claude-opus-4.6',
    });
    assert.equal(d.allowed, false);
    assert.equal(d.reason, 'expert_never_auto');
  });

  it('starter requesting sonnet → blocked premium_not_allowed + suggests pro', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 1000,
      action: 'ad_critique',
      requestedProvider: 'anthropic',
      requestedModel: 'claude-sonnet-4.6',
    });
    assert.equal(d.allowed, false);
    assert.equal(d.reason, 'premium_not_allowed');
    assert.equal(d.suggestedUpgradePlan, 'pro');
  });
});

// -----------------------------------------------------------------------------
// Plan quota table sanity
// -----------------------------------------------------------------------------

describe('PLAN_QUOTAS', () => {
  it('free has hardCap=true and premiumModelsAllowed=false', () => {
    assert.equal(PLAN_QUOTAS.free.hardCapEnabled, true);
    assert.equal(PLAN_QUOTAS.free.premiumModelsAllowed, false);
  });

  it('agency has the highest monthly credit ceiling', () => {
    const planList: SocialBoostPlan[] = ['free', 'starter', 'pro', 'business', 'agency'];
    const max = planList.reduce(
      (acc, p) => Math.max(acc, PLAN_QUOTAS[p].monthlyCredits),
      0,
    );
    assert.equal(max, PLAN_QUOTAS.agency.monthlyCredits);
  });

  it('credits / max-per-action increase monotonically (free < starter < pro < business < agency)', () => {
    const order: SocialBoostPlan[] = ['free', 'starter', 'pro', 'business', 'agency'];
    for (let i = 1; i < order.length; i++) {
      assert.ok(
        PLAN_QUOTAS[order[i]!].monthlyCredits > PLAN_QUOTAS[order[i - 1]!].monthlyCredits,
      );
      assert.ok(
        PLAN_QUOTAS[order[i]!].maxCreditsPerAction > PLAN_QUOTAS[order[i - 1]!].maxCreditsPerAction,
      );
    }
  });
});

// -----------------------------------------------------------------------------
// Hygiene
// -----------------------------------------------------------------------------

describe('hygiene — pure modules', () => {
  it('isKnownModel works as expected', () => {
    assert.equal(isKnownModel('openai', 'gpt-4.1-mini'), true);
    assert.equal(isKnownModel('openai', 'gpt-9000'), false);
  });

  it('determinism — same input → identical estimate', () => {
    const a = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'openai',
      model: 'gpt-4.1-mini',
    });
    const b = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'openai',
      model: 'gpt-4.1-mini',
    });
    assert.deepEqual(a, b);
  });

  it('determinism — same input → identical decision', () => {
    const input = {
      plan: 'pro' as const,
      remainingCredits: 4000,
      action: 'ad_generation' as const,
    };
    const a = decideAiExecution(input);
    const b = decideAiExecution(input);
    assert.deepEqual(a, b);
  });
});

// -----------------------------------------------------------------------------
// Inspector microcopy — Free-mode block
// -----------------------------------------------------------------------------

describe('PromptInspector Free-mode microcopy', () => {
  it('FR has the expected Free-mode strings', () => {
    assert.equal(PROMPT_INSPECTOR_FR.freeModeBadge, 'Mode gratuit');
    assert.match(PROMPT_INSPECTOR_FR.freeModeBody, /Mode gratuit/);
    assert.match(PROMPT_INSPECTOR_FR.freeModeBody, /sans lancer de modèle payant/);
    assert.equal(PROMPT_INSPECTOR_FR.freeModeUpgradeCta, 'Passer en Starter pour générer automatiquement');
  });

  it('EN mirrors the FR shape', () => {
    assert.equal(PROMPT_INSPECTOR_EN.freeModeBadge, 'Free mode');
    assert.match(PROMPT_INSPECTOR_EN.freeModeBody, /Free mode/);
    assert.equal(PROMPT_INSPECTOR_EN.freeModeUpgradeCta, 'Upgrade to Starter to generate automatically');
  });
});
