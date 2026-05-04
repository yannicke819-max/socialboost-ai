import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildActionablesMock } from '../mock';
import { ActionablesOutputSchema, type ActionablesV1Input } from '../schema';

const baseInput = (over: Partial<ActionablesV1Input> = {}): ActionablesV1Input => ({
  businessName: 'Atelier Nova',
  offer:
    "Accompagnement de 4 semaines pour aider les indépendants à clarifier leur offre et créer une page de vente simple.",
  targetAudience:
    'indépendants et consultants qui vendent des services mais peinent à formuler leur offre',
  tone: 'professional',
  language: 'fr',
  platforms: ['linkedin', 'email', 'landing_page'],
  proofPoints: ['Méthode testée sur 12 offres de consultants'],
  include_actionables: true,
  ...over,
});

describe('buildActionablesMock — FR baseline', () => {
  it('produces a schema-valid output', () => {
    const out = buildActionablesMock(baseInput());
    const parsed = ActionablesOutputSchema.safeParse(out);
    if (!parsed.success) {
      console.error(JSON.stringify(parsed.error.flatten(), null, 2));
    }
    assert.equal(parsed.success, true);
  });

  it('hooks ≥ 5, angles ≥ 3, objections ≥ 4, ctas ≥ 3', () => {
    const out = buildActionablesMock(baseInput());
    assert.ok(out.hooks.length >= 5);
    assert.ok(out.offer_angles.length >= 3);
    assert.ok(out.objections.length >= 4);
    assert.ok(out.ctas.length >= 3);
  });

  it('exactly 5 landing_page_sections in canonical order', () => {
    const out = buildActionablesMock(baseInput());
    assert.equal(out.landing_page_sections.length, 5);
    const sections = out.landing_page_sections.map((s) => s.section);
    assert.deepEqual(sections, ['hero', 'problem', 'solution', 'proof', 'cta']);
  });

  it('social_posts only on requested platforms (excluding landing_page)', () => {
    const out = buildActionablesMock(baseInput());
    const platforms = out.social_posts.map((p) => p.platform);
    assert.deepEqual(platforms.sort(), ['email', 'linkedin']);
    assert.ok(!platforms.includes('landing_page'));
  });

  it('echoes proofPoints in proof_points (no invention)', () => {
    const out = buildActionablesMock(baseInput());
    assert.deepEqual(out.proof_points, ['Méthode testée sur 12 offres de consultants']);
  });

  it('output is deterministic (same input → same content)', () => {
    const a = buildActionablesMock(baseInput());
    const b = buildActionablesMock(baseInput());
    // generated_at field is intentionally omitted from this schema; we still
    // compare by stripping any non-deterministic field defensively.
    const strip = (o: unknown): string => JSON.stringify(o);
    assert.equal(strip(a), strip(b));
  });
});

describe('buildActionablesMock — EN', () => {
  it('produces English content when language="en"', () => {
    const out = buildActionablesMock(baseInput({ language: 'en', targetAudience: 'freelancers and consultants who sell services' }));
    const parsed = ActionablesOutputSchema.safeParse(out);
    assert.equal(parsed.success, true);
    // No mixed FR/EN in EN-mode (allow proper nouns and platform names)
    const all = JSON.stringify(out);
    assert.equal(/Constat|cadre clair|Pensé pour/.test(all), false);
  });

  it('FR mode does not include EN core phrases', () => {
    const out = buildActionablesMock(baseInput({ language: 'fr' }));
    const all = JSON.stringify(out);
    assert.equal(/Cut to the truth|Built for|Without a clear frame/.test(all), false);
  });
});

describe('buildActionablesMock — proof gating', () => {
  it('caps confidence at 60 when no proofPoints', () => {
    const out = buildActionablesMock(baseInput({ proofPoints: undefined }));
    assert.ok(out.confidence_score <= 60);
    assert.equal(out.proof_points.length, 0);
    assert.ok(out.warnings.some((w) => /proofPoints|preuve/i.test(w)));
  });

  it('emits a warning if targetAudience is too short or missing', () => {
    const out = buildActionablesMock(baseInput({ targetAudience: undefined }));
    assert.ok(out.warnings.some((w) => /targetAudience|audience/i.test(w)));
  });
});

describe('buildActionablesMock — tone variations', () => {
  it('different tones produce different outputs', () => {
    const a = buildActionablesMock(baseInput({ tone: 'professional' }));
    const b = buildActionablesMock(baseInput({ tone: 'bold' }));
    const c = buildActionablesMock(baseInput({ tone: 'friendly' }));
    const d = buildActionablesMock(baseInput({ tone: 'premium' }));
    const set = new Set([JSON.stringify(a), JSON.stringify(b), JSON.stringify(c), JSON.stringify(d)]);
    assert.equal(set.size, 4, 'tones should produce 4 distinct outputs');
  });
});

describe('buildActionablesMock — platforms', () => {
  it('falls back to linkedin+email when platforms is empty', () => {
    const out = buildActionablesMock(baseInput({ platforms: undefined }));
    const platforms = out.social_posts.map((p) => p.platform);
    assert.deepEqual(platforms.sort(), ['email', 'linkedin']);
  });

  it('respects an instagram+facebook request', () => {
    const out = buildActionablesMock(
      baseInput({ platforms: ['instagram', 'facebook'] }),
    );
    const platforms = out.social_posts.map((p) => p.platform);
    assert.deepEqual(platforms.sort(), ['facebook', 'instagram']);
  });

  it('emits no social_posts if only landing_page requested', () => {
    const out = buildActionablesMock(baseInput({ platforms: ['landing_page'] }));
    assert.equal(out.social_posts.length, 0);
  });
});

describe('buildActionablesMock — length caps', () => {
  it('respects platform body caps', () => {
    const out = buildActionablesMock(baseInput({ platforms: ['linkedin', 'email', 'instagram', 'facebook'] }));
    for (const post of out.social_posts) {
      const cap = ({ linkedin: 3000, instagram: 2200, facebook: 2000, email: 1200 } as Record<string, number>)[post.platform];
      assert.ok(cap !== undefined);
      assert.ok(post.post.length <= cap, `${post.platform}: ${post.post.length} > ${cap}`);
    }
  });
});
