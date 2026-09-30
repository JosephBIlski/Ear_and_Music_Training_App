/**
 * Conflict-free-ish merging of two progress snapshots from different devices.
 * Rules are chosen so that merging is idempotent and order-independent as far
 * as possible (max / union / latest-wins), so repeated syncs never inflate counts.
 */
import type { SrsItem } from '../srs/scheduler';
import type { DailyPlan, SessionLog, SyncedData } from '../store/useStore';

export type SyncData = SyncedData;

export interface SyncSnapshot {
  version: 1;
  updatedAt: number;
  deviceId: string;
  data: SyncData;
}

export function mergeSrs(a: Record<string, SrsItem>, b: Record<string, SrsItem>): Record<string, SrsItem> {
  const out: Record<string, SrsItem> = { ...a };
  for (const [id, item] of Object.entries(b)) {
    const cur = out[id];
    if (!cur) {
      out[id] = item;
      continue;
    }
    const newer = item.lastSeen >= cur.lastSeen ? item : cur;
    out[id] = {
      ...newer,
      attempts: Math.max(cur.attempts, item.attempts),
      correct: Math.max(cur.correct, item.correct),
    };
  }
  return out;
}

export function mergeProgress(a: SyncData['progress'], b: SyncData['progress']): SyncData['progress'] {
  const out: SyncData['progress'] = {};
  for (const mod of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[mod] = { ...(a[mod] ?? {}) };
    for (const [lvl, r] of Object.entries(b[mod] ?? {})) {
      const cur = out[mod][lvl];
      if (!cur) {
        out[mod][lvl] = r;
        continue;
      }
      const newer = r.lastAt >= cur.lastAt ? r : cur;
      out[mod][lvl] = {
        attempts: Math.max(cur.attempts, r.attempts),
        bestAccuracy: Math.max(cur.bestAccuracy, r.bestAccuracy),
        passed: cur.passed || r.passed,
        lastAccuracy: newer.lastAccuracy,
        lastAt: newer.lastAt,
      };
    }
  }
  return out;
}

export function mergeHistory(a: SessionLog[], b: SessionLog[]): SessionLog[] {
  const byId = new Map<string, SessionLog>();
  for (const h of [...a, ...b]) byId.set(h.id, h);
  return Array.from(byId.values())
    .sort((x, y) => x.at - y.at)
    .slice(-2000);
}

export function mergeConfusions(a: SyncData['confusions'], b: SyncData['confusions']): SyncData['confusions'] {
  const out: SyncData['confusions'] = {};
  for (const kind of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[kind] = { ...(a[kind] ?? {}) };
    for (const [pair, n] of Object.entries(b[kind] ?? {})) out[kind][pair] = Math.max(out[kind][pair] ?? 0, n);
  }
  return out;
}

export function mergeDaily(a: DailyPlan | null, b: DailyPlan | null): DailyPlan | null {
  if (!a) return b;
  if (!b) return a;
  if (a.date !== b.date) return a.date > b.date ? a : b;
  const doneA = a.blocks.filter((x) => x.done).length;
  const doneB = b.blocks.filter((x) => x.done).length;
  return doneB > doneA ? b : a;
}

export function mergeData(local: SyncData, remote: SyncData): SyncData {
  const settingsFromRemote = (remote.settingsUpdatedAt ?? 0) > (local.settingsUpdatedAt ?? 0);
  return {
    settings: settingsFromRemote ? { ...local.settings, ...remote.settings } : local.settings,
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt ?? 0, remote.settingsUpdatedAt ?? 0),
    srs: mergeSrs(local.srs, remote.srs),
    progress: mergeProgress(local.progress, remote.progress),
    history: mergeHistory(local.history, remote.history),
    confusions: mergeConfusions(local.confusions, remote.confusions),
    daily: mergeDaily(local.daily, remote.daily),
  };
}

/** Cheap stable fingerprint to detect "nothing changed" and skip a push. */
export function fingerprint(data: SyncData): string {
  const s = JSON.stringify([
    data.settingsUpdatedAt,
    Object.keys(data.srs).length,
    Object.values(data.srs).reduce((a, i) => a + i.attempts + i.lastSeen, 0),
    data.history.length,
    data.history.length ? data.history[data.history.length - 1].id : '',
    Object.values(data.progress).reduce((a, m) => a + Object.values(m).reduce((x, r) => x + r.attempts + r.lastAt, 0), 0),
    Object.values(data.confusions).reduce((a, t) => a + Object.values(t).reduce((x, n) => x + n, 0), 0),
    data.daily ? `${data.daily.date}:${data.daily.blocks.filter((b) => b.done).length}` : '',
  ]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(16);
}
