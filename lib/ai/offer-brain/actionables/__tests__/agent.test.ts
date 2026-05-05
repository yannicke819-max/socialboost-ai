import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runOfferBrainV1 } from '../agent';
import { OfferBrainAgentError } from '../../errors';
import { ActionablesOutputSchema } from '../schema';

describe('runOfferBrainV1', () => {
  it('returns diagnostic + actionables on a valid v1 input', async () => {
    const result = await runOfferBrainV1({
      businessName: 'Atelier Nova',
      offer:
        "Accompagnement de 4 semaines pour aider les indépendants à clarifier leur offre et créer une page de vente simple.",
      targetAudience: 'indépendants',
      language: 'fr',
      platforms: ['linkedin', 'email'],
      proofPoints: ['Méthode testée sur 12 offres de consultants'],
    });
    assert.ok(result.diagnostic);
    assert.ok(result.actionables);
    const parsed = ActionablesOutputSchema.safeParse(result.actionables);
    assert.equal(parsed.success, true);
    assert.equal(result.metadata.diagnostic_source, 'mock');
    assert.equal(result.metadata.actionables_source, 'mock');
  });

  it('returns diagnostic only when include_actionables=false', async () => {
    const result = await runOfferBrainV1({
      businessName: 'X',
      offer: 'Une offre minimale qui doit produire un diagnostic complet pour le test.',
      include_actionables: false,
    });
    assert.ok(result.diagnostic);
    assert.equal(result.actionables, undefined);
    assert.equal(result.metadata.actionables_source, null);
  });

  it('includes actionables by default (include_actionables omitted)', async () => {
    const result = await runOfferBrainV1({
      businessName: 'X',
      offer: 'Une offre minimale qui doit produire un diagnostic complet pour le test.',
    });
    assert.ok(result.actionables);
  });

  it('throws OfferBrainAgentError(code=invalid_input) on missing businessName', async () => {
    await assert.rejects(
      runOfferBrainV1({ offer: 'something' }),
      (e: unknown) => e instanceof OfferBrainAgentError && (e as OfferBrainAgentError).code === 'invalid_input',
    );
  });

  it('throws OfferBrainAgentError(code=invalid_input) on missing offer', async () => {
    await assert.rejects(
      runOfferBrainV1({ businessName: 'X' }),
      (e: unknown) => e instanceof OfferBrainAgentError && (e as OfferBrainAgentError).code === 'invalid_input',
    );
  });

  it('throws on invalid tone', async () => {
    await assert.rejects(
      runOfferBrainV1({ businessName: 'X', offer: 'something', tone: 'aggressive' }),
      OfferBrainAgentError,
    );
  });

  it('handles EN input end-to-end', async () => {
    const result = await runOfferBrainV1({
      businessName: 'Nova Studio',
      offer: 'A 4-week program helping consultants articulate their offer and ship a simple sales page.',
      targetAudience: 'consultants who sell services',
      language: 'en',
      platforms: ['linkedin'],
      proofPoints: ['Tested on 12 consultant offers'],
    });
    assert.ok(result.actionables);
    assert.equal(result.actionables!.confidence_score >= 0, true);
    // FR phrasing should not leak in EN mode
    const all = JSON.stringify(result.actionables);
    assert.equal(/Pensé pour|cadre clair/.test(all), false);
  });
});
