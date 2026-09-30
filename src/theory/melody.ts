import { pick, rand, chance, randInt, weightedPick } from './random';
import { degreeOf, type Mode, scaleFor } from './notes';

export interface MelodyNote {
  midi: number;
  degree: number; // 0..11 relative to tonic
  duration: number; // in beats
}

export interface MelodyOptions {
  tonic: number;
  mode: Mode;
  /** allowed degrees (0..11) */
  degrees: number[];
  length: number;
  /** lowest & highest allowed midi */
  low: number;
  high: number;
  /** maximum leap in semitones between consecutive notes */
  maxLeap: number;
  /** probability of a stepwise motion vs a leap (0..1) */
  stepBias?: number;
  /** start on tonic */
  startOnTonic?: boolean;
  /** end on a stable note (do/mi/so) */
  endStable?: boolean;
  rhythm?: 'even' | 'simple' | 'varied' | 'syncopated';
  /** chromatic notes may only appear as passing tones between diatonic notes */
  chromaticAsPassing?: boolean;
}

/** All midi notes in [low, high] whose degree is in the allowed set. */
export function candidatePitches(tonic: number, degrees: number[], low: number, high: number): number[] {
  const out: number[] = [];
  for (let m = low; m <= high; m++) if (degrees.includes(degreeOf(m, tonic))) out.push(m);
  return out;
}

const RHYTHM_POOLS: Record<NonNullable<MelodyOptions['rhythm']>, { values: number[]; weights: number[] }> = {
  even: { values: [1], weights: [1] },
  simple: { values: [1, 2, 0.5], weights: [6, 2, 1] },
  varied: { values: [0.5, 1, 1.5, 2], weights: [4, 5, 2, 2] },
  syncopated: { values: [0.5, 1, 1.5, 0.75, 0.25], weights: [4, 3, 2, 2, 1] },
};

export function generateMelody(opts: MelodyOptions): MelodyNote[] {
  const { tonic, mode, low, high, length } = opts;
  const stepBias = opts.stepBias ?? 0.7;
  const scale = scaleFor(mode);
  const diatonicDegrees = opts.degrees.filter((d) => scale.includes(d));
  const pool = candidatePitches(tonic, opts.degrees, low, high);
  const diatonicPool = candidatePitches(tonic, diatonicDegrees.length ? diatonicDegrees : opts.degrees, low, high);
  if (pool.length === 0) throw new Error('No candidate pitches for melody');

  const notes: MelodyNote[] = [];
  const rhythm = RHYTHM_POOLS[opts.rhythm ?? 'even'];

  // Start note
  let current: number;
  if (opts.startOnTonic !== false && pool.some((m) => degreeOf(m, tonic) === 0)) {
    const tonics = pool.filter((m) => degreeOf(m, tonic) === 0);
    // prefer a tonic near the middle of the range
    const mid = (low + high) / 2;
    current = tonics.reduce((best, m) => (Math.abs(m - mid) < Math.abs(best - mid) ? m : best), tonics[0]);
  } else {
    current = pick(diatonicPool.length ? diatonicPool : pool);
  }
  notes.push({ midi: current, degree: degreeOf(current, tonic), duration: weightedPick(rhythm.values, rhythm.weights) });

  for (let i = 1; i < length; i++) {
    const isLast = i === length - 1;
    const prevWasChromatic = !scale.includes(notes[i - 1].degree);
    let candidates = pool.filter((m) => m !== current && Math.abs(m - current) <= opts.maxLeap);
    if (opts.chromaticAsPassing && prevWasChromatic) {
      // After a chromatic note, resolve by step to a diatonic note.
      const resolve = diatonicPool.filter((m) => Math.abs(m - current) <= 2 && m !== current);
      if (resolve.length) candidates = resolve;
    }
    if (isLast && opts.endStable) {
      const stable = candidates.filter((m) => [0, 4, 7].includes(degreeOf(m, tonic)) || (mode === 'minor' && degreeOf(m, tonic) === 3));
      if (stable.length) candidates = stable;
    }
    if (candidates.length === 0) candidates = pool.filter((m) => m !== current);
    if (candidates.length === 0) candidates = pool;

    // Weight: prefer steps, prefer diatonic notes, prefer staying near the range centre.
    const weights = candidates.map((m) => {
      const dist = Math.abs(m - current);
      let w = dist <= 2 ? stepBias : 1 - stepBias;
      if (dist > 7) w *= 0.5;
      if (!scale.includes(degreeOf(m, tonic))) w *= 0.45;
      const centre = (low + high) / 2;
      if (Math.abs(m - centre) > 8) w *= 0.6;
      // avoid immediate back-and-forth repetition
      if (notes.length >= 2 && notes[notes.length - 2].midi === m && chance(0.5)) w *= 0.4;
      return w + 0.02;
    });
    current = weightedPick(candidates, weights);
    notes.push({ midi: current, degree: degreeOf(current, tonic), duration: weightedPick(rhythm.values, rhythm.weights) });
  }
  // Make the final note a little longer for a phrase feel.
  notes[notes.length - 1].duration = Math.max(notes[notes.length - 1].duration, 1.5);
  return notes;
}

/** Random tempo (bpm) in a range, quantised to 5. */
export function randomTempo(min = 70, max = 120): number {
  return Math.round(randInt(min, max) / 5) * 5;
}

export { rand };
