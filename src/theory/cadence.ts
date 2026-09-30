import { pianoVoicing } from './chords';
import type { Mode } from './notes';

export type CadenceStyle = 'full' | 'short' | 'tonic' | 'none';

export interface TimedChord {
  notes: number[];
  duration: number; // seconds
}

/**
 * A key-establishing cadence in the Benbassat tradition.
 *  full : I – IV – V – I     (major) / i – iv – V – i (minor)
 *  short: I – V – I
 *  tonic: a single tonic chord
 */
export function cadenceChords(tonic: number, mode: Mode, style: CadenceStyle, chordDuration = 0.55): TimedChord[] {
  if (style === 'none') return [];
  const isMajor = mode === 'major';
  const I = () => ({ root: tonic, type: isMajor ? 'maj' : 'min' });
  const IV = () => ({ root: tonic + 5, type: isMajor ? 'maj' : 'min' });
  const V = () => ({ root: tonic + 7, type: 'maj' });
  let seq: { root: number; type: string }[];
  switch (style) {
    case 'full':
      seq = [I(), IV(), V(), I()];
      break;
    case 'short':
      seq = [I(), V(), I()];
      break;
    default:
      seq = [I()];
  }
  const out: TimedChord[] = [];
  let prev: number[] | undefined;
  seq.forEach((c, idx) => {
    const notes = pianoVoicing(c.root, c.type, 0, prev?.slice(1));
    prev = notes;
    out.push({ notes, duration: idx === seq.length - 1 ? chordDuration * 1.6 : chordDuration });
  });
  return out;
}

export function cadenceDuration(style: CadenceStyle, chordDuration = 0.55): number {
  return cadenceChords(60, 'major', style, chordDuration).reduce((a, c) => a + c.duration, 0);
}
