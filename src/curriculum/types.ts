import type { ExerciseConfig, ExerciseKind } from '../exercises/types';
import type { SingingConfig } from '../singing/types';

export interface Level<C = ExerciseConfig> {
  id: string;
  name: string;
  /** one-line summary shown in the level list */
  summary: string;
  /** what this level is testing and how to approach it */
  description: string;
  config: C;
  /** number of questions in a test run */
  questions: number;
  /** accuracy needed to pass (0..1) */
  passAccuracy: number;
}

export interface Module {
  id: string;
  name: string;
  tagline: string;
  kind: ExerciseKind | 'singing';
  icon: string;
  /** Long-form explanation of the method behind this module */
  explanation: string[];
  tips: string[];
  levels: Level<ExerciseConfig | SingingConfig>[];
  /** prefix of SRS ids belonging to this module (for stats) */
  srsPrefix: string;
}
