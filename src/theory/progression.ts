import type { ChordFunction } from './chords';
import { pick, weightedPick } from './random';

/**
 * Generate a chord progression from a set of allowed functions.
 * We nudge towards musically plausible motion: start on tonic, prefer
 * dominant→tonic, pre-dominant→dominant, and end on I or V.
 */
export function generateProgression(allowed: ChordFunction[], length: number, opts: { startOnTonic?: boolean; endOnTonic?: boolean } = {}): ChordFunction[] {
  if (allowed.length === 0) throw new Error('No chords allowed');
  const tonic = allowed.find((f) => f.rootDegree === 0 && (f.type === 'maj' || f.type === 'min' || f.type === 'maj7' || f.type === 'min7'));
  const out: ChordFunction[] = [];
  let prev: ChordFunction | null = null;
  for (let i = 0; i < length; i++) {
    const isLast = i === length - 1;
    let candidates = allowed.filter((c) => c !== prev || allowed.length === 1);
    if (i === 0 && opts.startOnTonic !== false && tonic) {
      out.push(tonic);
      prev = tonic;
      continue;
    }
    if (isLast && opts.endOnTonic && tonic && candidates.length > 1) {
      candidates = candidates.filter((c) => c.rootDegree === 0 || c.rootDegree === 7);
      if (!candidates.length) candidates = allowed;
    }
    const weights = candidates.map((c) => {
      let w = 1;
      if (prev) {
        // dominant -> tonic
        if (prev.rootDegree === 7 && c.rootDegree === 0) w += 2;
        // pre-dominant -> dominant
        if ((prev.rootDegree === 5 || prev.rootDegree === 2) && c.rootDegree === 7) w += 1.5;
        // secondary dominant resolves down a fifth
        if (prev.category === 'secondary') {
          const target = (prev.rootDegree + 5) % 12;
          if (c.rootDegree === target) w += 3;
          else w *= 0.3;
        }
        // avoid moving between two functions with the same root
        if (prev.rootDegree === c.rootDegree) w *= 0.3;
      }
      if (c.category === 'secondary' || c.category === 'borrowed') w *= 0.8;
      return w;
    });
    const next = candidates.length ? weightedPick(candidates, weights) : pick(allowed);
    out.push(next);
    prev = next;
  }
  return out;
}
