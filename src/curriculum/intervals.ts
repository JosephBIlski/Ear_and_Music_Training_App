import type { Module } from './types';
import type { IntervalsConfig } from '../exercises/types';

const base: Omit<IntervalsConfig, 'intervals' | 'directions'> = { kind: 'intervals', low: 48, high: 79 };

export const intervalsModule: Module = {
  id: 'intervals',
  name: 'Intervals',
  tagline: 'Name the distance between two notes',
  kind: 'intervals',
  icon: '↔️',
  srsPrefix: 'int:',
  explanation: [
    'An interval is the distance between two notes. Functional degree training tells you where a note sits in the key; interval training tells you how far a melody jumps regardless of key. Transcribers use both: degrees for the overall shape and intervals to confirm leaps.',
    'Start with ascending melodic intervals (two notes in a row), then descending, then harmonic (both at once – needed for chords). Each interval has a character: seconds are steps, thirds sound like chord tones, the fourth and fifth are "hollow", sixths are sweet, sevenths tense, the tritone unsettled.',
    'The classic shortcut is to associate each interval with the opening of a well-known song (see the hints during feedback). Use these as training wheels but aim to recognise the sound directly.',
  ],
  tips: [
    'For melodic intervals, sing the two notes then fill in the scale between them and count.',
    'For harmonic intervals, listen for the "beating"/roughness (seconds, sevenths, tritone) versus smoothness (thirds, sixths) versus hollowness (fourth, fifth, octave).',
  ],
  levels: [
    { id: 'i1', name: 'Wide and clear', summary: 'M2, M3, P5, P8 ascending', description: 'Four very different distances to get started: a step, a chord tone, the hollow fifth and the octave.', config: { ...base, intervals: [2, 4, 7, 12], directions: ['asc'] }, questions: 15, passAccuracy: 0.9 },
    { id: 'i2', name: 'Add minor 2nd/3rd and 4th', summary: 'm2 M2 m3 M3 P4 P5 P8 ascending', description: 'Now you must tell major from minor (bright vs dark) and the fourth from the fifth.', config: { ...base, intervals: [1, 2, 3, 4, 5, 7, 12], directions: ['asc'] }, questions: 18, passAccuracy: 0.9 },
    { id: 'i3', name: 'Sixths', summary: '+ m6, M6 ascending', description: 'Sixths are the inversions of thirds – sweet, wide leaps. M6 is "My Bonnie", m6 is "The Entertainer".', config: { ...base, intervals: [1, 2, 3, 4, 5, 7, 8, 9, 12], directions: ['asc'] }, questions: 18, passAccuracy: 0.88 },
    { id: 'i4', name: 'All simple intervals up', summary: '+ tritone, m7, M7', description: 'The tense ones: tritone (Simpsons), m7 (Somewhere), M7 (Take On Me).', config: { ...base, intervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], directions: ['asc'] }, questions: 20, passAccuracy: 0.85 },
    { id: 'i5', name: 'Descending', summary: 'All simple intervals going down', description: 'Descending intervals sound different from ascending ones and are harder for most people. Songs that go down: m3 "Hey Jude", P4 "Eine kleine Nachtmusik", P5 "Flintstones", M6 "Nobody Knows the Trouble".', config: { ...base, intervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], directions: ['desc'] }, questions: 20, passAccuracy: 0.85 },
    { id: 'i6', name: 'Up or down', summary: 'Mixed direction', description: 'Direction changes each question – decide direction first, then size.', config: { ...base, intervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], directions: ['asc', 'desc'] }, questions: 20, passAccuracy: 0.85 },
    { id: 'i7', name: 'Harmonic: consonances', summary: 'Both notes together – m3 M3 P4 P5 m6 M6 P8', description: 'Chords are stacks of harmonic intervals, so this is a stepping stone to chord recognition. Listen for how "smooth" versus "hollow" the pair is.', config: { ...base, intervals: [3, 4, 5, 7, 8, 9, 12], directions: ['harmonic'] }, questions: 18, passAccuracy: 0.85 },
    { id: 'i8', name: 'Harmonic: everything', summary: 'All simple intervals sounded together', description: 'Adds the rough ones (m2, M2, m7, M7, tritone). Roughness plus width tells you which.', config: { ...base, intervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], directions: ['harmonic'] }, questions: 20, passAccuracy: 0.8 },
    { id: 'i9', name: 'Compound intervals', summary: 'Beyond the octave: m9 M9 m10 M10 P11 P12', description: 'Melodies leap over an octave more than you think. Hear the leap as "octave plus something".', config: { ...base, intervals: [12, 13, 14, 15, 16, 17, 19], directions: ['asc', 'desc'], low: 45, high: 84 }, questions: 18, passAccuracy: 0.8 },
    { id: 'i10', name: 'Everything, any timbre', summary: 'All intervals, all directions, changing instruments', description: 'The final interval test: melodic and harmonic, simple and compound, played on different instruments.', config: { ...base, intervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 17], directions: ['asc', 'desc', 'harmonic'], low: 45, high: 84, timbres: ['piano', 'epiano', 'strings', 'pluck', 'synthlead'] }, questions: 24, passAccuracy: 0.8 },
  ],
};
