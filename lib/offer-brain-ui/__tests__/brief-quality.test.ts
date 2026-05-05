import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeBriefQuality } from '../brief-quality';

describe('computeBriefQuality — readiness', () => {
  it('not ready without businessName', () => {
    const q = computeBriefQuality({ businessName: '', offer: 'A complete offer description that is long enough.' });
    assert.equal(q.readyToGenerate, false);
  });

  it('not ready without offer', () => {
    const q = computeBriefQuality({ businessName: 'X', offer: '' });
    assert.equal(q.readyToGenerate, false);
  });

  it('ready with businessName + non-empty offer', () => {
    const q = computeBriefQuality({ businessName: 'X', offer: 'short offer' });
    assert.equal(q.readyToGenerate, true);
  });
});

describe('computeBriefQuality — per criterion', () => {
  it('all missing on empty draft', () => {
    const q = computeBriefQuality({ businessName: '', offer: '' });
    assert.equal(q.perCriterion.offer, 'missing');
    assert.equal(q.perCriterion.audience, 'missing');
    assert.equal(q.perCriterion.proofs, 'missing');
    assert.equal(q.perCriterion.platforms, 'missing');
    assert.equal(q.perCriterion.goal, 'missing');
    assert.equal(q.score, 0);
  });

  it('partial offer when too short', () => {
    const q = computeBriefQuality({ businessName: 'X', offer: 'too short' });
    assert.equal(q.perCriterion.offer, 'partial');
  });

  it('ok offer when ≥ 60 chars', () => {
    const q = computeBriefQuality({
      businessName: 'X',
      offer: 'A reasonably detailed offer description that crosses the threshold.',
    });
    assert.equal(q.perCriterion.offer, 'ok');
  });

  it('partial proofs when single short proof', () => {
    const q = computeBriefQuality({
      businessName: 'X',
      offer: 'long enough offer description for an ok rating, definitely.',
      proofPoints: ['short'],
    });
    assert.equal(q.perCriterion.proofs, 'partial');
  });

  it('ok proofs when at least one substantial proof', () => {
    const q = computeBriefQuality({
      businessName: 'X',
      offer: 'long enough offer description for an ok rating, definitely.',
      proofPoints: ['Tested on 12 consultant offers over 3 months'],
    });
    assert.equal(q.perCriterion.proofs, 'ok');
  });

  it('partial platforms when only one platform', () => {
    const q = computeBriefQuality({
      businessName: 'X',
      offer: 'long enough offer description for an ok rating, definitely.',
      platforms: ['linkedin'],
    });
    assert.equal(q.perCriterion.platforms, 'partial');
  });

  it('ok platforms when ≥ 2', () => {
    const q = computeBriefQuality({
      businessName: 'X',
      offer: 'long enough offer description for an ok rating, definitely.',
      platforms: ['linkedin', 'email'],
    });
    assert.equal(q.perCriterion.platforms, 'ok');
  });
});

describe('computeBriefQuality — score', () => {
  it('full draft scores 100', () => {
    const q = computeBriefQuality({
      businessName: 'X',
      offer: 'A reasonably detailed offer description that crosses the threshold.',
      targetAudience: 'consultants who sell services',
      proofPoints: ['Tested on 12 consultant offers over 3 months'],
      platforms: ['linkedin', 'email'],
      goal: 'clarify_offer',
    });
    assert.equal(q.score, 100);
  });

  it('partial offer + nothing else scores around 17 (35 weight × 0.5)', () => {
    const q = computeBriefQuality({ businessName: 'X', offer: 'short' });
    // 35 * 0.5 = 17.5 → 18 after rounding (Math.round(17.5) = 18 in JS? actually 18, banker's not used; Math.round rounds .5 up)
    assert.ok(q.score >= 17 && q.score <= 18);
  });
});

describe('computeBriefQuality — hint', () => {
  it('first non-ok criterion drives the hint', () => {
    const q = computeBriefQuality({ businessName: 'X', offer: '' });
    assert.ok(q.hint);
    assert.match(q.hint!, /Décrivez votre offre/);
  });

  it('returns null when everything is ok', () => {
    const q = computeBriefQuality({
      businessName: 'X',
      offer: 'A reasonably detailed offer description that crosses the threshold.',
      targetAudience: 'consultants who sell services',
      proofPoints: ['Tested on 12 consultant offers over 3 months'],
      platforms: ['linkedin', 'email'],
      goal: 'clarify_offer',
    });
    assert.equal(q.hint, null);
  });

  it('returns EN hint when language=en', () => {
    const q = computeBriefQuality({ businessName: 'X', offer: '' }, 'en');
    assert.match(q.hint!, /Describe your offer/);
  });
});
