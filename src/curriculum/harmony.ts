import type { Module } from './types';
import type { HarmonyConfig } from '../exercises/types';

const base: Omit<HarmonyConfig, 'functions' | 'mode'> = { kind: 'harmony', cadence: 'full', inversions: [0] };
const MAJ_TRIADS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MAJ_SEVENTHS = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'];
const MIN_TRIADS = ['i', 'ii°m', 'III', 'ivm', 'Vm', 'VI', 'VII'];
const MIN_SEVENTHS = ['i7', 'iiø7m', 'IIImaj7', 'iv7', 'V7m', 'VImaj7', 'VII7'];

export const harmonyModule: Module = {
  id: 'harmony',
  name: 'Chord function',
  tagline: 'Hear chords as Roman numerals inside a key',
  kind: 'harmony',
  icon: '🏛️',
  srsPrefix: 'chf:',
  explanation: [
    'This is the chord version of the functional-degree exercise. After a cadence establishes the key, one chord is played and you name its function: I, IV, V, vi… Chord function is what actually lets you transcribe a song\'s chords quickly, because most music uses a handful of functions over and over.',
    'Each function has a feeling: I is home, IV lifts away from home, V pulls back hard, vi is the sad twin of I, ii is a softer pre-dominant, iii is ambiguous. Once these are automatic, borrowed chords (iv, bVI, bVII in major) and secondary dominants (V/V, V/vi…) stand out as "colour" you can name.',
    'Listen for the bass note as a scale degree first (that is exactly the Functional degrees skill) and combine it with the chord quality: bass "fa" + major = IV; bass "la" + minor = vi.',
  ],
  tips: ['Sing the bass note and find its degree, then ask "major or minor?".', 'Progressions in pop overwhelmingly use I, IV, V and vi – nail those four until they are instant.'],
  levels: [
    { id: 'h1', name: 'I, IV, V', summary: 'The three primary chords in major', description: 'Home, away, and tension. These three make up thousands of songs.', config: { ...base, mode: 'major', functions: ['I', 'IV', 'V'] }, questions: 15, passAccuracy: 0.9 },
    { id: 'h2', name: 'Add vi and ii', summary: 'The pop-song set', description: 'vi is the relative minor (the "sad" chord in the four-chord loop); ii is minor and shares two notes with IV.', config: { ...base, mode: 'major', functions: ['I', 'ii', 'IV', 'V', 'vi'] }, questions: 18, passAccuracy: 0.9 },
    { id: 'h3', name: 'All diatonic triads (major)', summary: '+ iii and vii°', description: 'iii is minor and often mistaken for I or vi; vii° is diminished and acts like V.', config: { ...base, mode: 'major', functions: MAJ_TRIADS }, questions: 20, passAccuracy: 0.85 },
    { id: 'h4', name: 'Minor: i, iv, V', summary: 'Primary chords in minor', description: 'Minor cadence. V is major (raised leading tone) so it pulls to i strongly.', config: { ...base, mode: 'minor', functions: ['i', 'ivm', 'Vm'] }, questions: 15, passAccuracy: 0.9 },
    { id: 'h5', name: 'All diatonic chords (minor)', summary: 'i ii° III iv V VI VII', description: 'III is the relative major, VI and VII are major chords that give minor keys their epic quality, ii° is diminished.', config: { ...base, mode: 'minor', functions: MIN_TRIADS }, questions: 20, passAccuracy: 0.85 },
    { id: 'h6', name: 'Seventh chords in major', summary: 'Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7', description: 'The jazz/neo-soul set. The seventh colours each function without changing its role.', config: { ...base, mode: 'major', functions: MAJ_SEVENTHS }, questions: 20, passAccuracy: 0.85 },
    { id: 'h7', name: 'Borrowed chords', summary: 'Major + iv, bVI, bVII, bIII, ii°', description: 'Chords borrowed from the parallel minor. They sound darker or more "cinematic" than the diatonic set.', config: { ...base, mode: 'major', functions: [...MAJ_TRIADS, 'iv', 'bVI', 'bVII', 'bIII', 'ii°'] }, questions: 22, passAccuracy: 0.8 },
    { id: 'h8', name: 'Secondary dominants', summary: 'Major + V/V, V7/IV, V/vi, V/ii', description: 'A major (or dominant 7) chord on a degree where you expect minor – it is a dominant pointing at another chord. Hear the "wrong" brightness and where it wants to go.', config: { ...base, mode: 'major', functions: [...MAJ_TRIADS, 'V/V', 'V7/IV', 'V/vi', 'V/ii'] }, questions: 22, passAccuracy: 0.8 },
    { id: 'h9', name: 'Minor sevenths & harmonic minor', summary: 'i7 iiø7 IIImaj7 iv7 V7 VImaj7 VII7 vii°7 i(maj7)', description: 'The full minor vocabulary including the leading-tone diminished seventh.', config: { ...base, mode: 'minor', functions: [...MIN_SEVENTHS, 'vii°7m', 'iminmaj7'] }, questions: 22, passAccuracy: 0.8 },
    { id: 'h10', name: 'Everything, inversions, any timbre', summary: 'Major or minor, all functions, inverted voicings', description: 'The final harmony test. The cadence reveals the mode; the chord may be inverted and played on any instrument.', config: { ...base, mode: 'both', functions: [...MAJ_TRIADS, ...MAJ_SEVENTHS, 'iv', 'bVI', 'bVII', 'V/V', 'V/vi', ...MIN_TRIADS, ...MIN_SEVENTHS], inversions: [0, 1, 2], timbres: ['piano', 'epiano', 'strings', 'organ', 'pluck'] }, questions: 26, passAccuracy: 0.78 },
  ],
};
