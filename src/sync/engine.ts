/**
 * Sync orchestration: pull → merge → apply → push, with auto-sync on start,
 * after each finished exercise run, and when the app goes to the background.
 * Sync configuration (token etc.) is stored separately from the synced data so
 * it never travels to another device.
 */
import { create } from 'zustand';
import { getSyncedData, useStore } from '../store/useStore';
import { fingerprint, mergeData, type SyncSnapshot } from './merge';
import { makeProvider, type SyncConfig } from './providers';

const CONFIG_KEY = 'ear-trainer-sync-config';

function loadConfig(): SyncConfig {
  const base: SyncConfig = { provider: 'none', token: '', gistId: '', endpoint: '', autoSync: true, lastSyncAt: 0, lastError: '', deviceId: '' };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) Object.assign(base, JSON.parse(raw));
  } catch {
    /* ignore */
  }
  if (!base.deviceId) base.deviceId = Math.random().toString(36).slice(2, 10);
  return base;
}

function saveConfig(cfg: SyncConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'ok' | 'error';

interface SyncState {
  config: SyncConfig;
  status: SyncStatus;
  message: string;
  setConfig: (patch: Partial<SyncConfig>) => void;
}

export const useSync = create<SyncState>((set) => ({
  config: loadConfig(),
  status: loadConfig().provider === 'none' ? 'off' : 'idle',
  message: '',
  setConfig: (patch) =>
    set((s) => {
      const config = { ...s.config, ...patch };
      saveConfig(config);
      return { config, status: config.provider === 'none' ? 'off' : s.status === 'off' ? 'idle' : s.status };
    }),
}));

let inFlight: Promise<boolean> | null = null;
let lastPushedFingerprint = '';

/**
 * Run one full sync. Resolves true on success. Safe to call repeatedly; calls
 * made while a sync is running share the same promise.
 */
export function syncNow(opts: { force?: boolean } = {}): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { config, setConfig } = useSync.getState();
    const provider = makeProvider(config);
    if (!provider) {
      useSync.setState({ status: 'off' });
      return false;
    }
    useSync.setState({ status: 'syncing', message: 'Syncing…' });
    try {
      const local = getSyncedData();
      const remote = await provider.pull();
      let merged = local;
      if (remote && remote.data) {
        merged = mergeData(local, remote.data);
        // apply only if something differs from what we have locally
        if (fingerprint(merged) !== fingerprint(local)) useStore.getState().applySynced(merged);
      }
      const fp = fingerprint(merged);
      const remoteFp = remote?.data ? fingerprint(remote.data) : '';
      if (opts.force || fp !== remoteFp || !remote) {
        const snapshot: SyncSnapshot = { version: 1, updatedAt: Date.now(), deviceId: config.deviceId, data: merged };
        const res = await provider.push(snapshot);
        if (res.id && res.id !== config.gistId) setConfig({ gistId: res.id });
        lastPushedFingerprint = fp;
      } else {
        lastPushedFingerprint = fp;
      }
      setConfig({ lastSyncAt: Date.now(), lastError: '' });
      useSync.setState({ status: 'ok', message: 'Synced' });
      return true;
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setConfig({ lastError: msg });
      useSync.setState({ status: 'error', message: msg });
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

let pushTimer = 0;
/** Schedule a sync shortly (debounced) – used after runs finish. */
export function scheduleSync(delayMs = 4000) {
  const { config } = useSync.getState();
  if (config.provider === 'none' || !config.autoSync) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    if (fingerprint(getSyncedData()) !== lastPushedFingerprint) void syncNow();
  }, delayMs);
}

let installed = false;
/** Wire auto-sync: on start, after each logged session, and on backgrounding. Idempotent. */
export function installAutoSync() {
  if (installed) return;
  installed = true;
  const { config } = useSync.getState();
  if (config.provider !== 'none' && config.autoSync && navigator.onLine) void syncNow();

  let lastHistoryLen = useStore.getState().history.length;
  useStore.subscribe((s) => {
    if (s.history.length !== lastHistoryLen) {
      lastHistoryLen = s.history.length;
      scheduleSync();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') scheduleSync(0);
  });
  window.addEventListener('online', () => scheduleSync(1000));
}

export function formatSyncTime(t: number): string {
  if (!t) return 'never';
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  return new Date(t).toLocaleString();
}
