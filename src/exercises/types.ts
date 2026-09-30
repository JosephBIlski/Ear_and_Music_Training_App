import type { PlaybackPlan, Timbre } from '../audio/engine';
import type { CadenceStyle } from '../theory/cadence';
import type { IntervalDirection } from '../theory/intervals';
import type { Mode } from '../theory/notes';

export type ExerciseKind = 'degrees' | 'intervals' | 'chords' | 'harmony' | 'melody' | 'progression';

/** Describes which answer UI to show and what the valid choices are. */
export type InputSpec =
  | { kind: 'degree'; mode: Mode; choices: number[]; count: number }
  | { kind: 'interval'; choices: number[]; count: 1 }
  | { kind: 'chordQuality'; choices: string[]; inversions: number[]; askInversion: boolean }
  | { kind: 'chordFunction'; mode: Mode; choices: string[]; count: number }
  | { kind: 'pitch'; count: number; low: number; high: number };

export interface Question {
  kind: ExerciseKind;
  /** SRS item ids tested, one per answer position (sequences) or a single one */
  itemIds: string[];
  /** Full playback including key-establishing context */
  fullPlan: PlaybackPlan;
  /** Just the target(s), for replaying without the cadence */
  targetPlan: PlaybackPlan;
  /** Whether the full plan contains a cadence (affects UI labels) */
  hasContext: boolean;
  tonic: number;
  mode: Mode;
  timbre: Timbre;
  input: InputSpec;
  /** canonical answer tokens, one per position */
  answer: string[];
  /** Short prompt shown while the question plays */
  prompt: string;
  /** Extra explanation shown after answering */
  explain?: string;
  /** Optional plan to play on feedback (e.g. Benbassat resolution to do) */
  feedbackPlan?: PlaybackPlan;
  /** Replay budget for transcription levels (undefined = unlimited) */
  maxReplays?: number;
}

export interface AnswerResult {
  correct: boolean;
  perPosition: boolean[];
  /** item id → correct? (for SRS updates) */
  items: { id: string; correct: boolean }[];
  /** for confusion tracking: expected/given tokens per position */
  pairs: { expected: string; given: string }[];
}

export function checkAnswer(q: Question, response: string[]): AnswerResult {
  const perPosition = q.answer.map((a, i) => response[i] === a);
  const items = q.itemIds.map((id, i) => ({ id, correct: perPosition[Math.min(i, perPosition.length - 1)] }));
  const pairs = q.answer.map((a, i) => ({ expected: a, given: response[i] ?? '' }));
  return { correct: perPosition.every(Boolean), perPosition, items, pairs };
}

// --- Level configurations ---------------------------------------------------

export interface DegreesConfig {
  kind: 'degrees';
  mode: Mode | 'both';
  degrees: number[];
  /** 'C' fixes C; 'random' picks any key */
  keys: 'C' | 'random';
  /** how many octaves the target may span (1 = one octave around middle) */
  octaves: 1 | 2 | 3;
  notesPerQuestion: number;
  cadence: CadenceStyle;
  /** play the cadence only every N questions (1 = every question) */
  cadenceEvery: number;
  /** play the Benbassat resolution to do after answering */
  resolution: boolean;
  timbres?: Timbre[];
}

export interface IntervalsConfig {
  kind: 'intervals';
  intervals: number[];
  directions: IntervalDirection[];
  low: number;
  high: number;
  timbres?: Timbre[];
}

export interface ChordsConfig {
  kind: 'chords';
  types: string[];
  inversions: number[];
  askInversion: boolean;
  styles: ('block' | 'arpeggio')[];
  openVoicing?: boolean;
  timbres?: Timbre[];
}

export interface HarmonyConfig {
  kind: 'harmony';
  mode: Mode | 'both';
  functions: string[];
  cadence: CadenceStyle;
  inversions: number[];
  timbres?: Timbre[];
}

export interface MelodyConfig {
  kind: 'melody';
  mode: Mode | 'both';
  degrees: number[];
  length: [number, number];
  maxLeap: number;
  /** total range in semitones */
  range: number;
  cadence: CadenceStyle;
  rhythm: 'even' | 'simple' | 'varied' | 'syncopated';
  tempo: [number, number];
  keys: 'C' | 'random';
  chromaticAsPassing?: boolean;
  /** play a chord accompaniment under the melody */
  accompaniment?: boolean;
  /** absolute mode: no key context, answer on the piano with real pitches */
  absolute?: boolean;
  maxReplays?: number;
  timbres?: Timbre[];
}

export interface ProgressionConfig {
  kind: 'progression';
  mode: Mode | 'both';
  functions: string[];
  length: [number, number];
  cadence: CadenceStyle;
  tempo: [number, number];
  keys: 'C' | 'random';
  inversions: number[];
  withMelody?: boolean;
  maxReplays?: number;
  timbres?: Timbre[];
}

export type ExerciseConfig = DegreesConfig | IntervalsConfig | ChordsConfig | HarmonyConfig | MelodyConfig | ProgressionConfig;

/** Function the generator uses to pick an SRS item id among candidates. */
export type ItemPicker = (ids: string[]) => string;

export interface GeneratorContext {
  pickItem: ItemPicker;
  /** question index within the current run (for cadenceEvery) */
  index: number;
  /** tonic/mode used by the previous question in the run (to keep key when cadence is skipped) */
  previous?: { tonic: number; mode: Mode };
  defaultTimbre: Timbre;
}
