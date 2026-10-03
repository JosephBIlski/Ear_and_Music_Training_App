import { describe, expect, it } from 'vitest';
import { generateQuestion } from './generators';
import { checkAnswer, type GeneratorContext } from './types';
import { degreesModule } from '../curriculum/degrees';
import { melodyModule, progressionModule } from '../curriculum/transcription';
import { harmonyModule } from '../curriculum/harmony';
import { chordsModule } from '../curriculum/chords';
import { intervalsModule } from '../curriculum/intervals';
import type { ExerciseConfig } from './types';
import { planLength } from '../audio/engine';

const ctx = (index = 0): GeneratorContext => ({ pickItem: (ids) => ids[Math.floor(Math.random() * ids.length)], index, defaultTimbre: 'piano' });

describe('generators', () => {
  it('produce answerable questions for every level of every module', () => {
    for (const mod of [degreesModule, intervalsModule, chordsModule, harmonyModule, melodyModule, progressionModule]) {
      for (const level of mod.levels) {
        for (let i = 0; i < 5; i++) {
          const q = generateQuestion(level.config as ExerciseConfig, ctx(i));
          expect(q.answer.length).toBeGreaterThan(0);
          expect(q.itemIds.length).toBe(q.answer.length);
          expect(planLength(q.fullPlan)).toBeGreaterThan(0);
          expect(planLength(q.fullPlan)).toBeGreaterThanOrEqual(planLength(q.targetPlan) - 1e-9);
          // the correct answer must be accepted and be among the input choices
          expect(checkAnswer(q, q.answer).correct).toBe(true);
          if (q.input.kind === 'degree') for (const a of q.answer) expect(q.input.choices).toContain(Number(a));
          if (q.input.kind === 'interval') expect(q.input.choices).toContain(Number(q.answer[0]));
          if (q.input.kind === 'chordFunction') for (const a of q.answer) expect(q.input.choices).toContain(a);
          if (q.input.kind === 'chordQuality') expect(q.input.choices).toContain(q.answer[0].split(':')[0]);
        }
      }
    }
  });

  it('grades sequences per position', () => {
    const q = generateQuestion(melodyModule.levels[1].config as ExerciseConfig, ctx());
    const wrong = q.answer.map((a, i) => (i === 0 ? (a === '0' ? '2' : '0') : a));
    const res = checkAnswer(q, wrong);
    expect(res.correct).toBe(false);
    expect(res.perPosition[0]).toBe(false);
    expect(res.perPosition.slice(1).every(Boolean)).toBe(true);
  });

  it('keeps the key when cadence is skipped', () => {
    const cfg = { ...(degreesModule.levels[14].config as ExerciseConfig) };
    const q1 = generateQuestion(cfg, ctx(0));
    const q2 = generateQuestion(cfg, { ...ctx(1), previous: { tonic: q1.tonic, mode: q1.mode } });
    expect(q2.tonic).toBe(q1.tonic);
    expect(q2.hasContext).toBe(false);
  });
});

describe('key context override', () => {
  it('replaces the cadence with a single do and labels it', () => {
    const cfg = degreesModule.levels[0].config as ExerciseConfig;
    const q = generateQuestion(cfg, { ...ctx(), cadenceOverride: 'note' });
    expect(q.context?.style).toBe('note');
    expect(q.context?.label).toBe('do');
    expect(q.context?.sounds).toHaveLength(1);
    expect(q.hasContext).toBe(true);
    // the do precedes the target in the full plan
    expect(planLength(q.fullPlan)).toBeGreaterThan(planLength(q.targetPlan));
  });
  it('does not add context to levels that have none', () => {
    const cfg = melodyModule.levels[9].config as ExerciseConfig; // absolute mode, no cadence
    const q = generateQuestion(cfg, { ...ctx(), cadenceOverride: 'full' });
    expect(q.hasContext).toBe(false);
    expect(q.context).toBeUndefined();
  });
  it('labels the full cadence with roman numerals and time spans', () => {
    const cfg = harmonyModule.levels[3].config as ExerciseConfig; // minor
    const q = generateQuestion(cfg, ctx());
    expect(q.context?.label).toBe('i – iv – V – i');
    const sounds = q.context!.sounds;
    for (let i = 1; i < sounds.length; i++) expect(sounds[i].start).toBeCloseTo(sounds[i - 1].end);
  });
});
