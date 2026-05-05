/**
 * Targeted regression tests for AI-007 polish round 2:
 *  - no ".." artifacts anywhere in actionables
 *  - value_proposition uses correct FR article + preserves audience case
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildActionablesMock } from '../mock';
import type { ActionablesV1Input } from '../schema';

const baseInput = (over: Partial<ActionablesV1Input> = {}): ActionablesV1Input => ({
  businessName: 'Atelier Nova',
  offer: 'Programme 4 semaines pour clarifier votre offre et créer une page de vente simple.',
  targetAudience: 'Indépendants B2B qui vendent des services',
  language: 'fr',
  platforms: ['linkedin', 'email'],
  proofPoints: ['Méthode testée sur 12 offres'],
  ...over,
});

describe('AI-007 polish — no double periods', () => {
  it('serialized FR actionables contain zero ".." artifacts', () => {
    const out = buildActionablesMock(baseInput());
    const serialized = JSON.stringify(out);
    assert.equal(serialized.match(/\.\./g)?.length ?? 0, 0);
  });

  it('serialized EN actionables contain zero ".." artifacts', () => {
    const out = buildActionablesMock(
      baseInput({ language: 'en', targetAudience: 'B2B consultants who sell services' }),
    );
    const serialized = JSON.stringify(out);
    assert.equal(serialized.match(/\.\./g)?.length ?? 0, 0);
  });

  it('"Réduction de friction" angle ends with single period after closing', () => {
    const out = buildActionablesMock(baseInput());
    const angle = out.offer_angles.find((a) => a.name === 'Réduction de friction');
    assert.ok(angle);
    assert.doesNotMatch(angle.angle, /\.\./);
    // closing should still be present at the end of the angle text
    assert.match(angle.angle, /Cadre clair, étapes mesurables\.$/);
  });

  it('every tone variant produces no ".." in any string', () => {
    for (const tone of ['professional', 'bold', 'friendly', 'premium'] as const) {
      const out = buildActionablesMock(baseInput({ tone }));
      const serialized = JSON.stringify(out);
      assert.equal(serialized.match(/\.\./g)?.length ?? 0, 0, `tone=${tone}`);
    }
  });
});

describe('AI-007 polish — value_proposition formulation', () => {
  it('FR prepends "les " when audience has no article', () => {
    const out = buildActionablesMock(baseInput());
    assert.match(out.value_proposition, /aide les /);
  });

  it('FR preserves uppercase tokens like "B2B"', () => {
    const out = buildActionablesMock(baseInput());
    assert.match(out.value_proposition, /\bB2B\b/);
  });

  it('FR lowercases only the first character of audience', () => {
    const out = buildActionablesMock(baseInput({ targetAudience: 'Indépendants B2B' }));
    // Expect "aide les indépendants B2B" — first letter lowercase, B2B preserved
    assert.match(out.value_proposition, /aide les indépendants B2B/);
  });

  it('FR does NOT add a duplicate article when audience already starts with "les "', () => {
    const out = buildActionablesMock(
      baseInput({ targetAudience: "Les indépendants B2B qui vendent des services" }),
    );
    // No "aide les Les" or "aide les les"
    assert.doesNotMatch(out.value_proposition, /aide les les /i);
  });

  it('FR fallback when audience missing → "aide son audience"', () => {
    const out = buildActionablesMock(baseInput({ targetAudience: undefined }));
    assert.match(out.value_proposition, /aide son audience/);
  });

  it('EN preserves audience as typed (no leading article)', () => {
    const out = buildActionablesMock(
      baseInput({
        language: 'en',
        targetAudience: 'B2B consultants who sell services',
        offer: 'A 4-week program to clarify your offer.',
      }),
    );
    assert.match(out.value_proposition, /helps b2B|helps b2b/i); // first-letter lowered, "B" stays uppercase otherwise
    assert.match(out.value_proposition, /B2B|b2B/);
  });

  it('EN fallback when audience missing → "helps its audience"', () => {
    const out = buildActionablesMock(
      baseInput({ language: 'en', targetAudience: undefined, offer: 'A 4-week program.' }),
    );
    assert.match(out.value_proposition, /helps its audience/);
  });
});
