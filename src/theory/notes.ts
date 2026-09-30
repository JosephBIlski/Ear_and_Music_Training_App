/**
 * Pitch, note-name and movable-do solfège utilities.
 *
 * Conventions:
 *  - MIDI note numbers throughout (C4 = 60).
 *  - A "degree" is a semitone offset from the tonic, 0..11 (pitch class relative to do).
 *  - We use a *do-based* minor by default (do re me fa so le te), as in the
 *    Alain Benbassat method / Functional Ear Trainer. A la-based labelling
 *    can be chosen in settings; it only changes labels, never the underlying degree.
 */

export type Mode = 'major' | 'minor';
export type LabelStyle = 'solfege' | 'numbers' | 'both';
export type MinorLabelling = 'do-based' | 'la-based';

export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Preferred spelling of each key's tonic name. */
export const KEY_NAMES_MAJOR = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const KEY_NAMES_MINOR = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function midiToName(midi: number, useFlats = false): string {
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[pitchClass(midi)]}${octave}`;
}

export function keyName(tonic: number, mode: Mode): string {
  const pc = pitchClass(tonic);
  return mode === 'major' ? `${KEY_NAMES_MAJOR[pc]} major` : `${KEY_NAMES_MINOR[pc]} minor`;
}

/** Semitone offset of a midi note from the tonic, normalised 0..11. */
export function degreeOf(midi: number, tonic: number): number {
  return ((midi - tonic) % 12 + 12) % 12;
}

// --- Solfège naming ---------------------------------------------------------

const MAJOR_DIATONIC: Record<number, string> = { 0: 'do', 2: 're', 4: 'mi', 5: 'fa', 7: 'so', 9: 'la', 11: 'ti' };
const MINOR_DIATONIC: Record<number, string> = { 0: 'do', 2: 're', 3: 'me', 5: 'fa', 7: 'so', 8: 'le', 10: 'te' };

/** Raised chromatic names (sharp direction) and lowered (flat direction). */
const RAISED: Record<number, string> = { 1: 'di', 3: 'ri', 6: 'fi', 8: 'si', 10: 'li' };
const LOWERED: Record<number, string> = { 1: 'ra', 3: 'me', 6: 'se', 8: 'le', 10: 'te' };

/**
 * Primary solfège label for a degree in a given mode, do-based.
 * Chromatic degrees get the name that is most common functionally:
 *   major: ra me fi le te   (b2, b3, #4, b6, b7)
 *   minor: ra mi fi la ti   (b2, natural 3, #4, raised 6, raised 7)
 */
export function solfege(degree: number, mode: Mode): string {
  const d = ((degree % 12) + 12) % 12;
  if (mode === 'major') {
    if (d in MAJOR_DIATONIC) return MAJOR_DIATONIC[d];
    if (d === 6) return RAISED[6];
    return LOWERED[d];
  }
  if (d in MINOR_DIATONIC) return MINOR_DIATONIC[d];
  if (d === 4) return 'mi';
  if (d === 9) return 'la';
  if (d === 11) return 'ti';
  if (d === 6) return 'fi';
  return 'ra';
}

/** Alternative (enharmonic) solfège name for a chromatic degree, or null for diatonic notes. */
export function solfegeAlt(degree: number, mode: Mode): string | null {
  const d = ((degree % 12) + 12) % 12;
  const primary = solfege(d, mode);
  const candidates = [RAISED[d], LOWERED[d]].filter((n): n is string => !!n && n !== primary);
  if (mode === 'major' && d in MAJOR_DIATONIC) return null;
  if (mode === 'minor' && d in MINOR_DIATONIC) return null;
  return candidates[0] ?? null;
}

/** La-based minor labelling: minor tonic is "la"; relabel via the relative major. */
export function solfegeLaBased(degree: number): string {
  return solfege((degree + 9) % 12, 'major');
}

/** Scale-degree numbers: always relative to the major scale so b3, b6, b7 read as such. */
const DEGREE_NUMBERS: string[] = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
export function degreeNumber(degree: number): string {
  return DEGREE_NUMBERS[((degree % 12) + 12) % 12];
}

export function isDiatonic(degree: number, mode: Mode): boolean {
  const d = ((degree % 12) + 12) % 12;
  return mode === 'major' ? d in MAJOR_DIATONIC : d in MINOR_DIATONIC;
}

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor (do-based)
export const CHROMATIC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function scaleFor(mode: Mode): number[] {
  return mode === 'major' ? MAJOR_SCALE : MINOR_SCALE;
}

export interface DegreeLabelOptions {
  style: LabelStyle;
  minorLabelling: MinorLabelling;
}

/** Human label for a degree given user preferences. */
export function degreeLabel(degree: number, mode: Mode, opts: DegreeLabelOptions): string {
  const sol = mode === 'minor' && opts.minorLabelling === 'la-based' ? solfegeLaBased(degree) : solfege(degree, mode);
  const num = degreeNumber(degree);
  switch (opts.style) {
    case 'solfege':
      return sol;
    case 'numbers':
      return num;
    default:
      return `${sol} ${num}`;
  }
}

/**
 * The "resolution path" of a degree to the tonic, used for Benbassat-style feedback:
 * after answering, the note is played walking stepwise to the nearest do.
 * Returns midi notes starting at `midi` and ending on a tonic.
 */
export function resolutionPath(midi: number, tonic: number, mode: Mode): number[] {
  const scale = scaleFor(mode);
  const deg = degreeOf(midi, tonic);
  if (deg === 0) return [midi];
  const octaveBase = midi - deg; // the do at or below the note
  const upTarget = octaveBase + 12;
  const downTarget = octaveBase;
  // Upper tetrachord (fa/so and above) resolves up, lower resolves down – with
  // the classical exception that "fa" tends down to mi and "le" down to so in minor.
  const goUp = deg >= 7 || (mode === 'major' && deg === 6) || (mode === 'minor' && deg === 9) || deg === 11;
  const path: number[] = [midi];
  let current = midi;
  const target = goUp ? upTarget : downTarget;
  // Walk through scale tones between current and target.
  const step = goUp ? 1 : -1;
  let guard = 0;
  while (current !== target && guard++ < 24) {
    let next = current + step;
    while (!scale.includes(degreeOf(next, tonic)) && next !== target) next += step;
    current = next;
    path.push(current);
  }
  return path;
}

export function clampMidi(m: number, low: number, high: number): number {
  while (m < low) m += 12;
  while (m > high) m -= 12;
  return m;
}
