/**
 * Storage back-ends for sync. Each provider stores one JSON snapshot.
 *
 *  - GitHub Gist: a private gist in the user's own account. Needs a personal
 *    access token with the "gist" scope. No server to run.
 *  - Custom endpoint: any URL that answers GET (returns the snapshot JSON or
 *    404) and PUT (stores the body). A ready-made Cloudflare Worker lives in
 *    sync-server/worker.js.
 */
import type { SyncSnapshot } from './merge';

export interface SyncProvider {
  /** Returns the remote snapshot, or null if nothing is stored yet. */
  pull(): Promise<SyncSnapshot | null>;
  /** Stores the snapshot. Returns any identifier the caller should remember (e.g. a newly created gist id). */
  push(snapshot: SyncSnapshot): Promise<{ id?: string }>;
}

export type SyncProviderKind = 'gist' | 'endpoint';

export interface SyncConfig {
  provider: SyncProviderKind | 'none';
  token: string;
  /** gist id (created automatically on first push if empty) */
  gistId: string;
  /** custom endpoint URL */
  endpoint: string;
  autoSync: boolean;
  lastSyncAt: number;
  lastError: string;
  deviceId: string;
}

const GIST_FILE = 'ear-trainer.json';

export class GistProvider implements SyncProvider {
  constructor(
    private token: string,
    private gistId: string,
  ) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async pull(): Promise<SyncSnapshot | null> {
    if (!this.gistId) return null;
    const res = await fetch(`https://api.github.com/gists/${this.gistId}`, { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub responded ${res.status} when reading the gist`);
    const gist = (await res.json()) as { files: Record<string, { content: string; truncated: boolean; raw_url: string }> };
    const file = gist.files[GIST_FILE];
    if (!file) return null;
    let content = file.content;
    if (file.truncated) {
      const raw = await fetch(file.raw_url);
      content = await raw.text();
    }
    return JSON.parse(content) as SyncSnapshot;
  }

  async push(snapshot: SyncSnapshot): Promise<{ id?: string }> {
    const body = JSON.stringify({
      description: 'Ear Trainer progress (synced automatically)',
      public: false,
      files: { [GIST_FILE]: { content: JSON.stringify(snapshot) } },
    });
    if (this.gistId) {
      const res = await fetch(`https://api.github.com/gists/${this.gistId}`, { method: 'PATCH', headers: { ...this.headers(), 'Content-Type': 'application/json' }, body });
      if (res.status === 404) {
        // gist was deleted – create a fresh one
        this.gistId = '';
        return this.push(snapshot);
      }
      if (!res.ok) throw new Error(`GitHub responded ${res.status} when updating the gist`);
      return { id: this.gistId };
    }
    const res = await fetch('https://api.github.com/gists', { method: 'POST', headers: { ...this.headers(), 'Content-Type': 'application/json' }, body });
    if (!res.ok) throw new Error(`GitHub responded ${res.status} when creating the gist (does the token have the "gist" scope?)`);
    const created = (await res.json()) as { id: string };
    this.gistId = created.id;
    return { id: created.id };
  }
}

export class EndpointProvider implements SyncProvider {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private headers(): HeadersInit {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async pull(): Promise<SyncSnapshot | null> {
    const res = await fetch(this.url, { headers: this.headers() });
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) throw new Error(`Sync server responded ${res.status}`);
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as SyncSnapshot;
  }

  async push(snapshot: SyncSnapshot): Promise<{ id?: string }> {
    const res = await fetch(this.url, { method: 'PUT', headers: { ...this.headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
    if (!res.ok) throw new Error(`Sync server responded ${res.status} on save`);
    return {};
  }
}

export function makeProvider(cfg: SyncConfig): SyncProvider | null {
  switch (cfg.provider) {
    case 'gist':
      return cfg.token ? new GistProvider(cfg.token, cfg.gistId) : null;
    case 'endpoint':
      return cfg.endpoint ? new EndpointProvider(cfg.endpoint, cfg.token) : null;
    default:
      return null;
  }
}
