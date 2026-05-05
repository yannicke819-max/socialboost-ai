import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAntiInvention, checkPlatformsRespected } from '../invariants';
import type { ActionablesOutput, ActionablesV1Input } from '../schema';

const safeOutput = (over: Partial<ActionablesOutput> = {}): ActionablesOutput => ({
  schema_version: '1.0.0',
  offer_summary: 'Atelier Nova propose un accompagnement de 4 semaines pour clarifier l\'offre.',
  target_audience: 'indépendants',
  pain_points: ['Difficulté à formuler une offre claire'],
  value_proposition: 'Atelier Nova aide les indépendants à clarifier leur offre.',
  proof_points: ['Méthode testée sur 12 offres'],
  objections: [
    { objection: 'Trop cher', response: 'Comparer le coût d\'inaction' },
    { objection: 'Pas le temps', response: 'Format conçu pour une vraie semaine de travail' },
    { objection: 'Comment savoir', response: 'Vous testez court avant d\'engager' },
    { objection: 'Déjà essayé', response: 'La différence c\'est la séquence' },
  ],
  offer_angles: [
    { name: 'Clarté', angle: 'Avant scale, on rend l\'offre lisible.', best_for: 'consultants' },
    { name: 'Friction', angle: 'On enlève les obstacles à la décision.', best_for: 'indépendants' },
    { name: 'Statu quo', angle: 'Le coût caché s\'accumule.', best_for: 'consultants' },
  ],
  hooks: [
    { type: 'pain', text: 'Pourquoi votre message ne convertit pas' },
    { type: 'curiosity', text: 'Ce que personne ne dit sur cette offre' },
    { type: 'identity', text: 'Pour les indépendants qui savent ce qu\'ils font' },
    { type: 'contrarian', text: 'À contre-courant : moins de canaux, plus de clarté' },
    { type: 'before_after', text: 'Avant : flou. Après : un cadre clair.' },
  ],
  ctas: [
    { label: 'Recevoir le récap', intent: 'awareness' },
    { label: 'Voir comment ça marche', intent: 'consideration' },
    { label: 'Réserver un créneau', intent: 'decision' },
  ],
  social_posts: [],
  landing_page_sections: [
    { section: 'hero', headline: 'Atelier Nova', body: 'Pour les indépendants.' },
    { section: 'problem', headline: 'Le coût silencieux', body: 'Statu quo coûteux.' },
    { section: 'solution', headline: 'Ce qui change', body: 'Cadre court, mesurable.' },
    { section: 'proof', headline: 'Mesuré', body: 'Référence : Méthode testée sur 12 offres.' },
    { section: 'cta', headline: 'Réserver un créneau', body: 'Prochaine étape claire.' },
  ],
  confidence_score: 75,
  confidence_rationale: 'Mock déterministe avec preuves.',
  warnings: [],
  ...over,
});

const baseInput: ActionablesV1Input = {
  businessName: 'Atelier Nova',
  offer:
    "Accompagnement de 4 semaines pour aider les indépendants à clarifier leur offre.",
  targetAudience: 'indépendants et consultants',
  language: 'fr',
  proofPoints: ['Méthode testée sur 12 offres'],
};

describe('checkAntiInvention', () => {
  it('returns no warning on safe output', () => {
    const w = checkAntiInvention(safeOutput(), baseInput);
    assert.equal(w.length, 0);
  });

  it('flags an invented metric not present in input (e.g. "x3")', () => {
    const tainted = safeOutput();
    tainted.hooks[0]!.text = 'Triplez vos résultats x3 en 7 jours';
    const w = checkAntiInvention(tainted, baseInput);
    assert.ok(w.some((m) => /Métrique non vérifiable/.test(m)));
  });

  it('flags a percentage not present in input', () => {
    const tainted = safeOutput();
    tainted.value_proposition = 'Augmentez votre conversion de 47%';
    const w = checkAntiInvention(tainted, baseInput);
    assert.ok(w.some((m) => /Métrique non vérifiable/.test(m)));
  });

  it('does NOT flag a metric that came from input.proofPoints', () => {
    const inputWithMetric = { ...baseInput, proofPoints: ['12 offres testées'] };
    const out = safeOutput();
    out.proof_points = ['12 offres testées'];
    const w = checkAntiInvention(out, inputWithMetric);
    assert.equal(w.filter((m) => /Métrique non vérifiable/.test(m)).length, 0);
  });

  it('flags an invented testimonial pattern ("Marc D.")', () => {
    const tainted = safeOutput();
    tainted.hooks[0]!.text = '« Marc D. a doublé son CA »';
    const w = checkAntiInvention(tainted, baseInput);
    assert.ok(w.some((m) => /Témoignage à vérifier/.test(m)));
  });

  it('does NOT flag "Pour Indépendants" (preposition + capitalized noun, false positive)', () => {
    const tainted = safeOutput();
    tainted.landing_page_sections[0]!.body = 'Pour Indépendants. Cadre clair, étapes mesurables.';
    const w = checkAntiInvention(tainted, baseInput);
    assert.equal(w.filter((m) => /Témoignage à vérifier/.test(m)).length, 0);
  });

  it('does NOT flag "For Consultants" in EN (preposition + capitalized noun)', () => {
    const enInput = { ...baseInput, language: 'en' as const };
    const tainted = safeOutput();
    tainted.landing_page_sections[0]!.body = 'For Consultants. Clear frame, measurable steps.';
    const w = checkAntiInvention(tainted, enInput);
    assert.equal(w.filter((m) => /unverified testimonial/i.test(m)).length, 0);
  });

  it('flags an absolute risk-free claim in FR not in input', () => {
    const tainted = safeOutput();
    tainted.value_proposition = 'Résultats garantis sans risque sur 30 jours.';
    const w = checkAntiInvention(tainted, baseInput);
    assert.ok(w.some((m) => /Promesse absolue/.test(m)));
  });

  it('flags an absolute risk-free claim in EN not in input', () => {
    const enInput = { ...baseInput, language: 'en' as const };
    const tainted = safeOutput();
    tainted.value_proposition = 'Guaranteed risk-free results.';
    const w = checkAntiInvention(tainted, enInput);
    assert.ok(w.some((m) => /Absolute claim/.test(m)));
  });
});

describe('checkPlatformsRespected', () => {
  it('returns nothing when no platforms requested', () => {
    const out = safeOutput();
    out.social_posts = [{ platform: 'linkedin', post: 'x', cta: 'y' }];
    const w = checkPlatformsRespected(out, { ...baseInput, platforms: undefined });
    assert.equal(w.length, 0);
  });

  it('returns nothing when posts respect requested platforms', () => {
    const out = safeOutput();
    out.social_posts = [{ platform: 'linkedin', post: 'x', cta: 'y' }];
    const w = checkPlatformsRespected(out, { ...baseInput, platforms: ['linkedin', 'email'] });
    assert.equal(w.length, 0);
  });

  it('flags a post on a non-requested platform', () => {
    const out = safeOutput();
    out.social_posts = [{ platform: 'instagram', post: 'x', cta: 'y' }];
    const w = checkPlatformsRespected(out, { ...baseInput, platforms: ['linkedin'] });
    assert.ok(w.some((m) => /platform_off_scope/.test(m)));
  });
});
