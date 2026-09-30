import { describe, expect, it } from 'vitest';
import { fingerprint, mergeData, mergeHistory, mergeProgress, mergeSrs, type SyncData } from './merge';
import { newItem } from '../srs/scheduler';
import { DEFAULT_SETTINGS } from '../store/useStore';

const base = (): SyncData => ({ settings: { ...DEFAULT_SETTINGS }, settingsUpdatedAt: 0, srs: {}, progress: {}, history: [], confusions: {}, daily: null });

describe('sync merge', () => {
  it('merges srs items: newer wins, counts never shrink', () => {
    const a = { ...newItem('deg:major:7', 1000), attempts: 5, correct: 4, lastSeen: 1000, streak: 4 };
    const b = { ...newItem('deg:major:7', 2000), attempts: 3, correct: 1, lastSeen: 2000, streak: 0 };
    const m = mergeSrs({ 'deg:major:7': a }, { 'deg:major:7': b, 'int:asc:4': newItem('int:asc:4') });
    expect(m['deg:major:7'].streak).toBe(0); // from b (newer)
    expect(m['deg:major:7'].attempts).toBe(5);
    expect(m['deg:major:7'].correct).toBe(4);
    expect(m['int:asc:4']).toBeDefined();
    // idempotent & symmetric
    expect(mergeSrs(m, m)).toEqual(m);
    expect(mergeSrs({ 'deg:major:7': b }, { 'deg:major:7': a })['deg:major:7']).toEqual(m['deg:major:7']);
  });

  it('merges progress with passed = OR and best = max', () => {
    const m = mergeProgress(
      { degrees: { d1: { attempts: 2, bestAccuracy: 0.8, lastAccuracy: 0.8, passed: false, lastAt: 10 } } },
      { degrees: { d1: { attempts: 1, bestAccuracy: 0.95, lastAccuracy: 0.95, passed: true, lastAt: 20 } }, intervals: { i1: { attempts: 1, bestAccuracy: 1, lastAccuracy: 1, passed: true, lastAt: 5 } } },
    );
    expect(m.degrees.d1).toEqual({ attempts: 2, bestAccuracy: 0.95, lastAccuracy: 0.95, passed: true, lastAt: 20 });
    expect(m.intervals.i1.passed).toBe(true);
  });

  it('unions history by id and sorts', () => {
    const h1 = { id: 'a', at: 2, moduleId: 'degrees', mode: 'test' as const, questions: 5, correct: 4, durationSec: 30 };
    const h2 = { id: 'b', at: 1, moduleId: 'degrees', mode: 'test' as const, questions: 5, correct: 5, durationSec: 30 };
    const m = mergeHistory([h1], [h2, h1]);
    expect(m.map((h) => h.id)).toEqual(['b', 'a']);
  });

  it('takes settings from the more recently changed side and detects changes by fingerprint', () => {
    const local = base();
    local.settings.dailyMinutes = 20;
    local.settingsUpdatedAt = 100;
    const remote = base();
    remote.settings.dailyMinutes = 30;
    remote.settingsUpdatedAt = 200;
    const m = mergeData(local, remote);
    expect(m.settings.dailyMinutes).toBe(30);
    expect(fingerprint(m)).not.toBe(fingerprint(local));
    expect(fingerprint(mergeData(m, remote))).toBe(fingerprint(m));
  });
});
