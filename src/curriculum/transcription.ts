import type { Module } from './types';
import type { MelodyConfig, ProgressionConfig } from '../exercises/types';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const mBase: Omit<MelodyConfig, 'degrees' | 'mode' | 'length'> = {
  kind: 'melody',
  maxLeap: 4,
  range: 12,
  cadence: 'full',
  rhythm: 'even',
  tempo: [80, 100],
  keys: 'C',
};

export const melodyModule: Module = {
  id: 'melody',
  name: 'Melody transcription',
  tagline: 'Hear a phrase, write it down note by note',
  kind: 'melody',
  icon: '🎼',
  srsPrefix: 'deg:',
  explanation: [
    'This is the skill you are ultimately after: hearing a melody and knowing what the notes are. A cadence sets the key, a short phrase plays, and you enter the notes in order – as scale degrees or on the piano. You can replay the phrase (limited in later levels), and you can enter the notes while it plays.',
    'Strategy: first catch the overall contour (up/down, steps/leaps) and where it lands. Identify the "anchor" notes you are sure of (usually do, mi, so and the final note), then fill in the notes between them using step-wise logic. Notes you got wrong feed straight into the spaced-repetition scheduler for the Functional degrees module.',
    'Levels increase in length, range, leaps, rhythm complexity, add chromatic passing notes, minor keys, accompaniment, different instruments, and finally remove the cadence. The last levels are "absolute": no key is given, you find the notes on the piano exactly as you would when working out a song for your DAW.',
  ],
  tips: [
    'Sing the phrase back before entering anything. If you cannot sing it, you cannot transcribe it yet – replay.',
    'Enter the notes you are sure of first (the input lets you go back and change any note).',
    'For your own ideas: hum into your phone, then work them out here-style – find do first, then the degrees.',
  ],
  levels: [
    { id: 'm1', name: 'Three steps', summary: '3 notes, do–so, stepwise, C major', description: 'Tiny phrases moving by step among do re mi fa so. Start on do.', config: { ...mBase, mode: 'major', degrees: [0, 2, 4, 5, 7], length: [3, 3], maxLeap: 2 }, questions: 8, passAccuracy: 0.85 },
    { id: 'm2', name: 'Four notes, whole scale', summary: 'Steps and thirds, any major key', description: 'The whole major scale within one octave, leaps up to a third.', config: { ...mBase, mode: 'major', degrees: MAJOR, length: [4, 4], maxLeap: 4, keys: 'random', rhythm: 'simple' }, questions: 8, passAccuracy: 0.85 },
    { id: 'm3', name: 'Five notes with leaps', summary: 'Leaps up to a fifth', description: 'Melodies start to jump. Use the leap\'s interval to confirm the degree you land on.', config: { ...mBase, mode: 'major', degrees: MAJOR, length: [5, 5], maxLeap: 7, keys: 'random', rhythm: 'simple' }, questions: 8, passAccuracy: 0.8 },
    { id: 'm4', name: 'Six notes, wider range', summary: 'Any leap, 1.5 octaves, varied rhythm', description: 'Longer phrases across a wider range with rhythmic variety. Contour first, then details.', config: { ...mBase, mode: 'major', degrees: MAJOR, length: [6, 6], maxLeap: 12, range: 17, keys: 'random', rhythm: 'varied', tempo: [80, 110] }, questions: 8, passAccuracy: 0.8 },
    { id: 'm5', name: 'Minor melodies', summary: '4–6 notes in minor (with la/ti)', description: 'Minor phrases using the natural scale plus raised 6 and 7 as they occur in real music.', config: { ...mBase, mode: 'minor', degrees: [...MINOR, 9, 11], length: [4, 6], maxLeap: 9, range: 15, keys: 'random', rhythm: 'varied' }, questions: 8, passAccuracy: 0.8 },
    { id: 'm6', name: 'Chromatic passing notes', summary: 'Major with fi, te, ra, me, le as passing tones', description: 'Chromatic notes appear between diatonic neighbours – the way they show up in jazz and blues lines.', config: { ...mBase, mode: 'major', degrees: ALL, length: [5, 6], maxLeap: 7, range: 15, keys: 'random', rhythm: 'varied', chromaticAsPassing: true }, questions: 8, passAccuracy: 0.75 },
    { id: 'm7', name: 'Long phrases, any instrument', summary: '7–8 notes, syncopated, changing timbres', description: 'Longer and rhythmically freer, played on different instruments so you learn to hear pitch through timbre.', config: { ...mBase, mode: 'both', degrees: [...MAJOR, 3, 8, 10], length: [7, 8], maxLeap: 9, range: 17, keys: 'random', rhythm: 'syncopated', tempo: [85, 125], timbres: ['piano', 'epiano', 'strings', 'pluck', 'synthlead'] }, questions: 8, passAccuracy: 0.75 },
    { id: 'm8', name: 'Melody over chords', summary: 'Transcribe the top line while chords play', description: 'A chord accompaniment plays underneath. Separate the melody from the harmony – a core transcription skill.', config: { ...mBase, mode: 'both', degrees: [...MAJOR, 3, 8, 10], length: [6, 8], maxLeap: 9, range: 15, keys: 'random', rhythm: 'varied', accompaniment: true, timbres: ['piano', 'epiano', 'synthlead'] }, questions: 8, passAccuracy: 0.75 },
    { id: 'm9', name: 'Tonic only, limited replays', summary: 'Just a tonic chord, 8 notes, 3 replays', description: 'No cadence – only the tonic chord once. Hold the key yourself and commit: three replays maximum.', config: { ...mBase, mode: 'both', degrees: ALL, length: [8, 8], maxLeap: 12, range: 19, keys: 'random', rhythm: 'varied', cadence: 'tonic', chromaticAsPassing: true, maxReplays: 3, tempo: [90, 130] }, questions: 8, passAccuracy: 0.7 },
    { id: 'm10', name: 'Absolute: find it on the piano', summary: 'No key given – play the notes on the keyboard', description: 'Real-world mode. A melody plays with no reference. Use the on-screen (or MIDI) piano to find the exact notes, just as you would when getting an idea into your DAW. The piano sounds when you press it, so hunt with your ears.', config: { ...mBase, mode: 'both', degrees: [...MAJOR, 3, 8, 10], length: [5, 7], maxLeap: 9, range: 15, keys: 'random', rhythm: 'varied', cadence: 'none', absolute: true, maxReplays: 4, timbres: ['piano', 'epiano', 'strings', 'pluck', 'synthlead'] }, questions: 6, passAccuracy: 0.7 },
    { id: 'm11', name: 'Absolute, long & chromatic', summary: '8–10 notes, chromatic, 3 replays, any instrument', description: 'The final melody challenge: long chromatic phrases, no key, few replays.', config: { ...mBase, mode: 'both', degrees: ALL, length: [8, 10], maxLeap: 12, range: 19, keys: 'random', rhythm: 'syncopated', cadence: 'none', absolute: true, chromaticAsPassing: true, maxReplays: 3, tempo: [90, 130], timbres: ['piano', 'epiano', 'strings', 'pluck', 'synthlead', 'organ'] }, questions: 6, passAccuracy: 0.65 },
  ],
};

const pBase: Omit<ProgressionConfig, 'functions' | 'mode' | 'length'> = {
  kind: 'progression',
  cadence: 'full',
  tempo: [70, 90],
  keys: 'C',
  inversions: [0],
};
const MAJ_TRIADS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MAJ_SEVENTHS = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7'];
const MIN_TRIADS = ['i', 'ii°m', 'III', 'ivm', 'Vm', 'VI', 'VII'];
const MIN_SEVENTHS = ['i7', 'iiø7m', 'IIImaj7', 'iv7', 'V7m', 'VImaj7', 'VII7'];

export const progressionModule: Module = {
  id: 'progression',
  name: 'Chord transcription',
  tagline: 'Write down whole progressions',
  kind: 'progression',
  icon: '📝',
  srsPrefix: 'chf:',
  explanation: [
    'After the cadence, a progression of several chords plays and you enter the Roman numerals in order. This is how you would chart a song: key first, then function of each chord, then (later) voicings and extensions.',
    'Approach: track the bass line as scale degrees while the progression plays, then attach quality. Most progressions start on I and use I, IV, V and vi – confirm those quickly and spend your attention on the unusual chord.',
    'Later levels add sevenths, borrowed chords, secondary dominants, inversions, a melody on top and different instruments.',
  ],
  tips: ['Count the chords on the first listen, hear the bass line on the second, confirm qualities on the third.', 'When you start writing your own progressions in the DAW, name them in Roman numerals too – the habit transfers both ways.'],
  levels: [
    { id: 'p1', name: 'Three chords', summary: 'I IV V, 3 chords, C major', description: 'Starts on I. Hear whether the next chord goes "away" (IV) or "tense" (V).', config: { ...pBase, mode: 'major', functions: ['I', 'IV', 'V'], length: [3, 3] }, questions: 8, passAccuracy: 0.85 },
    { id: 'p2', name: 'Four-chord loops', summary: 'I IV V vi, 4 chords, any key', description: 'The pop set in any key. Includes the famous I–V–vi–IV and vi–IV–I–V shapes.', config: { ...pBase, mode: 'major', functions: ['I', 'IV', 'V', 'vi'], length: [4, 4], keys: 'random' }, questions: 8, passAccuracy: 0.85 },
    { id: 'p3', name: 'All diatonic triads', summary: '4 chords from I ii iii IV V vi vii°', description: 'Adds ii, iii and vii°. ii often replaces IV; iii is the sneaky one.', config: { ...pBase, mode: 'major', functions: MAJ_TRIADS, length: [4, 4], keys: 'random' }, questions: 8, passAccuracy: 0.8 },
    { id: 'p4', name: 'Minor progressions', summary: 'i iv V VI VII III, 4 chords', description: 'Minor-key loops: i–VI–III–VII, i–iv–V, i–VII–VI–V and friends.', config: { ...pBase, mode: 'minor', functions: MIN_TRIADS, length: [4, 4], keys: 'random' }, questions: 8, passAccuracy: 0.8 },
    { id: 'p5', name: 'Seventh chords', summary: 'Major key sevenths, 4 chords', description: 'ii7–V7–Imaj7 and the neo-soul palette.', config: { ...pBase, mode: 'major', functions: MAJ_SEVENTHS, length: [4, 4], keys: 'random' }, questions: 8, passAccuracy: 0.8 },
    { id: 'p6', name: 'Borrowed & secondary', summary: 'Diatonic + iv, bVI, bVII, V/V, V/vi', description: 'One or two colour chords hide inside otherwise ordinary progressions – find them.', config: { ...pBase, mode: 'major', functions: [...MAJ_TRIADS, 'iv', 'bVI', 'bVII', 'V/V', 'V/vi'], length: [4, 4], keys: 'random' }, questions: 8, passAccuracy: 0.75 },
    { id: 'p7', name: 'Longer, minor sevenths, timbres', summary: '5–6 chords, both modes, other instruments', description: 'Longer progressions in either mode, including minor sevenths, on strings, e-piano and organ.', config: { ...pBase, mode: 'both', functions: [...MAJ_TRIADS, ...MAJ_SEVENTHS, ...MIN_TRIADS, ...MIN_SEVENTHS], length: [5, 6], keys: 'random', tempo: [75, 100], timbres: ['piano', 'epiano', 'strings', 'organ'] }, questions: 6, passAccuracy: 0.75 },
    { id: 'p8', name: 'Chords under a melody', summary: '4 chords with a melody on top', description: 'A melody plays over the chords; transcribe the chords only. Learn to listen "underneath".', config: { ...pBase, mode: 'both', functions: [...MAJ_TRIADS, 'bVII', 'iv', ...MIN_TRIADS], length: [4, 4], keys: 'random', withMelody: true }, questions: 6, passAccuracy: 0.75 },
    { id: 'p9', name: 'Inversions, limited replays', summary: '4–5 chords, inverted voicings, 3 replays', description: 'Inversions disguise the bass line; rely on quality and the overall pull. Three replays.', config: { ...pBase, mode: 'both', functions: [...MAJ_TRIADS, ...MAJ_SEVENTHS, 'iv', 'bVI', 'bVII', 'V/V', ...MIN_TRIADS, ...MIN_SEVENTHS], length: [4, 5], keys: 'random', inversions: [0, 1, 2], maxReplays: 3, timbres: ['piano', 'epiano', 'strings'] }, questions: 6, passAccuracy: 0.7 },
    { id: 'p10', name: 'Full chart', summary: '6–8 chords, everything, 3 replays', description: 'A whole verse-length progression with any of the vocabulary you have learned, chord-tone melody on top.', config: { ...pBase, mode: 'both', functions: [...MAJ_TRIADS, ...MAJ_SEVENTHS, 'iv', 'bVI', 'bVII', 'bIII', 'V/V', 'V/vi', 'V7/IV', ...MIN_TRIADS, ...MIN_SEVENTHS, 'vii°7m'], length: [6, 8], keys: 'random', inversions: [0, 1], withMelody: true, maxReplays: 3, tempo: [80, 110], timbres: ['piano', 'epiano', 'strings', 'organ'] }, questions: 5, passAccuracy: 0.65 },
  ],
};
