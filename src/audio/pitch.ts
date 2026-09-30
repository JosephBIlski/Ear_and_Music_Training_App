/**
 * Pitch detection using the McLeod Pitch Method (normalised square difference
 * function + parabolic interpolation). Robust for voice in the 70–1100 Hz range.
 */

export interface PitchResult {
  frequency: number; // Hz, 0 if none
  clarity: number; // 0..1
  rms: number;
}

export function detectPitch(buffer: Float32Array, sampleRate: number, opts: { minFreq?: number; maxFreq?: number; clarityThreshold?: number; rmsThreshold?: number } = {}): PitchResult {
  const minFreq = opts.minFreq ?? 65;
  const maxFreq = opts.maxFreq ?? 1200;
  const clarityThreshold = opts.clarityThreshold ?? 0.85;
  const rmsThreshold = opts.rmsThreshold ?? 0.01;
  const n = buffer.length;

  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += buffer[i] * buffer[i];
  const rms = Math.sqrt(sumSq / n);
  if (rms < rmsThreshold) return { frequency: 0, clarity: 0, rms };

  const maxTau = Math.min(n - 1, Math.floor(sampleRate / minFreq));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));

  // NSDF
  const nsdf = new Float32Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau++) {
    let acf = 0;
    let m = 0;
    for (let i = 0; i < n - tau; i++) {
      const a = buffer[i];
      const b = buffer[i + tau];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }

  // Peak picking: find key maxima between positive zero crossings.
  const maxima: number[] = [];
  let pos = minTau;
  // skip until first negative zero crossing
  while (pos < maxTau && nsdf[pos] > 0) pos++;
  while (pos < maxTau) {
    // find positive crossing
    while (pos < maxTau && nsdf[pos] <= 0) pos++;
    let bestIdx = -1;
    let bestVal = -Infinity;
    while (pos < maxTau && nsdf[pos] > 0) {
      if (nsdf[pos] > bestVal) {
        bestVal = nsdf[pos];
        bestIdx = pos;
      }
      pos++;
    }
    if (bestIdx > 0) maxima.push(bestIdx);
  }
  if (maxima.length === 0) return { frequency: 0, clarity: 0, rms };

  let highest = 0;
  for (const idx of maxima) highest = Math.max(highest, nsdf[idx]);
  const threshold = highest * 0.9; // pick the first maximum above k * highest (k=0.9 avoids octave errors)
  let chosen = -1;
  for (const idx of maxima) {
    if (nsdf[idx] >= threshold) {
      chosen = idx;
      break;
    }
  }
  if (chosen < 0) return { frequency: 0, clarity: 0, rms };

  // Parabolic interpolation around chosen
  let refined = chosen;
  if (chosen > 0 && chosen < maxTau) {
    const a = nsdf[chosen - 1];
    const b = nsdf[chosen];
    const c = nsdf[chosen + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) refined = chosen + (0.5 * (a - c)) / denom;
  }
  const clarity = nsdf[chosen];
  if (clarity < clarityThreshold) return { frequency: 0, clarity, rms };
  return { frequency: sampleRate / refined, clarity, rms };
}

export function centsOff(freq: number, targetFreq: number): number {
  return 1200 * Math.log2(freq / targetFreq);
}
