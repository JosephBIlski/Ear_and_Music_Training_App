import type { Module } from './types';
import type { ChordsConfig } from '../exercises/types';

const base: Omit<ChordsConfig, 'types'> = { kind: 'chords', inversions: [0], askInversion: false, styles: ['block'] };
const TRIADS = ['maj', 'min', 'dim', 'aug'];
const SEVENTHS = ['maj7', 'min7', 'dom7', 'dim7', 'hdim7'];

export const chordsModule: Module = {
  id: 'chords',
  name: 'Chord quality',
  tagline: 'Major, minor, diminished, sevenths… by sound alone',
  kind: 'chords',
  icon: '🎹',
  srsPrefix: 'ch',
  explanation: [
    'Chord quality is the "flavour" of a chord independent of key: major is bright, minor is dark, diminished is tense and shrinking, augmented is tense and expanding. Sevenths add a fourth note that colours the triad: maj7 is dreamy, m7 is mellow, dominant 7 wants to resolve, dim7 is spooky, half-diminished is sad-jazzy.',
    'When transcribing you will usually hear the bass note and the overall quality first, then confirm individual notes. This module trains the quality; the Harmony module trains what the chord means inside a key.',
    'Later levels add inversions (the same notes in a different order), arpeggiated playback (one note at a time, then the block chord) and wider voicings – all of which change the sound without changing the chord.',
  ],
  tips: [
    'Sing the notes of the chord from bottom to top. If the third is hard to find, sing the root then a major and then a minor third above it and check which matches.',
    'Diminished vs minor: both have a minor third; the diminished fifth sounds cramped. Augmented vs major: the raised fifth makes it float without a home.',
  ],
  levels: [
    { id: 'c1', name: 'Major vs minor', summary: 'Root position block chords', description: 'The most important distinction in Western music. Focus on the third: bright/wide (major) or dark/narrow (minor).', config: { ...base, types: ['maj', 'min'] }, questions: 14, passAccuracy: 0.9 },
    { id: 'c2', name: 'Add diminished and augmented', summary: 'The four triads', description: 'Both are symmetrical and unstable. Diminished shrinks (two minor thirds), augmented stretches (two major thirds).', config: { ...base, types: TRIADS }, questions: 18, passAccuracy: 0.9 },
    { id: 'c3', name: 'Suspended chords', summary: '+ sus2, sus4, arpeggiated & block', description: 'Sus chords replace the third, so they are neither major nor minor. Arpeggiated playback lets you hear each note – use it to check.', config: { ...base, types: [...TRIADS, 'sus2', 'sus4'], styles: ['block', 'arpeggio'] }, questions: 18, passAccuracy: 0.88 },
    { id: 'c4', name: 'Triads in inversion', summary: 'Quality only, any inversion', description: 'Inversions change the bass note. Ignore which note is lowest and find the quality of the whole sound.', config: { ...base, types: TRIADS, inversions: [0, 1, 2] }, questions: 20, passAccuracy: 0.85 },
    { id: 'c5', name: 'Seventh chords I', summary: 'maj7, m7, dominant 7', description: 'The three most common sevenths in pop, jazz and film music. maj7 = dreamy, m7 = mellow, 7 = bluesy tension.', config: { ...base, types: ['maj7', 'min7', 'dom7'], styles: ['block', 'arpeggio'] }, questions: 16, passAccuracy: 0.9 },
    { id: 'c6', name: 'Seventh chords II', summary: '+ dim7, half-diminished', description: 'Both are built on a diminished triad. dim7 is perfectly symmetrical (horror-movie chord); ø7 has a minor 7th and sounds like a sad ii chord in minor.', config: { ...base, types: SEVENTHS, styles: ['block', 'arpeggio'] }, questions: 20, passAccuracy: 0.85 },
    { id: 'c7', name: 'Colour chords', summary: '+ m(maj7), 6, m6, 7sus4', description: 'Less common but characteristic sounds: minor-major 7 (James Bond), the 6 and m6 (swing / bossa), 7sus4 (funk / gospel).', config: { ...base, types: [...SEVENTHS, 'minmaj7', 'maj6', 'min6', 'dom7sus4'], styles: ['block', 'arpeggio'] }, questions: 22, passAccuracy: 0.8 },
    { id: 'c8', name: 'Sevenths in inversion', summary: 'Seventh chords, any inversion, open voicings', description: 'Real recordings rarely stack chords neatly. Identify quality from any arrangement of the notes.', config: { ...base, types: SEVENTHS, inversions: [0, 1, 2, 3], openVoicing: true, styles: ['block', 'arpeggio'] }, questions: 22, passAccuracy: 0.8 },
    { id: 'c9', name: 'Name the inversion', summary: 'Triads: quality AND inversion', description: 'Now the bass matters. Root position: root on the bottom (stable). 1st inversion: third on the bottom (lighter). 2nd inversion: fifth on the bottom (unstable, "wants" to move).', config: { ...base, types: ['maj', 'min'], inversions: [0, 1, 2], askInversion: true }, questions: 20, passAccuracy: 0.8 },
    { id: 'c10', name: 'Extended chords', summary: 'add9, maj9, m9, 9', description: 'Ninths add shimmer on top. Hear the triad or seventh first, then the extra note a step above the root.', config: { ...base, types: ['maj7', 'min7', 'dom7', 'add9', 'maj9', 'min9', 'dom9'], styles: ['block', 'arpeggio'] }, questions: 20, passAccuracy: 0.8 },
    { id: 'c11', name: 'Everything, any timbre', summary: 'All qualities, inversions, instruments', description: 'The final chord-quality test across strings, e-piano, plucks and synths.', config: { ...base, types: [...TRIADS, 'sus2', 'sus4', ...SEVENTHS, 'minmaj7', 'maj6', 'min6', 'add9', 'maj9', 'min9', 'dom9'], inversions: [0, 1, 2], openVoicing: true, styles: ['block', 'arpeggio'], timbres: ['piano', 'epiano', 'strings', 'pluck', 'organ', 'synthlead'] }, questions: 26, passAccuracy: 0.78 },
  ],
};
