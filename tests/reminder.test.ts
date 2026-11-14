import { describe, expect, it } from 'vitest';
import { reminderFor } from '../api/cron/reminder';
import { puzzleNumber } from '../src/lib/daily';

const sunday = puzzleNumber(Date.UTC(2026, 10, 15, 17)); // Sun 15 Nov 2026
const wednesday = puzzleNumber(Date.UTC(2026, 10, 18, 17));
const week = (from: number) => new Set(Array.from({ length: 7 }, (_, i) => from + 1 + i));

describe('desk reminders', () => {
  it('nudges any day when tomorrow has no approved puzzle', () => {
    const r = reminderFor(wednesday, new Set());
    expect(r?.title).toMatch(/Tomorrow/);
    expect(r?.body).toMatch(/6 more days/);
  });
  it('stays quiet on weekdays when tomorrow is ready', () => {
    const approved = new Set([wednesday + 1]);
    expect(reminderFor(wednesday, approved)).toBeNull();
  });
  it('sends a weekly summary on Sundays listing the gaps', () => {
    const approved = week(sunday);
    approved.delete(sunday + 3);
    approved.delete(sunday + 5);
    const r = reminderFor(sunday, approved);
    expect(r?.title).toBe('Puzzles for the week');
    expect(r?.body).toMatch(/^2 of the next 7 days need a puzzle: Wed, Fri\.$/);
  });
  it('says all set on Sundays when the week is full', () => {
    expect(reminderFor(sunday, week(sunday))?.title).toBe('All set for the week');
  });
});
