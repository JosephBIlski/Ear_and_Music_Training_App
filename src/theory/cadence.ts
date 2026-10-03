import { pianoVoicing } from './chords';
import type { Mode } from './notes';

export type CadenceStyle = 'full' | 'short' | 'tonic' | 'note' | 'none';

export const CADENCE_STYLE_NAMES: Record<CadenceStyle, string> = {
  full: 'I–IV–V–I cadence',
  short: 'I–V–I cadence',
  tonic: 'Tonic chord only',
  note: 'Single do note',
  none: 'No key context',
};

export interface TimedChord {
  notes: number[];
  duration: number; // seconds
}

/**
 * A key-establishing cadence in the Benbassat tradition.
 *  full : I – IV – V – I     (major) / i – iv – V – i (minor)
 *  short: I – V – I
 *  tonic: a single tonic chord
 *  note : the tonic note alone (do)
 */
export function cadenceChords(tonic: number, mode: Mode, style: CadenceStyle, chordDuration = 0.55): TimedChord[] {
  if (style === 'none') return [];
  if (style === 'note') return [{ notes: [tonic], duration: chordDuration * 2 }];
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

/** Roman-numeral (or "do") labels for each sound in the cadence, in order. */
export function cadenceLabels(mode: Mode, style: CadenceStyle): string[] {
  const maj = mode === 'major';
  switch (style) {
    case 'full':
      return maj ? ['I', 'IV', 'V', 'I'] : ['i', 'iv', 'V', 'i'];
    case 'short':
      return maj ? ['I', 'V', 'I'] : ['i', 'V', 'i'];
    case 'tonic':
      return maj ? ['I'] : ['i'];
    case 'note':
      return ['do'];
    default:
      return [];
  }
}

export function cadenceDuration(style: CadenceStyle, chordDuration = 0.55): number {
  return cadenceChords(60, 'major', style, chordDuration).reduce((a, c) => a + c.duration, 0);
}
