import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Timbre } from '../audio/engine';
import type { LabelStyle, MinorLabelling } from '../theory/notes';
import { newItem, updateItem, type SrsItem } from '../srs/scheduler';

export interface Settings {
  labelStyle: LabelStyle;
  minorLabelling: MinorLabelling;
  /** default answer input for degree questions */
  inputMode: 'degrees' | 'piano';
  timbre: Timbre;
  volume: number;
  /** vocal range for singing exercises (midi) */
  vocalLow: number;
  vocalHigh: number;
  /** ms to show feedback before auto-advancing; 0 = wait for click */
  autoAdvanceMs: number;
  /** play the Benbassat resolution on feedback */
  playResolution: boolean;
  /** show key name during questions */
  showKeyName: boolean;
  useMidi: boolean;
  micSensitivity: number;
  /** allow starting any level regardless of unlocks */
  freeNavigation: boolean;
  /** daily session target in minutes */
  dailyMinutes: number;
}

export interface LevelResult {
  attempts: number;
  bestAccuracy: number;
  lastAccuracy: number;
  passed: boolean;
  lastAt: number;
}

export interface SessionLog {
  id: string;
  at: number;
  moduleId: string;
  levelId?: string;
  mode: 'test' | 'practice' | 'daily';
  questions: number;
  correct: number;
  durationSec: number;
}

export interface DailyBlock {
  moduleId: string;
  levelId: string;
  questions: number;
  /** override: pull questions from due SRS items instead of level config */
  review?: boolean;
  done?: boolean;
  correct?: number;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  blocks: DailyBlock[];
  current: number;
  completed: boolean;
}

interface State {
  settings: Settings;
  srs: Record<string, SrsItem>;
  progress: Record<string, Record<string, LevelResult>>;
  history: SessionLog[];
  /** moduleKind → "expected>given" → count */
  confusions: Record<string, Record<string, number>>;
  daily: DailyPlan | null;
  /** timestamp of first use */
  createdAt: number;

  updateSettings: (patch: Partial<Settings>) => void;
  recordAnswers: (results: { id: string; correct: boolean }[], responseMs: number) => void;
  recordConfusion: (kind: string, expected: string, given: string) => void;
  recordLevelResult: (moduleId: string, levelId: string, accuracy: number, passAccuracy: number) => void;
  logSession: (log: Omit<SessionLog, 'id' | 'at'>) => void;
  setDaily: (plan: DailyPlan | null) => void;
  completeDailyBlock: (index: number, correct: number) => void;
  resetProgress: () => void;
  importState: (json: string) => boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  labelStyle: 'both',
  minorLabelling: 'do-based',
  inputMode: 'degrees',
  timbre: 'piano',
  volume: 0.8,
  vocalLow: 48,
  vocalHigh: 67,
  autoAdvanceMs: 1800,
  playResolution: true,
  showKeyName: true,
  useMidi: false,
  micSensitivity: 0.01,
  freeNavigation: false,
  dailyMinutes: 15,
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      srs: {},
      progress: {},
      history: [],
      confusions: {},
      daily: null,
      createdAt: Date.now(),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      recordAnswers: (results, responseMs) =>
        set((s) => {
          const srs = { ...s.srs };
          const now = Date.now();
          for (const r of results) {
            const item = srs[r.id] ?? newItem(r.id, now);
            srs[r.id] = updateItem(item, r.correct, responseMs, now);
          }
          return { srs };
        }),

      recordConfusion: (kind, expected, given) =>
        set((s) => {
          const key = `${expected}>${given}`;
          const table = { ...(s.confusions[kind] ?? {}) };
          table[key] = (table[key] ?? 0) + 1;
          return { confusions: { ...s.confusions, [kind]: table } };
        }),

      recordLevelResult: (moduleId, levelId, accuracy, passAccuracy) =>
        set((s) => {
          const mod = { ...(s.progress[moduleId] ?? {}) };
          const prev = mod[levelId] ?? { attempts: 0, bestAccuracy: 0, lastAccuracy: 0, passed: false, lastAt: 0 };
          mod[levelId] = {
            attempts: prev.attempts + 1,
            bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
            lastAccuracy: accuracy,
            passed: prev.passed || accuracy >= passAccuracy,
            lastAt: Date.now(),
          };
          return { progress: { ...s.progress, [moduleId]: mod } };
        }),

      logSession: (log) =>
        set((s) => ({
          history: [...s.history, { ...log, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() }].slice(-2000),
        })),

      setDaily: (plan) => set({ daily: plan }),

      completeDailyBlock: (index, correct) =>
        set((s) => {
          if (!s.daily) return {};
          const blocks = s.daily.blocks.map((b, i) => (i === index ? { ...b, done: true, correct } : b));
          const next = blocks.findIndex((b) => !b.done);
          return { daily: { ...s.daily, blocks, current: next < 0 ? blocks.length : next, completed: next < 0 } };
        }),

      resetProgress: () => set({ srs: {}, progress: {}, history: [], confusions: {}, daily: null }),

      importState: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== 'object') return false;
          set({
            settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
            srs: data.srs ?? {},
            progress: data.progress ?? {},
            history: data.history ?? [],
            confusions: data.confusions ?? {},
            daily: data.daily ?? null,
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: 'ear-trainer-v1', version: 1 },
  ),
);

export function exportState(): string {
  const s = useStore.getState();
  return JSON.stringify({ settings: s.settings, srs: s.srs, progress: s.progress, history: s.history, confusions: s.confusions, daily: s.daily, exportedAt: new Date().toISOString() }, null, 2);
}

// --- derived helpers ----------------------------------------------------------

export function isLevelUnlocked(progress: State['progress'], settings: Settings, moduleId: string, levels: { id: string }[], index: number): boolean {
  if (settings.freeNavigation || index === 0) return true;
  const prev = levels[index - 1];
  return !!progress[moduleId]?.[prev.id]?.passed;
}

/** Index of the first not-yet-passed level (the "current" level). */
export function currentLevelIndex(progress: State['progress'], moduleId: string, levels: { id: string }[]): number {
  for (let i = 0; i < levels.length; i++) if (!progress[moduleId]?.[levels[i].id]?.passed) return i;
  return levels.length - 1;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Consecutive days (ending today or yesterday) with at least one logged session. */
export function computeStreak(history: SessionLog[]): number {
  const days = new Set(history.map((h) => todayKey(new Date(h.at))));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function minutesToday(history: SessionLog[]): number {
  const t = todayKey();
  return history.filter((h) => todayKey(new Date(h.at)) === t).reduce((a, h) => a + h.durationSec, 0) / 60;
}
