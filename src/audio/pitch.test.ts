import { describe, expect, it } from 'vitest';
import { detectPitch, centsOff } from './pitch';

function tone(freq: number, sampleRate: number, n: number, harmonics = 3): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h <= harmonics; h++) v += Math.sin((2 * Math.PI * freq * h * i) / sampleRate) / h;
    out[i] = v * 0.3;
  }
  return out;
}

describe('detectPitch', () => {
  const sr = 48000;
  it('detects a voice-range tone within a few cents', () => {
    for (const f of [110, 146.8, 220, 329.6, 440, 660]) {
      const res = detectPitch(tone(f, sr, 2048), sr);
      expect(res.frequency).toBeGreaterThan(0);
      expect(Math.abs(centsOff(res.frequency, f))).toBeLessThan(8);
      expect(res.clarity).toBeGreaterThan(0.9);
    }
  });
  it('returns no pitch for silence or noise', () => {
    expect(detectPitch(new Float32Array(2048), sr).frequency).toBe(0);
    const noise = new Float32Array(2048).map(() => (Math.random() - 0.5) * 0.5);
    expect(detectPitch(noise, sr).frequency).toBe(0);
  });
});
