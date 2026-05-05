/**
 * Calendar helpers — pure date math + filtering for the workspace UI.
 *
 * No I/O. No package. Mock-only — slots never trigger any real publishing.
 */

import type { CalendarSlot } from './types';

/** Returns the ISO Y-M-D (UTC) for a date. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC start-of-week (Monday). */
export function startOfWeekMonday(d: Date): Date {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  const day = t.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  t.setUTCDate(t.getUTCDate() - diff);
  return t;
}

/** UTC start-of-month (day 1). */
export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Returns the 7-day range starting from `weekStart` as ISO Y-M-D strings. */
export function weekDays(weekStart: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    out.push(isoDate(d));
  }
  return out;
}

/** Group slots into 7 bins for a given week. */
export function groupSlotsByDay(
  slots: CalendarSlot[],
  weekStart: Date,
): Record<string, CalendarSlot[]> {
  const days = weekDays(weekStart);
  const map: Record<string, CalendarSlot[]> = Object.fromEntries(
    days.map((d) => [d, [] as CalendarSlot[]]),
  );
  for (const s of slots) {
    const key = s.scheduledAt.slice(0, 10);
    if (key in map) map[key]!.push(s);
  }
  return map;
}

/** Generate `count` slot drafts spread across a week, deterministic per offerId. */
export function generateSlotDrafts(input: {
  offerId: string;
  channel: string;
  weekStart: Date;
  count: number;
  assetId?: string;
}): Array<Omit<CalendarSlot, 'id' | 'createdAt'>> {
  const { offerId, channel, weekStart, count, assetId } = input;
  const out: Array<Omit<CalendarSlot, 'id' | 'createdAt'>> = [];
  // Spread evenly Mon..Sun
  const stride = Math.max(1, Math.floor(7 / Math.max(1, count)));
  for (let i = 0; i < count && i < 7; i++) {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + i * stride);
    out.push({
      offerId,
      assetId,
      channel,
      scheduledAt: day.toISOString(),
      status: 'planned',
    });
  }
  return out;
}

/** Days remaining (negative if past) until a slot's scheduled date. */
export function daysUntil(scheduledAt: string, ref: Date = new Date()): number {
  const r = new Date(ref);
  r.setUTCHours(0, 0, 0, 0);
  const s = new Date(scheduledAt);
  s.setUTCHours(0, 0, 0, 0);
  return Math.round((s.getTime() - r.getTime()) / (24 * 60 * 60 * 1000));
}

/** Returns the next planned slot (status='planned') with the earliest date ≥ start-of-`ref`-day (UTC). */
export function nextPlannedSlot(slots: CalendarSlot[], ref: Date = new Date()): CalendarSlot | undefined {
  const startOfRefDay = new Date(ref);
  startOfRefDay.setUTCHours(0, 0, 0, 0);
  const refMs = startOfRefDay.getTime();
  return slots
    .filter((s) => s.status === 'planned' && new Date(s.scheduledAt).getTime() >= refMs)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
}
