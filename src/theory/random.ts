/** Small random helpers. All randomness in generators goes through these so tests can seed. */

let rngImpl: () => number = Math.random;

export function setRandomSource(fn: () => number) {
  rngImpl = fn;
}

export function resetRandomSource() {
  rngImpl = Math.random;
}

/** Deterministic mulberry32 generator (for tests). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rand(): number {
  return rngImpl();
}

export function randInt(min: number, max: number): number {
  // inclusive
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick from empty array');
  return arr[Math.floor(rand() * arr.length)];
}

export function chance(p: number): boolean {
  return rand() < p;
}

/** Weighted pick: weights must be non-negative and not all zero. */
export function weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return pick(items);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
