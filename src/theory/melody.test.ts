import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateMelody } from './melody';
import { resetRandomSource, seeded, setRandomSource } from './random';

describe('generateMelody', () => {
  beforeEach(() => setRandomSource(seeded(7)));
  afterEach(() => resetRandomSource());

  it('respects length, range, degree set and max leap', () => {
    for (let i = 0; i < 50; i++) {
      const m = generateMelody({ tonic: 60, mode: 'major', degrees: [0, 2, 4, 5, 7], length: 6, low: 60, high: 72, maxLeap: 4, startOnTonic: true });
      expect(m.length).toBe(6);
      expect(m[0].degree).toBe(0);
      for (const n of m) {
        expect(n.midi).toBeGreaterThanOrEqual(60);
        expect(n.midi).toBeLessThanOrEqual(72);
        expect([0, 2, 4, 5, 7]).toContain(n.degree);
      }
      for (let k = 1; k < m.length; k++) expect(Math.abs(m[k].midi - m[k - 1].midi)).toBeLessThanOrEqual(4);
    }
  });

  it('resolves chromatic passing tones by step', () => {
    for (let i = 0; i < 50; i++) {
      const m = generateMelody({ tonic: 62, mode: 'major', degrees: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], length: 8, low: 55, high: 74, maxLeap: 7, chromaticAsPassing: true });
      for (let k = 1; k < m.length; k++) {
        const prevChromatic = ![0, 2, 4, 5, 7, 9, 11].includes(m[k - 1].degree);
        if (prevChromatic) expect(Math.abs(m[k].midi - m[k - 1].midi)).toBeLessThanOrEqual(2);
      }
    }
  });
});
