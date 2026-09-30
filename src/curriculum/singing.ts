import type { Module } from './types';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

export const singingModule: Module = {
  id: 'singing',
  name: 'Singing',
  tagline: 'Turn what you hear inside into a pitch you can check',
  kind: 'singing',
  icon: '🎤',
  srsPrefix: 'sing:',
  explanation: [
    'Singing is the fastest feedback loop for the ear. If you can sing a degree on demand, you can find it on the piano; if you can sing a melody back, you can transcribe it. These exercises use your microphone and show your pitch in real time against the target.',
    'You do not need a good voice – only a steady one. Hum with a relaxed "ng" or "oo" if singing feels awkward. Wear headphones so the app hears only you, and sing in a comfortable octave: the app accepts any octave for degree exercises and picks target notes from the vocal range you set in Settings.',
    'The exercises move from matching a heard note, through scales and classic warm-ups (do–so–do, do–mi–so–mi–do), to singing a named degree after a cadence with no other help, singing intervals, and echoing short melodies.',
  ],
  tips: [
    'Sing quietly and steadily; the meter needs a sustained tone. Vibrato is fine.',
    'Aim for the centre of the meter, not just "inside the green" – precision now saves time later.',
    'If detection is flaky, raise the microphone sensitivity in Settings or move closer.',
  ],
  levels: [
    { id: 's1', name: 'Match the pitch', summary: 'Hear a note in your range, sing it back', description: 'The starting point: the app plays a note, you sing it and hold it steady. Any octave counts, but try to match exactly.', config: { kind: 'singing', type: 'match', notes: 8, toleranceCents: 50, holdMs: 700 }, questions: 8, passAccuracy: 0.8 },
    { id: 's2', name: 'Do – so – do', summary: 'Classic warm-up with the piano guiding you', description: 'The tonic and the fifth. The piano plays each target as you go; sing along and hold.', config: { kind: 'singing', type: 'pattern', mode: 'major', patterns: [[0, 7, 0], [0, 7, 12, 7, 0]], guide: 'full', toleranceCents: 45, holdMs: 600, rounds: 4 }, questions: 4, passAccuracy: 0.8 },
    { id: 's3', name: 'Major scale, guided', summary: 'do re mi fa so la ti do, up and down', description: 'Sing the scale with the piano doubling you. Feel the half steps (mi–fa, ti–do) as smaller moves.', config: { kind: 'singing', type: 'pattern', mode: 'major', patterns: [[0, 2, 4, 5, 7, 9, 11, 12], [12, 11, 9, 7, 5, 4, 2, 0]], guide: 'full', toleranceCents: 40, holdMs: 500, rounds: 4 }, questions: 4, passAccuracy: 0.8 },
    { id: 's4', name: 'Major scale, on your own', summary: 'Only the tonic is given', description: 'The piano plays do once; you sing the full scale up and back. Your intonation is checked at each step.', config: { kind: 'singing', type: 'pattern', mode: 'major', patterns: [[0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0]], guide: 'tonic', toleranceCents: 40, holdMs: 500, rounds: 3 }, questions: 3, passAccuracy: 0.8 },
    { id: 's5', name: 'Warm-up patterns', summary: 'do-mi-so-mi-do, do-re-mi-re-do, do-ti-do, so-la-ti-do…', description: 'Common vocal patterns that also happen to be the building blocks of melodies. Tonic given, then you.', config: { kind: 'singing', type: 'pattern', mode: 'major', patterns: [[0, 4, 7, 4, 0], [0, 2, 4, 2, 0], [0, -1, 0, 2, 0], [0, 4, 7, 9, 7, 4, 0], [7, 9, 11, 12], [0, 7, 4, 0], [0, 5, 4, 2, 0], [12, 7, 4, 0]], guide: 'tonic', toleranceCents: 40, holdMs: 500, rounds: 5 }, questions: 5, passAccuracy: 0.8 },
    { id: 's6', name: 'Sing the degree: do mi so', summary: 'Cadence, then sing the named note', description: 'A cadence sets the key; the app names a degree; you sing it with no other reference. This is the inverse of the Functional degrees module.', config: { kind: 'singing', type: 'degree', mode: 'major', degrees: [0, 4, 7], cadence: 'full', toleranceCents: 50, holdMs: 700, rounds: 8 }, questions: 8, passAccuracy: 0.8 },
    { id: 's7', name: 'Sing the degree: full major scale', summary: 'Any diatonic degree after a cadence', description: 'All seven degrees. For the hard ones (la, fa) sing your way from do stepwise if you need to, then hold the target.', config: { kind: 'singing', type: 'degree', mode: 'major', degrees: MAJOR, cadence: 'full', toleranceCents: 50, holdMs: 700, rounds: 10 }, questions: 10, passAccuracy: 0.8 },
    { id: 's8', name: 'Minor scale', summary: 'do re me fa so le te do, guided then unguided', description: 'The natural minor scale. Notice me, le and te sit a half step lower than their major cousins.', config: { kind: 'singing', type: 'pattern', mode: 'minor', patterns: [[0, 2, 3, 5, 7, 8, 10, 12], [12, 10, 8, 7, 5, 3, 2, 0], [0, 3, 7, 3, 0]], guide: 'tonic', toleranceCents: 40, holdMs: 500, rounds: 4 }, questions: 4, passAccuracy: 0.8 },
    { id: 's9', name: 'Sing the degree: minor', summary: 'Minor cadence, any diatonic degree + la/ti', description: 'Degrees in a minor key, including the raised 6 and 7.', config: { kind: 'singing', type: 'degree', mode: 'minor', degrees: [...MINOR, 9, 11], cadence: 'full', toleranceCents: 50, holdMs: 700, rounds: 10 }, questions: 10, passAccuracy: 0.8 },
    { id: 's10', name: 'Sing intervals', summary: 'Hear a note, sing a named interval above or below', description: 'Given a reference note and an interval name, sing the second note. Strengthens the interval vocabulary from the inside.', config: { kind: 'singing', type: 'interval', intervals: [2, 3, 4, 5, 7, 8, 9, 12], directions: ['asc', 'desc'], toleranceCents: 50, holdMs: 700, rounds: 10 }, questions: 10, passAccuracy: 0.75 },
    { id: 's11', name: 'Sing the degree: chromatic', summary: 'Any of the 12 degrees, either mode', description: 'The complete movable-do vocabulary sung from a cadence.', config: { kind: 'singing', type: 'degree', mode: 'both', degrees: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], cadence: 'full', toleranceCents: 45, holdMs: 700, rounds: 12 }, questions: 12, passAccuracy: 0.75 },
    { id: 's12', name: 'Echo melodies', summary: 'Hear 3–5 notes, sing them back in order', description: 'The final singing skill and a direct bridge to transcription: short phrases are played once (replay allowed) and you echo them note by note.', config: { kind: 'singing', type: 'echo', mode: 'both', degrees: [...MAJOR, 3, 8, 10], length: [3, 5], maxLeap: 7, cadence: 'short', toleranceCents: 50, holdMs: 500, rounds: 6 }, questions: 6, passAccuracy: 0.7 },
  ],
};
