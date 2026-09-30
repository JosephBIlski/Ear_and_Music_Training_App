/**
 * Builds the ~15-minute daily session: a mix of the current level in each
 * module, weighted toward what is due/weak, sized to the time budget.
 */
import { MODULES } from '../curriculum';
import { dueItems } from '../srs/scheduler';
import { currentLevelIndex, todayKey, type DailyBlock, type DailyPlan, type LevelResult, type Settings } from './useStore';
import type { SrsItem } from '../srs/scheduler';

/** Approximate seconds per question by module kind (including feedback). */
const SECONDS_PER_QUESTION: Record<string, number> = {
  degrees: 9,
  intervals: 7,
  chords: 8,
  harmony: 10,
  singing: 20,
  melody: 45,
  progression: 40,
};

export function buildDailyPlan(progress: Record<string, Record<string, LevelResult>>, srs: Record<string, SrsItem>, settings: Settings, date = todayKey()): DailyPlan {
  const budget = settings.dailyMinutes * 60;
  const blocks: DailyBlock[] = [];
  const dayIndex = Math.floor(new Date(date).getTime() / 86_400_000);

  const levelFor = (moduleId: string) => {
    const mod = MODULES.find((m) => m.id === moduleId)!;
    const idx = currentLevelIndex(progress, moduleId, mod.levels);
    return mod.levels[idx];
  };

  // Core: functional degrees every day.
  blocks.push({ moduleId: 'degrees', levelId: levelFor('degrees').id, questions: 12 });

  // Review block from due items, if there are any with history.
  const due = dueItems(srs).filter((i) => i.attempts >= 2);
  if (due.length >= 4) {
    // Review is served by the degrees runner picking due degree items, or intervals/chords by prefix.
    const degDue = due.filter((i) => i.id.startsWith('deg:')).length;
    const intDue = due.filter((i) => i.id.startsWith('int:')).length;
    const chDue = due.filter((i) => i.id.startsWith('chq:') || i.id.startsWith('chi:')).length;
    const best = [
      { m: 'degrees', n: degDue },
      { m: 'intervals', n: intDue },
      { m: 'chords', n: chDue },
    ].sort((a, b) => b.n - a.n)[0];
    if (best.n >= 4) blocks.push({ moduleId: best.m, levelId: levelFor(best.m).id, questions: 8, review: true });
  }

  // Alternate intervals / chord quality / harmony by day so each gets attention.
  const rotation = ['intervals', 'chords', 'harmony'];
  const a = rotation[dayIndex % 3];
  const b = rotation[(dayIndex + 1) % 3];
  blocks.push({ moduleId: a, levelId: levelFor(a).id, questions: 8 });
  blocks.push({ moduleId: b, levelId: levelFor(b).id, questions: 6 });

  // Singing: one exercise.
  const singLevel = levelFor('singing');
  blocks.push({ moduleId: 'singing', levelId: singLevel.id, questions: Math.min(singLevel.questions, 5) });

  // Transcription: alternate emphasis daily.
  if (dayIndex % 2 === 0) {
    blocks.push({ moduleId: 'melody', levelId: levelFor('melody').id, questions: 4 });
    blocks.push({ moduleId: 'progression', levelId: levelFor('progression').id, questions: 2 });
  } else {
    blocks.push({ moduleId: 'progression', levelId: levelFor('progression').id, questions: 3 });
    blocks.push({ moduleId: 'melody', levelId: levelFor('melody').id, questions: 3 });
  }

  // Fit to budget: scale question counts proportionally.
  const est = (bl: DailyBlock[]) => bl.reduce((s, b) => s + b.questions * (SECONDS_PER_QUESTION[b.moduleId] ?? 10), 0);
  let total = est(blocks);
  if (total > budget * 1.1 || total < budget * 0.85) {
    const factor = budget / total;
    for (const bl of blocks) bl.questions = Math.max(2, Math.round(bl.questions * factor));
    total = est(blocks);
  }
  return { date, blocks, current: 0, completed: false };
}

export function estimateMinutes(plan: DailyPlan): number {
  return Math.round(plan.blocks.reduce((s, b) => s + b.questions * (SECONDS_PER_QUESTION[b.moduleId] ?? 10), 0) / 60);
}
