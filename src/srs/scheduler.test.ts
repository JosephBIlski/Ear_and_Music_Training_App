import { describe, expect, it } from 'vitest';
import { newItem, updateItem, selectionWeights, recentAccuracy, isDue } from './scheduler';

describe('srs scheduler', () => {
  it('grows interval on correct streaks and resets on misses', () => {
    const now = 1_000_000;
    let it = newItem('deg:major:7', now);
    it = updateItem(it, true, 1500, now);
    expect(it.streak).toBe(1);
    expect(it.intervalDays).toBeLessThanOrEqual(0.5);
    it = updateItem(it, true, 1500, now);
    it = updateItem(it, true, 1500, now);
    expect(it.intervalDays).toBeGreaterThan(0.5);
    expect(it.due).toBeGreaterThan(now);
    it = updateItem(it, false, 3000, now + 10);
    expect(it.streak).toBe(0);
    expect(it.intervalDays).toBe(0);
    expect(isDue(it, now + 10)).toBe(true);
    expect(recentAccuracy(it)).toBeCloseTo(0.75);
  });

  it('weights weak, due and requeued items higher and avoids immediate repeats', () => {
    const now = 5_000_000;
    const strong = { ...newItem('a', now), attempts: 10, correct: 10, recent: [1, 1, 1, 1, 1, 1], due: now + 86_400_000 };
    const weak = { ...newItem('b', now), attempts: 10, correct: 3, recent: [0, 0, 1, 0, 0, 1], due: now };
    const items = { a: strong, b: weak };
    const w = selectionWeights(['a', 'b', 'c'], items, { history: [], requeue: [], now });
    expect(w[1]).toBeGreaterThan(w[0]);
    expect(w[2]).toBeGreaterThan(w[0]); // unseen gets novelty bonus
    const w2 = selectionWeights(['a', 'b'], items, { history: ['b'], requeue: [], now });
    expect(w2[1]).toBeLessThan(w[1]);
    const w3 = selectionWeights(['a', 'b'], items, { history: [], requeue: ['a'], now });
    expect(w3[0]).toBeGreaterThan(w[0]);
  });
});
