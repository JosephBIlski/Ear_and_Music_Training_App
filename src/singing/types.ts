import type { CadenceStyle } from '../theory/cadence';
import type { Mode } from '../theory/notes';

/**
 * Singing exercises. Each one is a sequence of "steps"; a step asks the user
 * to sing a specific pitch (or a pitch class in any octave) and is passed when
 * the detected pitch stays within tolerance for `holdMs`.
 */
export type SingingConfig =
  | {
      kind: 'singing';
      type: 'match';
      /** how many notes per run */
      notes: number;
      toleranceCents: number;
      holdMs: number;
    }
  | {
      kind: 'singing';
      type: 'pattern';
      mode: Mode;
      /** degrees, e.g. [0,7,0] for do-so-do. 12 = do an octave up, -1 = ti below */
      patterns: number[][];
      /** play the piano along with each target note */
      guide: 'full' | 'tonic' | 'none';
      toleranceCents: number;
      holdMs: number;
      rounds: number;
    }
  | {
      kind: 'singing';
      type: 'degree';
      mode: Mode | 'both';
      degrees: number[];
      cadence: CadenceStyle;
      toleranceCents: number;
      holdMs: number;
      rounds: number;
    }
  | {
      kind: 'singing';
      type: 'interval';
      intervals: number[];
      directions: ('asc' | 'desc')[];
      toleranceCents: number;
      holdMs: number;
      rounds: number;
    }
  | {
      kind: 'singing';
      type: 'echo';
      mode: Mode | 'both';
      degrees: number[];
      length: [number, number];
      maxLeap: number;
      cadence: CadenceStyle;
      toleranceCents: number;
      holdMs: number;
      rounds: number;
    };
