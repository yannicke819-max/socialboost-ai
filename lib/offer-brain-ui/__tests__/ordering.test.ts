import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sectionsForGoal, alternativeTones, ALL_TONES } from '../ordering';

describe('sectionsForGoal', () => {
  it('clarify_offer leads with summary + pain_points + offer_angles', () => {
    const s = sectionsForGoal('clarify_offer');
    assert.equal(s[0], 'summary');
    assert.equal(s[1], 'pain_points');
    assert.equal(s[2], 'offer_angles');
  });

  it('social_content leads with social_posts + hooks', () => {
    const s = sectionsForGoal('social_content');
    assert.equal(s[0], 'social_posts');
    assert.equal(s[1], 'hooks');
  });

  it('landing_page leads with landing_page_sections', () => {
    const s = sectionsForGoal('landing_page');
    assert.equal(s[0], 'landing_page_sections');
  });

  it('objections leads with objections + proof_points', () => {
    const s = sectionsForGoal('objections');
    assert.equal(s[0], 'objections');
    assert.equal(s[1], 'proof_points');
  });

  it('sales_angles leads with offer_angles + hooks', () => {
    const s = sectionsForGoal('sales_angles');
    assert.equal(s[0], 'offer_angles');
    assert.equal(s[1], 'hooks');
  });

  it('every goal returns all section ids exactly once', () => {
    const expected = [
      'summary',
      'pain_points',
      'hooks',
      'offer_angles',
      'objections',
      'ctas',
      'social_posts',
      'landing_page_sections',
      'proof_points',
      'warnings',
    ].sort();
    for (const goal of [
      'clarify_offer',
      'social_content',
      'landing_page',
      'objections',
      'sales_angles',
    ] as const) {
      const s = sectionsForGoal(goal).slice().sort();
      assert.deepEqual(s, expected, `goal=${goal}`);
    }
  });

  it('warnings always last regardless of goal', () => {
    for (const goal of [
      'clarify_offer',
      'social_content',
      'landing_page',
      'objections',
      'sales_angles',
    ] as const) {
      const s = sectionsForGoal(goal);
      assert.equal(s[s.length - 1], 'warnings', `goal=${goal}`);
    }
  });
});

describe('alternativeTones', () => {
  it('returns all tones except the current one', () => {
    for (const t of ALL_TONES) {
      const alts = alternativeTones(t);
      assert.equal(alts.length, ALL_TONES.length - 1);
      assert.equal(alts.includes(t), false);
    }
  });
});
