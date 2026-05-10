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
  buildFreePromptPack,
  FREE_PROMPT_FORMATS,
} from '../free-prompt-generator';
import {
  buildExpertPrompt,
  type PromptVersion,
} from '../prompt-orchestrator';
import {
  PROMPT_INSPECTOR_EN,
  PROMPT_INSPECTOR_FR,
} from '../prompt-inspector-labels';
import { type Offer } from '../types';

const NOW = '2026-05-04T00:00:00Z';

function makeOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 'ofr_costs',
    name: 'Atelier Nova',
    status: 'draft',
    goal: 'social_content',
    language: over.language ?? 'fr',
    brief: over.brief ?? {
      businessName: 'Atelier Nova',
      offer: "Programme de 4 semaines.",
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

function buildSamplePrompt(): PromptVersion {
  return buildExpertPrompt({ offer: makeOffer(), task: 'user_advice' });
}

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
    'mock:dry-run',
  ];
  for (const key of required) {
    it(`includes ${key}`, () => {
      assert.ok(AI_MODEL_PRICING[key], `${key} missing from pricing table`);
    });
  }

  it('opus has automaticSelectionAllowed=false (NEVER auto)', () => {
    assert.equal(AI_MODEL_PRICING['anthropic:claude-opus-4.6']!.automaticSelectionAllowed, false);
  });

  it('mock:dry-run has automaticSelectionAllowed=true and zero cost', () => {
    const mock = AI_MODEL_PRICING['mock:dry-run']!;
    assert.equal(mock.automaticSelectionAllowed, true);
    assert.equal(mock.inputUsdPerMillion, 0);
    assert.equal(mock.outputUsdPerMillion, 0);
  });

  it('sonnet is tagged premium', () => {
    assert.equal(AI_MODEL_PRICING['anthropic:claude-sonnet-4.6']!.qualityTier, 'premium');
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
    assert.equal(e.action, 'full_campaign_pack');
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

  it('safetyMultiplier increases the cost monotonically', () => {
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
    assert.equal(lo.safetyMultiplier, 1);
    assert.equal(hi.safetyMultiplier, 5);
  });

  it('action minimum credits floor is respected (mock:dry-run uses zero USD but informative credits)', () => {
    const e = estimateAiActionCost({
      action: 'user_advice',
      provider: 'mock',
      model: 'dry-run',
    });
    assert.equal(e.estimatedUsd, 0);
    assert.equal(e.estimatedCredits, ACTION_MINIMUM_CREDITS.user_advice);
    assert.ok(e.notes.includes('mock_dry_run_no_admin_cost'));
  });

  it('mock:dry-run on full_campaign_pack still surfaces minimum credit floor', () => {
    const e = estimateAiActionCost({
      action: 'full_campaign_pack',
      provider: 'mock',
      model: 'dry-run',
    });
    assert.equal(e.estimatedUsd, 0);
    assert.equal(e.estimatedCredits, ACTION_MINIMUM_CREDITS.full_campaign_pack);
  });

  it('credits-are-a-product-unit note is always present (UX safeguard)', () => {
    const e = estimateAiActionCost({
      action: 'ad_generation',
      provider: 'openai',
      model: 'gpt-4.1-mini',
    });
    assert.ok(e.notes.includes('credits_are_a_product_unit_not_tokens'));
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

  it('opus is never auto-allowed (expert_never_auto) on every plan', () => {
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
  it('Free always returns mock:dry-run across every action × every quality mode', () => {
    for (const action of [
      'ad_generation',
      'offer_diagnosis',
      'ad_critique',
      'full_campaign_pack',
      'external_inspiration_analysis',
    ] as SocialBoostAction[]) {
      for (const mode of ['economy', 'balanced', 'premium'] as const) {
        const r = selectRecommendedModel({ action, plan: 'free', qualityMode: mode });
        assert.equal(r.provider, 'mock', `free/${mode}/${action} provider must be mock`);
        assert.equal(r.model, 'dry-run', `free/${mode}/${action} model must be dry-run`);
        assert.equal(r.qualityTier, 'economy');
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

  it('external_inspiration_analysis defaults to economy even on pro+ premium', () => {
    for (const plan of ['pro', 'business', 'agency'] as SocialBoostPlan[]) {
      const r = selectRecommendedModel({
        action: 'external_inspiration_analysis',
        plan,
        qualityMode: 'premium',
      });
      assert.equal(r.qualityTier, 'economy', `${plan} inspiration should stay economy`);
      assert.notEqual(r.model, 'claude-sonnet-4.6');
    }
  });

  it('opus is NEVER selected automatically across every plan × mode × action', () => {
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
// decideAiExecution — Free hard rule
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
    assert.equal(d.freePromptPackAllowed, true);
    assert.equal(d.reason, 'free_prompt_pack_only');
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

  it('free + hasUserProvidedApiKey → mode=byok reserved for future, providerCallAllowed=false', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 100,
      action: 'ad_generation',
      hasUserProvidedApiKey: true,
    });
    assert.equal(d.allowed, true);
    assert.equal(d.mode, 'byok');
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.reason, 'byok_reserved_for_future');
    assert.equal(d.freePromptPackAllowed, true);
  });

  it('providerFlagEnabled=true does NOT escape the Free hard rule', () => {
    const d = decideAiExecution({
      plan: 'free',
      remainingCredits: 999_999_999,
      action: 'ad_generation',
      providerFlagEnabled: true,
    });
    assert.equal(d.providerCallAllowed, false);
    assert.equal(d.adminCostAllowed, false);
    assert.equal(d.mode, 'dry_run');
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
      assert.equal(d.freePromptPackAllowed, true, `${action} should allow Free Prompt Pack`);
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
    assert.equal(d.freePromptPackAllowed, true);
  });

  it('starter with zero credits → blocked insufficient_credits', () => {
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

  it('estimatedCredits override: very large → over_action_cap on starter', () => {
    const d = decideAiExecution({
      plan: 'starter',
      remainingCredits: 1000,
      action: 'ad_generation',
      estimatedCredits: 500, // > starter.maxCreditsPerAction (100)
    });
    assert.equal(d.allowed, false);
    assert.equal(d.reason, 'over_action_cap');
  });

  it('pro premium for high-stakes action → allowed', () => {
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
// PLAN_QUOTAS sanity
// -----------------------------------------------------------------------------

describe('PLAN_QUOTAS — AI-016A revised values', () => {
  it('free has zero credits and zero output tokens (Prompt Pack only)', () => {
    assert.equal(PLAN_QUOTAS.free.monthlyCredits, 0);
    assert.equal(PLAN_QUOTAS.free.maxCreditsPerAction, 0);
    assert.equal(PLAN_QUOTAS.free.maxOutputTokensPerRun, 0);
    assert.equal(PLAN_QUOTAS.free.freePromptPackAllowed, true);
  });

  it('every plan exposes freePromptPackAllowed=true (Prompt Pack universal fallback)', () => {
    for (const plan of ['free', 'starter', 'pro', 'business', 'agency'] as SocialBoostPlan[]) {
      assert.equal(PLAN_QUOTAS[plan].freePromptPackAllowed, true);
    }
  });

  it('expertModelsAllowed is false on every plan (opus never auto)', () => {
    for (const plan of ['free', 'starter', 'pro', 'business', 'agency'] as SocialBoostPlan[]) {
      assert.equal(PLAN_QUOTAS[plan].expertModelsAllowed, false);
    }
  });

  it('business + agency have overageAllowed=true and hardCapEnabled=true', () => {
    assert.equal(PLAN_QUOTAS.business.overageAllowed, true);
    assert.equal(PLAN_QUOTAS.agency.overageAllowed, true);
    assert.equal(PLAN_QUOTAS.business.hardCapEnabled, true);
    assert.equal(PLAN_QUOTAS.agency.hardCapEnabled, true);
  });

  it('credits / max-per-action increase monotonically (starter < pro < business < agency)', () => {
    const order: SocialBoostPlan[] = ['starter', 'pro', 'business', 'agency'];
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
// Free Prompt Generator
// -----------------------------------------------------------------------------

describe('buildFreePromptPack — invariants', () => {
  const v = buildSamplePrompt();

  it('always returns providerCallAllowed=false and adminCostAllowed=false', () => {
    for (const format of FREE_PROMPT_FORMATS) {
      const pack = buildFreePromptPack({ promptVersion: v, format });
      assert.equal(pack.providerCallAllowed, false);
      assert.equal(pack.adminCostAllowed, false);
      assert.equal(pack.mode, 'free_prompt_pack');
    }
  });

  it('every format includes the "no model launched" notice', () => {
    for (const format of FREE_PROMPT_FORMATS) {
      const pack = buildFreePromptPack({ promptVersion: v, format });
      assert.match(
        pack.copyablePrompt,
        /Aucun modèle IA n'a été lancé par SocialBoost en mode gratuit\./,
        `${format} missing the "no model launched" notice`,
      );
    }
  });

  it('every format includes the "ready to paste" notice', () => {
    for (const format of FREE_PROMPT_FORMATS) {
      const pack = buildFreePromptPack({ promptVersion: v, format });
      assert.match(
        pack.copyablePrompt,
        /prêt à coller dans ton assistant IA préféré/i,
        `${format} missing the "ready to paste" notice`,
      );
    }
  });

  it('NO format contains chain-of-thought directives (<thinking>, "step by step")', () => {
    for (const format of FREE_PROMPT_FORMATS) {
      const pack = buildFreePromptPack({ promptVersion: v, format });
      assert.equal(/<thinking>/i.test(pack.copyablePrompt), false, `${format} contains <thinking>`);
      assert.equal(
        /chain[\s-]of[\s-]thought/i.test(pack.copyablePrompt),
        false,
        `${format} requests chain-of-thought`,
      );
    }
  });

  it('generic_markdown contains systemPrompt + userPrompt + expectedOutput + guardrails', () => {
    const pack = buildFreePromptPack({ promptVersion: v, format: 'generic_markdown' });
    assert.ok(pack.copyablePrompt.includes(v.systemPrompt.split('\n')[0]!));
    assert.ok(pack.copyablePrompt.includes(v.userPrompt.split('\n')[0]!));
    assert.match(pack.copyablePrompt, /## Sortie attendue/);
    assert.match(pack.copyablePrompt, /## Garde-fous/);
    assert.match(pack.copyablePrompt, /## Checklist qualité/);
  });

  it('claude_xml uses descriptive XML tags', () => {
    const pack = buildFreePromptPack({ promptVersion: v, format: 'claude_xml' });
    assert.match(pack.copyablePrompt, /<socialboost_prompt>/);
    assert.match(pack.copyablePrompt, /<role>/);
    assert.match(pack.copyablePrompt, /<context>/);
    assert.match(pack.copyablePrompt, /<task>/);
    assert.match(pack.copyablePrompt, /<expected_output>/);
    assert.match(pack.copyablePrompt, /<guardrails>/);
    assert.match(pack.copyablePrompt, /<\/socialboost_prompt>/);
  });

  it('chatgpt_markdown places Instructions section first', () => {
    const pack = buildFreePromptPack({ promptVersion: v, format: 'chatgpt_markdown' });
    const instructionsIdx = pack.copyablePrompt.indexOf('### Instructions');
    const userIdx = pack.copyablePrompt.indexOf('### Prompt utilisateur');
    assert.ok(instructionsIdx >= 0);
    assert.ok(userIdx > instructionsIdx, 'Instructions must come before Prompt utilisateur');
    assert.equal(/<socialboost_prompt>/.test(pack.copyablePrompt), false);
  });

  it('gemini_structured contains Objectif / Contexte / Contraintes / Étapes / Format / Critères', () => {
    const pack = buildFreePromptPack({ promptVersion: v, format: 'gemini_structured' });
    assert.match(pack.copyablePrompt, /## Objectif/);
    assert.match(pack.copyablePrompt, /## Contexte/);
    assert.match(pack.copyablePrompt, /## Contraintes/);
    assert.match(pack.copyablePrompt, /## Étapes de travail/);
    assert.match(pack.copyablePrompt, /## Format de sortie/);
    assert.match(pack.copyablePrompt, /## Critères qualité/);
  });

  it('recommendedModelLabel matches the format', () => {
    const pairs: Record<string, RegExp> = {
      generic_markdown: /Compatible avec Claude, ChatGPT, Gemini ou Mistral/,
      claude_xml: /Optimisé pour Claude/,
      chatgpt_markdown: /Optimisé pour ChatGPT/,
      gemini_structured: /Optimisé pour Gemini/,
    };
    for (const format of FREE_PROMPT_FORMATS) {
      const pack = buildFreePromptPack({ promptVersion: v, format });
      assert.match(pack.recommendedModelLabel, pairs[format]!);
    }
  });
});

// -----------------------------------------------------------------------------
// Hygiene
// -----------------------------------------------------------------------------

describe('hygiene — pure modules', () => {
  it('isKnownModel works as expected', () => {
    assert.equal(isKnownModel('openai', 'gpt-4.1-mini'), true);
    assert.equal(isKnownModel('mock', 'dry-run'), true);
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

  it('determinism — same input → identical Free Prompt Pack', () => {
    const v = buildSamplePrompt();
    const a = buildFreePromptPack({ promptVersion: v, format: 'claude_xml' });
    const b = buildFreePromptPack({ promptVersion: v, format: 'claude_xml' });
    assert.deepEqual(a, b);
  });
});

// -----------------------------------------------------------------------------
// Inspector microcopy — Free-mode block
// -----------------------------------------------------------------------------

describe('PromptInspector Free-mode microcopy', () => {
  it('FR has the expected Free-mode strings', () => {
    assert.equal(PROMPT_INSPECTOR_FR.freeModeBadge, 'Mode gratuit');
    assert.match(
      PROMPT_INSPECTOR_FR.freeModeBody,
      /SocialBoost prépare ton brief IA expert, sans lancer de modèle payant/,
    );
    assert.equal(PROMPT_INSPECTOR_FR.freeModeNoAdminCost, "Aucun coût IA n'est généré.");
    assert.match(
      PROMPT_INSPECTOR_FR.freeModeNoModelLaunched,
      /Aucun modèle IA n'a été lancé par SocialBoost en mode gratuit\./,
    );
    assert.equal(PROMPT_INSPECTOR_FR.freeModeCopyGeneric, 'Copier le brief IA');
    assert.equal(PROMPT_INSPECTOR_FR.freeModeCopyClaude, 'Copier format Claude');
    assert.equal(PROMPT_INSPECTOR_FR.freeModeCopyChatGpt, 'Copier format ChatGPT');
  });

  it('EN mirrors the FR shape', () => {
    assert.equal(PROMPT_INSPECTOR_EN.freeModeBadge, 'Free mode');
    assert.equal(PROMPT_INSPECTOR_EN.freeModeCopyGeneric, 'Copy AI brief');
    assert.equal(PROMPT_INSPECTOR_EN.freeModeCopyClaude, 'Copy Claude format');
    assert.equal(PROMPT_INSPECTOR_EN.freeModeCopyChatGpt, 'Copy ChatGPT format');
  });
});
