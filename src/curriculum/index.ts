import { chordsModule } from './chords';
import { degreesModule } from './degrees';
import { harmonyModule } from './harmony';
import { intervalsModule } from './intervals';
import { singingModule } from './singing';
import { melodyModule, progressionModule } from './transcription';
import type { Level, Module } from './types';

export * from './types';

/** Curriculum order = recommended learning order. */
export const MODULES: Module[] = [degreesModule, intervalsModule, chordsModule, harmonyModule, singingModule, melodyModule, progressionModule];

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getLevel(moduleId: string, levelId: string): { module: Module; level: Level<Module['levels'][number]['config']>; index: number } | undefined {
  const module = getModule(moduleId);
  if (!module) return undefined;
  const index = module.levels.findIndex((l) => l.id === levelId);
  if (index < 0) return undefined;
  return { module, level: module.levels[index], index };
}
