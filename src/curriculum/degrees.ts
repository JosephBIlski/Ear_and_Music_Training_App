import type { Module } from './types';
import type { DegreesConfig } from '../exercises/types';

const base: Omit<DegreesConfig, 'degrees' | 'mode'> = {
  kind: 'degrees',
  keys: 'C',
  octaves: 1,
  notesPerQuestion: 1,
  cadence: 'full',
  cadenceEvery: 1,
  resolution: true,
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const degreesModule: Module = {
  id: 'degrees',
  name: 'Functional degrees',
  tagline: 'Hear every note as a position in the key (movable do)',
  kind: 'degrees',
  icon: '🎯',
  srsPrefix: 'deg:',
  explanation: [
    'This is the heart of relative pitch, following the Alain Benbassat method popularised by the Functional Ear Trainer app. A short cadence (I–IV–V–I) establishes the key so your ear knows where "do" is. A note is then played and you name its scale degree.',
    'The trick is to not compare the note with the previous one, but to feel its tension: how much does it want to move, and where to? "ti" leans up into do, "fa" sinks down to mi, "so" feels stable but open. After you answer, the note resolves step by step to do so you hear that pull explicitly. Listen to that resolution every time – it is where the learning happens.',
    'We use a do-based minor: in a minor key the tonic is still "do" and the lowered notes become me, le and te. This keeps the tonic feeling identical between modes, which is what you need when transcribing. (You can switch to la-based labels in Settings if you prefer.)',
    'Levels grow from three notes in C major to the full chromatic scale in any key, several octaves, and multi-note sequences. The scheduler notices which degrees you confuse and asks them more often.',
  ],
  tips: [
    'Sing (or hum) the note and then sing your way down or up to do before answering. If that is too slow, at least imagine it.',
    'Do not race: accuracy first, speed comes with familiarity.',
    'If two degrees keep getting mixed up (typically la/so or re/ti), open Practice mode with just those two.',
  ],
  levels: [
    { id: 'd1', name: 'Do, mi, so', summary: 'The tonic triad in C major', description: 'Three notes that all feel stable but differ in colour: do is home, mi is warm and slightly raised, so is open and bright. Cadence before every note.', config: { ...base, mode: 'major', degrees: [0, 4, 7] }, questions: 15, passAccuracy: 0.9 },
    { id: 'd2', name: 'Add re and ti', summary: 'Neighbours of do', description: 're sits just above do and wants to fall back; ti sits just below and pushes up strongly. Both are "unstable" – notice how different they feel from mi and so.', config: { ...base, mode: 'major', degrees: [0, 2, 4, 7, 11] }, questions: 18, passAccuracy: 0.9 },
    { id: 'd3', name: 'Full major scale', summary: 'All seven diatonic notes, C major', description: 'fa (leans down to mi) and la (floats above so) complete the scale. la is the most commonly confused note – it is the tonic of the relative minor, so it feels stable-ish yet melancholic.', config: { ...base, mode: 'major', degrees: MAJOR }, questions: 20, passAccuracy: 0.9 },
    { id: 'd4', name: 'Any key', summary: 'Full major scale, random keys', description: 'The cadence now changes key every question. Your absolute-pitch memory is useless here – rely purely on the relationship to do.', config: { ...base, mode: 'major', degrees: MAJOR, keys: 'random' }, questions: 20, passAccuracy: 0.9 },
    { id: 'd5', name: 'Two octaves', summary: 'Major, random keys, notes above and below the cadence', description: 'The same degrees, now spread over two octaves. Octave does not change function: a high so is still so.', config: { ...base, mode: 'major', degrees: MAJOR, keys: 'random', octaves: 2 }, questions: 20, passAccuracy: 0.9 },
    { id: 'd6', name: 'First chromatics: fi and te', summary: 'Major plus #4 and b7', description: 'fi (#4) is the note that pulls to so and is behind the V/V sound; te (b7) gives the bluesy / mixolydian flavour and pulls down to la or so.', config: { ...base, mode: 'major', degrees: [...MAJOR, 6, 10], keys: 'random', octaves: 2 }, questions: 20, passAccuracy: 0.88 },
    { id: 'd7', name: 'Full chromatic (major)', summary: 'All 12 degrees relative to a major tonic', description: 'ra (b2), me (b3), le (b6) join the set. Every chromatic note "wants" to resolve to a diatonic neighbour – hear that first and the name follows.', config: { ...base, mode: 'major', degrees: ALL, keys: 'random', octaves: 2 }, questions: 24, passAccuracy: 0.85 },
    { id: 'd8', name: 'Minor: do, me, so', summary: 'The minor tonic triad', description: 'Minor cadence (i–iv–V–i). "me" is the lowered third – the note that makes the key sound minor. do and so feel much the same as in major.', config: { ...base, mode: 'minor', degrees: [0, 3, 7], keys: 'random' }, questions: 15, passAccuracy: 0.9 },
    { id: 'd9', name: 'Natural minor scale', summary: 'do re me fa so le te', description: 'le (b6) hangs heavily above so and falls back to it; te (b7) is a whole step below do and lacks the sharp pull that ti has in major.', config: { ...base, mode: 'minor', degrees: MINOR, keys: 'random' }, questions: 20, passAccuracy: 0.9 },
    { id: 'd10', name: 'Minor with la and ti', summary: 'Natural + harmonic/melodic minor', description: 'Raised 6 (la) and raised 7 (ti) appear constantly in real minor-key music (the V chord uses ti). Distinguish le/la and te/ti by their pull toward so and do.', config: { ...base, mode: 'minor', degrees: [...MINOR, 9, 11], keys: 'random', octaves: 2 }, questions: 22, passAccuracy: 0.88 },
    { id: 'd11', name: 'Full chromatic (minor)', summary: 'All 12 degrees relative to a minor tonic', description: 'Everything relative to a minor do across two octaves. Note how mi (natural 3) sounds "wrong but bright" in a minor context.', config: { ...base, mode: 'minor', degrees: ALL, keys: 'random', octaves: 2 }, questions: 24, passAccuracy: 0.85 },
    { id: 'd12', name: 'Two-note sequences (major)', summary: 'Identify both notes in order', description: 'The first step toward transcription: hold two notes in memory and name each one relative to do. Answer in order.', config: { ...base, mode: 'major', degrees: MAJOR, keys: 'random', octaves: 2, notesPerQuestion: 2 }, questions: 16, passAccuracy: 0.85 },
    { id: 'd13', name: 'Two-note sequences (minor)', summary: 'Both notes, minor key', description: 'Same skill in minor, including la and ti.', config: { ...base, mode: 'minor', degrees: [...MINOR, 9, 11], keys: 'random', octaves: 2, notesPerQuestion: 2 }, questions: 16, passAccuracy: 0.85 },
    { id: 'd14', name: 'Three-note sequences, mixed modes', summary: 'Major or minor each question', description: 'The cadence tells you the mode; then three notes. Keep do steady in your mind while the notes go by.', config: { ...base, mode: 'both', degrees: ALL, keys: 'random', octaves: 2, notesPerQuestion: 3 }, questions: 16, passAccuracy: 0.8 },
    { id: 'd15', name: 'Hold the key', summary: 'Cadence only every 4th question', description: 'Real music does not replay the cadence for you. Keep the key in your head across several questions. Three octaves, any degree, either mode.', config: { ...base, mode: 'both', degrees: ALL, keys: 'random', octaves: 3, cadenceEvery: 4, notesPerQuestion: 1, resolution: false }, questions: 24, passAccuracy: 0.85 },
  ],
};
