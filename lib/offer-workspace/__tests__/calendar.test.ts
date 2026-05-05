import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isoDate,
  startOfWeekMonday,
  weekDays,
  groupSlotsByDay,
  generateSlotDrafts,
  daysUntil,
  nextPlannedSlot,
} from '../calendar';
import type { CalendarSlot } from '../types';

describe('isoDate / startOfWeekMonday / weekDays', () => {
  it('isoDate returns Y-M-D UTC', () => {
    assert.equal(isoDate(new Date('2026-05-05T23:00:00Z')), '2026-05-05');
  });

  it('startOfWeekMonday returns Monday for any day-of-week', () => {
    // 2026-05-05 is a Tuesday
    const d = new Date('2026-05-05T12:00:00Z');
    const mon = startOfWeekMonday(d);
    assert.equal(isoDate(mon), '2026-05-04');
  });

  it('startOfWeekMonday on a Sunday returns the previous Monday', () => {
    // 2026-05-10 is a Sunday
    const d = new Date('2026-05-10T12:00:00Z');
    assert.equal(isoDate(startOfWeekMonday(d)), '2026-05-04');
  });

  it('weekDays returns 7 consecutive ISO dates', () => {
    const start = new Date('2026-05-04T00:00:00Z');
    const days = weekDays(start);
    assert.deepEqual(days, [
      '2026-05-04',
      '2026-05-05',
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
      '2026-05-09',
      '2026-05-10',
    ]);
  });
});

describe('groupSlotsByDay', () => {
  it('bins slots into the right day', () => {
    const start = new Date('2026-05-04T00:00:00Z');
    const slots: CalendarSlot[] = [
      { id: 's1', offerId: 'o', channel: 'linkedin', scheduledAt: '2026-05-05T10:00:00Z', status: 'planned', createdAt: '2026-05-04T00:00:00Z' },
      { id: 's2', offerId: 'o', channel: 'email', scheduledAt: '2026-05-05T17:00:00Z', status: 'planned', createdAt: '2026-05-04T00:00:00Z' },
      { id: 's3', offerId: 'o', channel: 'linkedin', scheduledAt: '2026-05-08T08:00:00Z', status: 'sent_mock', createdAt: '2026-05-04T00:00:00Z' },
      { id: 's4', offerId: 'o', channel: 'linkedin', scheduledAt: '2026-05-20T08:00:00Z', status: 'planned', createdAt: '2026-05-04T00:00:00Z' }, // outside week
    ];
    const map = groupSlotsByDay(slots, start);
    assert.equal(map['2026-05-04']!.length, 0);
    assert.equal(map['2026-05-05']!.length, 2);
    assert.equal(map['2026-05-08']!.length, 1);
    assert.equal(map['2026-05-10']!.length, 0);
    // out-of-week slot dropped
    assert.equal(Object.values(map).flat().length, 3);
  });
});

describe('generateSlotDrafts', () => {
  it('returns `count` drafts spread across the week', () => {
    const start = new Date('2026-05-04T00:00:00Z');
    const drafts = generateSlotDrafts({
      offerId: 'o',
      channel: 'linkedin',
      weekStart: start,
      count: 3,
    });
    assert.equal(drafts.length, 3);
    for (const d of drafts) {
      assert.equal(d.status, 'planned');
      assert.equal(d.channel, 'linkedin');
      assert.match(d.scheduledAt, /^2026-05-/);
    }
    // First slot is on the start day
    assert.equal(drafts[0]!.scheduledAt.slice(0, 10), '2026-05-04');
  });

  it('caps at 7 even if count > 7', () => {
    const start = new Date('2026-05-04T00:00:00Z');
    const drafts = generateSlotDrafts({ offerId: 'o', channel: 'x', weekStart: start, count: 99 });
    assert.ok(drafts.length <= 7);
  });
});

describe('daysUntil + nextPlannedSlot', () => {
  it('daysUntil returns 0 for today', () => {
    const ref = new Date('2026-05-05T08:00:00Z');
    const slot = '2026-05-05T18:00:00Z';
    assert.equal(daysUntil(slot, ref), 0);
  });
  it('daysUntil returns negative for past', () => {
    const ref = new Date('2026-05-05T08:00:00Z');
    assert.equal(daysUntil('2026-05-03T18:00:00Z', ref), -2);
  });

  it('nextPlannedSlot picks the earliest planned slot >= ref', () => {
    const ref = new Date('2026-05-05T00:00:00Z');
    const slots: CalendarSlot[] = [
      { id: '1', offerId: 'o', channel: 'a', scheduledAt: '2026-05-04T00:00:00Z', status: 'planned', createdAt: 'x' },
      { id: '2', offerId: 'o', channel: 'a', scheduledAt: '2026-05-08T00:00:00Z', status: 'planned', createdAt: 'x' },
      { id: '3', offerId: 'o', channel: 'a', scheduledAt: '2026-05-06T00:00:00Z', status: 'cancelled', createdAt: 'x' },
      { id: '4', offerId: 'o', channel: 'a', scheduledAt: '2026-05-07T00:00:00Z', status: 'planned', createdAt: 'x' },
    ];
    const next = nextPlannedSlot(slots, ref);
    assert.equal(next?.id, '4');
  });

  it('nextPlannedSlot returns undefined when nothing planned in the future', () => {
    const ref = new Date('2026-12-01T00:00:00Z');
    const slots: CalendarSlot[] = [
      { id: '1', offerId: 'o', channel: 'a', scheduledAt: '2026-05-04T00:00:00Z', status: 'planned', createdAt: 'x' },
    ];
    assert.equal(nextPlannedSlot(slots, ref), undefined);
  });
});
