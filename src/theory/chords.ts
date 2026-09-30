import type { Mode } from './notes';

export interface ChordType {
  id: string;
  /** Display symbol, appended to a root, e.g. "m7" */
  symbol: string;
  name: string;
  intervals: number[]; // semitones from root, root position
  family: 'triad' | 'seventh' | 'extended';
}

export const CHORD_TYPES: ChordType[] = [
  { id: 'maj', symbol: '', name: 'Major', intervals: [0, 4, 7], family: 'triad' },
  { id: 'min', symbol: 'm', name: 'Minor', intervals: [0, 3, 7], family: 'triad' },
  { id: 'dim', symbol: '°', name: 'Diminished', intervals: [0, 3, 6], family: 'triad' },
  { id: 'aug', symbol: '+', name: 'Augmented', intervals: [0, 4, 8], family: 'triad' },
  { id: 'sus2', symbol: 'sus2', name: 'Suspended 2nd', intervals: [0, 2, 7], family: 'triad' },
  { id: 'sus4', symbol: 'sus4', name: 'Suspended 4th', intervals: [0, 5, 7], family: 'triad' },
  { id: 'maj7', symbol: 'maj7', name: 'Major 7th', intervals: [0, 4, 7, 11], family: 'seventh' },
  { id: 'min7', symbol: 'm7', name: 'Minor 7th', intervals: [0, 3, 7, 10], family: 'seventh' },
  { id: 'dom7', symbol: '7', name: 'Dominant 7th', intervals: [0, 4, 7, 10], family: 'seventh' },
  { id: 'dim7', symbol: '°7', name: 'Diminished 7th', intervals: [0, 3, 6, 9], family: 'seventh' },
  { id: 'hdim7', symbol: 'ø7', name: 'Half-diminished 7th', intervals: [0, 3, 6, 10], family: 'seventh' },
  { id: 'minmaj7', symbol: 'm(maj7)', name: 'Minor-major 7th', intervals: [0, 3, 7, 11], family: 'seventh' },
  { id: 'maj6', symbol: '6', name: 'Major 6th', intervals: [0, 4, 7, 9], family: 'seventh' },
  { id: 'min6', symbol: 'm6', name: 'Minor 6th', intervals: [0, 3, 7, 9], family: 'seventh' },
  { id: 'dom7sus4', symbol: '7sus4', name: 'Dominant 7th sus4', intervals: [0, 5, 7, 10], family: 'seventh' },
  { id: 'add9', symbol: 'add9', name: 'Major add 9', intervals: [0, 4, 7, 14], family: 'extended' },
  { id: 'maj9', symbol: 'maj9', name: 'Major 9th', intervals: [0, 4, 7, 11, 14], family: 'extended' },
  { id: 'min9', symbol: 'm9', name: 'Minor 9th', intervals: [0, 3, 7, 10, 14], family: 'extended' },
  { id: 'dom9', symbol: '9', name: 'Dominant 9th', intervals: [0, 4, 7, 10, 14], family: 'extended' },
];

export function chordType(id: string): ChordType {
  const t = CHORD_TYPES.find((c) => c.id === id);
  if (!t) throw new Error(`Unknown chord type ${id}`);
  return t;
}

/**
 * Build a chord's midi notes.
 * @param root midi root (in root position the lowest note)
 * @param inversion 0 = root position, 1 = first inversion, ...
 */
export function buildChord(root: number, typeId: string, inversion = 0): number[] {
  const t = chordType(typeId);
  const notes = t.intervals.map((i) => root + i);
  const inv = inversion % notes.length;
  for (let k = 0; k < inv; k++) {
    const low = notes.shift()!;
    notes.push(low + 12);
  }
  return notes;
}

/** Number of distinct inversions a chord type has (its note count). */
export function inversionCount(typeId: string): number {
  return chordType(typeId).intervals.length;
}

export const INVERSION_NAMES = ['root position', '1st inversion', '2nd inversion', '3rd inversion', '4th inversion'];

// --- Functional harmony (Roman numerals) ------------------------------------

export interface ChordFunction {
  id: string; // stable id e.g. "IV", "V7", "bVII", "V/V"
  label: string; // display
  rootDegree: number; // semitones above tonic
  type: string; // chord type id
  category: 'diatonic' | 'seventh' | 'borrowed' | 'secondary';
  mode: Mode;
  description?: string;
}

const MAJ: Mode = 'major';
const MIN: Mode = 'minor';

export const CHORD_FUNCTIONS: ChordFunction[] = [
  // Major diatonic triads
  { id: 'I', label: 'I', rootDegree: 0, type: 'maj', category: 'diatonic', mode: MAJ, description: 'Tonic – home.' },
  { id: 'ii', label: 'ii', rootDegree: 2, type: 'min', category: 'diatonic', mode: MAJ, description: 'Supertonic – pre-dominant, often leads to V.' },
  { id: 'iii', label: 'iii', rootDegree: 4, type: 'min', category: 'diatonic', mode: MAJ, description: 'Mediant – tonic-ish colour.' },
  { id: 'IV', label: 'IV', rootDegree: 5, type: 'maj', category: 'diatonic', mode: MAJ, description: 'Subdominant – away from home, bright.' },
  { id: 'V', label: 'V', rootDegree: 7, type: 'maj', category: 'diatonic', mode: MAJ, description: 'Dominant – tension pulling back to I.' },
  { id: 'vi', label: 'vi', rootDegree: 9, type: 'min', category: 'diatonic', mode: MAJ, description: 'Submediant – the relative minor, sad tonic.' },
  { id: 'vii°', label: 'vii°', rootDegree: 11, type: 'dim', category: 'diatonic', mode: MAJ, description: 'Leading-tone chord – dominant function.' },
  // Major diatonic sevenths
  { id: 'Imaj7', label: 'Imaj7', rootDegree: 0, type: 'maj7', category: 'seventh', mode: MAJ },
  { id: 'ii7', label: 'ii7', rootDegree: 2, type: 'min7', category: 'seventh', mode: MAJ },
  { id: 'iii7', label: 'iii7', rootDegree: 4, type: 'min7', category: 'seventh', mode: MAJ },
  { id: 'IVmaj7', label: 'IVmaj7', rootDegree: 5, type: 'maj7', category: 'seventh', mode: MAJ },
  { id: 'V7', label: 'V7', rootDegree: 7, type: 'dom7', category: 'seventh', mode: MAJ },
  { id: 'vi7', label: 'vi7', rootDegree: 9, type: 'min7', category: 'seventh', mode: MAJ },
  { id: 'viiø7', label: 'viiø7', rootDegree: 11, type: 'hdim7', category: 'seventh', mode: MAJ },
  // Borrowed from parallel minor (major key)
  { id: 'iv', label: 'iv', rootDegree: 5, type: 'min', category: 'borrowed', mode: MAJ, description: 'Minor iv – bittersweet, borrowed from minor.' },
  { id: 'bVI', label: 'bVI', rootDegree: 8, type: 'maj', category: 'borrowed', mode: MAJ, description: 'Flat six – epic/cinematic lift.' },
  { id: 'bVII', label: 'bVII', rootDegree: 10, type: 'maj', category: 'borrowed', mode: MAJ, description: 'Flat seven – rock/mixolydian sound.' },
  { id: 'bIII', label: 'bIII', rootDegree: 3, type: 'maj', category: 'borrowed', mode: MAJ, description: 'Flat three – bold borrowed colour.' },
  { id: 'ii°', label: 'ii°', rootDegree: 2, type: 'dim', category: 'borrowed', mode: MAJ, description: 'Diminished ii borrowed from minor.' },
  // Secondary dominants (major key)
  { id: 'V/V', label: 'V/V', rootDegree: 2, type: 'maj', category: 'secondary', mode: MAJ, description: 'II major – dominant of the dominant.' },
  { id: 'V7/IV', label: 'V7/IV', rootDegree: 0, type: 'dom7', category: 'secondary', mode: MAJ, description: 'I7 – tonic turned dominant, pulls to IV.' },
  { id: 'V/vi', label: 'V/vi', rootDegree: 4, type: 'maj', category: 'secondary', mode: MAJ, description: 'III major – pulls to vi.' },
  { id: 'V/ii', label: 'V/ii', rootDegree: 9, type: 'maj', category: 'secondary', mode: MAJ, description: 'VI major – pulls to ii.' },
  // Minor diatonic (with dominant V from harmonic minor)
  { id: 'i', label: 'i', rootDegree: 0, type: 'min', category: 'diatonic', mode: MIN, description: 'Minor tonic – home.' },
  { id: 'ii°m', label: 'ii°', rootDegree: 2, type: 'dim', category: 'diatonic', mode: MIN },
  { id: 'III', label: 'III', rootDegree: 3, type: 'maj', category: 'diatonic', mode: MIN, description: 'The relative major.' },
  { id: 'ivm', label: 'iv', rootDegree: 5, type: 'min', category: 'diatonic', mode: MIN },
  { id: 'vm', label: 'v', rootDegree: 7, type: 'min', category: 'diatonic', mode: MIN, description: 'Minor v – modal, softer dominant.' },
  { id: 'Vm', label: 'V', rootDegree: 7, type: 'maj', category: 'diatonic', mode: MIN, description: 'Major V – raised leading tone, strong pull to i.' },
  { id: 'VI', label: 'VI', rootDegree: 8, type: 'maj', category: 'diatonic', mode: MIN },
  { id: 'VII', label: 'VII', rootDegree: 10, type: 'maj', category: 'diatonic', mode: MIN },
  // Minor sevenths
  { id: 'i7', label: 'i7', rootDegree: 0, type: 'min7', category: 'seventh', mode: MIN },
  { id: 'iiø7m', label: 'iiø7', rootDegree: 2, type: 'hdim7', category: 'seventh', mode: MIN },
  { id: 'IIImaj7', label: 'IIImaj7', rootDegree: 3, type: 'maj7', category: 'seventh', mode: MIN },
  { id: 'iv7', label: 'iv7', rootDegree: 5, type: 'min7', category: 'seventh', mode: MIN },
  { id: 'V7m', label: 'V7', rootDegree: 7, type: 'dom7', category: 'seventh', mode: MIN },
  { id: 'VImaj7', label: 'VImaj7', rootDegree: 8, type: 'maj7', category: 'seventh', mode: MIN },
  { id: 'VII7', label: 'VII7', rootDegree: 10, type: 'dom7', category: 'seventh', mode: MIN },
  { id: 'vii°7m', label: 'vii°7', rootDegree: 11, type: 'dim7', category: 'seventh', mode: MIN, description: 'Leading-tone diminished 7th from harmonic minor.' },
  { id: 'iminmaj7', label: 'i(maj7)', rootDegree: 0, type: 'minmaj7', category: 'seventh', mode: MIN },
];

export function chordFunction(id: string): ChordFunction {
  const f = CHORD_FUNCTIONS.find((c) => c.id === id);
  if (!f) throw new Error(`Unknown chord function ${id}`);
  return f;
}

export function functionsFor(mode: Mode, categories: ChordFunction['category'][]): ChordFunction[] {
  return CHORD_FUNCTIONS.filter((f) => f.mode === mode && categories.includes(f.category));
}

/**
 * Voice a chord "in a range": choose the octave for each note so that the
 * chord sits within [low, high], keeps its inversion ordering, and stays
 * close to a previous voicing when given (simple voice-leading).
 */
export function voiceChord(notes: number[], low: number, high: number, previous?: number[]): number[] {
  // Try every octave transposition and pick the one whose centroid is closest
  // to the previous chord's centroid (or to the middle of the range).
  const targetCenter = previous && previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : (low + high) / 2;
  let best: number[] | null = null;
  let bestScore = Infinity;
  for (let shift = -36; shift <= 36; shift += 12) {
    const cand = notes.map((n) => n + shift);
    if (cand[0] < low || cand[cand.length - 1] > high) continue;
    const center = cand.reduce((a, b) => a + b, 0) / cand.length;
    const score = Math.abs(center - targetCenter);
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best ?? notes;
}

/**
 * Produce a piano-style voicing for a functional chord: a bass note (root) an
 * octave below plus the chord tones voiced in the middle register.
 */
export function pianoVoicing(root: number, typeId: string, inversion: number, previous?: number[]): number[] {
  const chord = buildChord(root, typeId, inversion);
  const upper = voiceChord(chord, 55, 79, previous);
  const bassRoot = root;
  let bass = bassRoot;
  while (bass > 52) bass -= 12;
  while (bass < 36) bass += 12;
  return [bass, ...upper];
}

export function chordSymbol(rootName: string, typeId: string): string {
  return `${rootName}${chordType(typeId).symbol}`;
}
