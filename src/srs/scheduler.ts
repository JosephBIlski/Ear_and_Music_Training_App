/**
 * Spaced repetition for ear-training items.
 *
 * Every distinct thing the ear can be tested on is an "item" with a stable id,
 * e.g. "deg:major:7" (so in a major key), "int:asc:4" (ascending major third),
 * "chq:min7" (minor seventh chord quality), "chf:major:IV" (IV chord in major).
 *
 * Two mechanisms work together:
 *  1. Long-term scheduling (SM-2 flavoured): each item has an ease and an
 *     interval in days. Correct answers grow the interval; misses reset it, so
 *     the item becomes "due" again quickly.
 *  2. Within-session weighting: when an exercise picks its next question it
 *     weights items by recent accuracy, due-ness and novelty, and misses are
 *     re-queued to reappear within a few questions (the Functional Ear Trainer
 *     behaviour of hammering the notes you get wrong).
 */

export interface SrsItem {
  id: string;
  attempts: number;
  correct: number;
  streak: number;
  ease: number; // 1.3 .. 3.0
  intervalDays: number;
  due: number; // epoch ms
  lastSeen: number; // epoch ms
  /** last up to 12 results, 1 = correct, 0 = wrong, newest last */
  recent: number[];
  /** average response time in ms for correct answers (exp. moving avg) */
  avgMs: number;
}

export function newItem(id: string, now = Date.now()): SrsItem {
  return { id, attempts: 0, correct: 0, streak: 0, ease: 2.2, intervalDays: 0, due: now, lastSeen: 0, recent: [], avgMs: 0 };
}

export function recentAccuracy(item: SrsItem | undefined, fallback = 0.5): number {
  if (!item || item.recent.length === 0) return fallback;
  const sum = item.recent.reduce((a, b) => a + b, 0);
  return sum / item.recent.length;
}

export function isDue(item: SrsItem | undefined, now = Date.now()): boolean {
  if (!item) return true;
  return item.due <= now;
}

const DAY = 86_400_000;

export function updateItem(item: SrsItem, correct: boolean, responseMs: number, now = Date.now()): SrsItem {
  const recent = [...item.recent, correct ? 1 : 0].slice(-12);
  const attempts = item.attempts + 1;
  const correctCount = item.correct + (correct ? 1 : 0);
  let ease = item.ease;
  let intervalDays = item.intervalDays;
  let streak = item.streak;
  if (correct) {
    streak += 1;
    // reward fast confident answers a little more
    const speedBonus = responseMs > 0 && responseMs < 2500 ? 0.05 : 0;
    ease = Math.min(3.0, ease + 0.08 + speedBonus);
    if (intervalDays === 0) intervalDays = 0.5;
    else if (intervalDays < 1) intervalDays = 1;
    else intervalDays = intervalDays * ease;
    // Only lengthen after a streak – one lucky guess should not bury an item.
    if (streak < 2) intervalDays = Math.min(intervalDays, 0.5);
  } else {
    streak = 0;
    ease = Math.max(1.3, ease - 0.25);
    intervalDays = 0;
  }
  intervalDays = Math.min(intervalDays, 45);
  const due = correct ? now + intervalDays * DAY : now; // wrong items are due immediately
  const avgMs = correct ? (item.avgMs === 0 ? responseMs : item.avgMs * 0.7 + responseMs * 0.3) : item.avgMs;
  return { ...item, attempts, correct: correctCount, streak, ease, intervalDays, due, lastSeen: now, recent, avgMs };
}

export interface PickOptions {
  /** ids picked most recently, newest last – used to avoid immediate repeats */
  history: string[];
  /** ids scheduled for re-test soon (misses) */
  requeue: string[];
  now?: number;
}

/**
 * Compute a selection weight for each candidate id.
 * Higher for: weak items, due items, unseen items, requeued misses.
 * Lower for: items asked in the last couple of questions.
 */
export function selectionWeights(ids: readonly string[], items: Record<string, SrsItem>, opts: PickOptions): number[] {
  const now = opts.now ?? Date.now();
  return ids.map((id) => {
    const it = items[id];
    const acc = recentAccuracy(it, 0.5);
    let w = 1 + (1 - acc) * 3.5; // 1 .. 4.5
    if (!it || it.attempts === 0) w += 1.5; // novelty
    if (isDue(it, now)) w += 1.0;
    if (opts.requeue.includes(id)) w += 4;
    const lastIdx = opts.history.lastIndexOf(id);
    if (lastIdx >= 0) {
      const distance = opts.history.length - lastIdx; // 1 = asked last question
      if (distance === 1) w *= ids.length > 1 ? 0.12 : 1;
      else if (distance === 2) w *= 0.45;
    }
    return w;
  });
}

/** Items sorted by weakness (for stats / "focus" hints). */
export function weakestItems(items: Record<string, SrsItem>, prefix: string, count = 5): SrsItem[] {
  return Object.values(items)
    .filter((i) => i.id.startsWith(prefix) && i.attempts >= 3)
    .sort((a, b) => recentAccuracy(a) - recentAccuracy(b) || b.attempts - a.attempts)
    .slice(0, count);
}

export function dueItems(items: Record<string, SrsItem>, prefix = '', now = Date.now()): SrsItem[] {
  return Object.values(items).filter((i) => i.id.startsWith(prefix) && i.attempts > 0 && i.due <= now);
}
