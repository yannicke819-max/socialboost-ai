/**
 * Run Offer Brain (mock) against the 5 ICP fixtures from evals/fixtures/.
 * Asserts business behaviors per ICP.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { runOfferBrain } from '../agent';

function clearEnv(): void {
  delete process.env.OFFER_BRAIN_USE_REAL_MODEL;
  delete process.env.ANTHROPIC_API_KEY;
}

const FIXTURES = {
  coachBusinessFR: {
    raw_offer_text:
      "Programme LinkedIn Pipeline 4 semaines — Tripler les RDV qualifiés en 30 jours pour les consultants solo, sans publicité.",
    locale: 'fr' as const,
    user_goal: 'sales' as const,
    current_offer_name: 'Programme LinkedIn Pipeline',
    current_price: 900,
    currency: 'EUR',
    target_customer: 'Consultants B2B solo, 1-3 ans expérience, présents sur LinkedIn',
    proof_points: [
      '47 RDV qualifiés générés sur la dernière cohorte',
      'Taux de signature 28% sur les RDV obtenus',
    ],
    desired_cta: 'Calendly audit-30min',
    target_platforms: ['linkedin', 'x'] as const,
  },
  consultantStrategyEN: {
    raw_offer_text:
      'Strategy Bootcamp — 6-week intensive for mid-career consultants. Real client work, weekly group review.',
    locale: 'en' as const,
    user_goal: 'sales' as const,
    current_offer_name: 'Strategy Bootcamp',
    current_price: 1200,
    currency: 'USD',
    target_customer:
      'Mid-career consultants, 5-10 years experience, wanting to upgrade to strategy advisory',
    proof_points: ['92 alumni since 2024', 'Average client billing rate up 40% post-bootcamp'],
    desired_cta: 'Cohort signup link',
  },
  ecommerceFashionIT: {
    raw_offer_text:
      'Black Friday Boutique — fino al -40% sulla nuova collezione moda donna italiana',
    locale: 'it' as const,
    user_goal: 'sales' as const,
    current_price: 80,
    currency: 'EUR',
    target_customer: 'Donne 25-45 anni, mercato italiano',
    target_platforms: ['instagram', 'tiktok'] as const,
  },
  infopreneurFormationES: {
    raw_offer_text:
      'Webinar gratuito sobre cómo monetizar tu expertise — 60 minutos en directo + Q&A',
    locale: 'es' as const,
    user_goal: 'leads' as const,
    desired_cta: 'Webinar registration page',
  },
  saasB2BFR: {
    raw_offer_text:
      "Productiv — gestionnaire de tâches IA pour solos et duos. Free trial 14 jours.",
    locale: 'fr' as const,
    user_goal: 'leads' as const,
    current_price: 29,
    currency: 'EUR',
    target_customer: "Solo entrepreneurs et duos d'associés, frustrés par Notion/Asana",
    desired_cta: 'Free trial signup',
  },
};

describe('Offer Brain — coach-business FR fixture', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('detects coaching offer + LinkedIn-first channels', async () => {
    const r = await runOfferBrain(FIXTURES.coachBusinessFR);
    assert.equal(r.metadata.source, 'mock');
    assert.equal(r.output.identification.offer_type, 'coaching');
    assert.ok(r.output.channels.best_channels.includes('linkedin'));
    assert.equal(r.output.channels.long_form_relevance, 'high');
  });

  it('proof points are reflected (not invented)', async () => {
    const r = await runOfferBrain(FIXTURES.coachBusinessFR);
    assert.ok(
      r.output.proofs.proof_points.includes('47 RDV qualifiés générés sur la dernière cohorte'),
    );
    assert.equal(r.output.proofs.proof_points.length, 2);
  });

  it('CTA is detected as strong (Calendly)', async () => {
    const r = await runOfferBrain(FIXTURES.coachBusinessFR);
    assert.equal(r.output.conversion.cta_strength, 'strong');
  });
});

describe('Offer Brain — consultant-strategy EN fixture', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('detects course + premium pricing', async () => {
    const r = await runOfferBrain(FIXTURES.consultantStrategyEN);
    assert.equal(r.output.identification.offer_type, 'course');
    assert.equal(r.output.positioning.price_positioning, 'premium');
  });

  it('LinkedIn channel recommended with rationale', async () => {
    const r = await runOfferBrain(FIXTURES.consultantStrategyEN);
    assert.ok(r.output.channels.best_channels.includes('linkedin'));
    assert.ok(r.output.channels.channel_rationale.linkedin);
  });
});

describe('Offer Brain — ecommerce-fashion IT fixture', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('recommends Instagram/TikTok for visual product', async () => {
    const r = await runOfferBrain(FIXTURES.ecommerceFashionIT);
    assert.ok(r.output.channels.best_channels.includes('instagram'));
    assert.ok(r.output.channels.best_channels.includes('tiktok'));
    assert.notEqual(r.output.channels.video_relevance, 'not-recommended');
    assert.equal(r.output.channels.carousel_relevance, 'high');
  });

  it('flags missing proofs', async () => {
    const r = await runOfferBrain(FIXTURES.ecommerceFashionIT);
    assert.equal(r.output.proofs.proof_quality, 'missing');
    assert.ok(r.output.intelligence.proof_score <= 40);
  });
});

describe('Offer Brain — infopreneur-formation ES fixture', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('detects webinar offer type', async () => {
    const r = await runOfferBrain(FIXTURES.infopreneurFormationES);
    assert.equal(r.output.identification.offer_type, 'webinar');
  });

  it('flags multiple missing data categories', async () => {
    const r = await runOfferBrain(FIXTURES.infopreneurFormationES);
    assert.ok(r.output.learning_signals.missing_data_categories.length > 0);
    assert.ok(r.output.learning_signals.missing_data_categories.includes('proof'));
  });
});

describe('Offer Brain — saas-b2b FR fixture', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('detects subscription business model', async () => {
    const r = await runOfferBrain(FIXTURES.saasB2BFR);
    assert.equal(r.output.identification.business_model, 'subscription');
  });

  it('produces ≤ 3 follow-up questions', async () => {
    const r = await runOfferBrain(FIXTURES.saasB2BFR);
    assert.ok(r.output.missing.recommended_followup_questions.length <= 3);
  });
});
