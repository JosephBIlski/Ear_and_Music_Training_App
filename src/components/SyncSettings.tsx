import { useEffect, useState } from 'react';
import { formatSyncTime, syncNow, useSync } from '../sync/engine';
import { canPromptInstall, isIos, isStandalone, onInstallChange, promptInstall } from '../pwa';

export function SyncSettings() {
  const { config, status, message, setConfig } = useSync();
  const [token, setToken] = useState(config.token);
  const [endpoint, setEndpoint] = useState(config.endpoint);
  const [gistId, setGistId] = useState(config.gistId);

  useEffect(() => {
    setToken(config.token);
    setEndpoint(config.endpoint);
    setGistId(config.gistId);
  }, [config.token, config.endpoint, config.gistId]);

  const save = () => setConfig({ token: token.trim(), endpoint: endpoint.trim(), gistId: gistId.trim(), lastError: '' });
  const dirty = token.trim() !== config.token || endpoint.trim() !== config.endpoint || gistId.trim() !== config.gistId;

  return (
    <div className="card stack">
      <h2>Sync between devices</h2>
      <p className="muted small">
        Keeps progress, spaced-repetition history and settings identical on every browser and phone you use. Changes from different devices are merged (best scores, all sessions, most recent item history), so you can practise on your phone and review on your laptop. Your token stays on this device only.
      </p>
      <label className="field">
        <span>Storage</span>
        <select value={config.provider} onChange={(e) => setConfig({ provider: e.target.value as typeof config.provider, lastError: '' })}>
          <option value="none">Off (this device only)</option>
          <option value="gist">Private GitHub Gist (no server needed)</option>
          <option value="endpoint">Custom sync server (Cloudflare Worker or your own)</option>
        </select>
      </label>

      {config.provider === 'gist' && (
        <>
          <div className="alert info small">
            Create a token at <b>github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token</b> with only the <b>gist</b> scope, paste it below, then press Sync now. A private gist is created automatically; on your other devices paste the same token and the gist id shown here.
          </div>
          <label className="field">
            <span>GitHub token (gist scope)</span>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_…" autoComplete="off" />
          </label>
          <label className="field">
            <span>Gist id (leave empty on the first device – filled in automatically)</span>
            <input type="text" value={gistId} onChange={(e) => setGistId(e.target.value)} placeholder="e.g. 3f2c9a…" />
          </label>
        </>
      )}
      {config.provider === 'endpoint' && (
        <>
          <div className="alert info small">
            Any URL that answers GET (returns the stored JSON or 404) and PUT (saves the body) with a bearer token works. A ready-to-deploy Cloudflare Worker is in <b>sync-server/</b> of the repository.
          </div>
          <label className="field">
            <span>Endpoint URL</span>
            <input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://ear-trainer-sync.yourname.workers.dev" />
          </label>
          <label className="field">
            <span>Token</span>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          </label>
        </>
      )}

      {config.provider !== 'none' && (
        <>
          <label className="check">
            <input type="checkbox" checked={config.autoSync} onChange={(e) => setConfig({ autoSync: e.target.checked })} /> Sync automatically (on start, after each exercise run, when leaving the app)
          </label>
          <div className="row">
            {dirty && (
              <button className="btn" onClick={save}>
                Save
              </button>
            )}
            <button
              className="btn primary"
              disabled={status === 'syncing'}
              onClick={async () => {
                if (dirty) save();
                await syncNow({ force: true });
              }}
            >
              Sync now
            </button>
            <div className="sync-status">
              <span className={`dot ${status === 'ok' ? 'ok' : status === 'syncing' ? 'busy' : status === 'error' ? 'err' : ''}`} />
              {status === 'error' ? <span style={{ color: 'var(--bad)' }}>{message || config.lastError}</span> : <span>{status === 'syncing' ? 'Syncing…' : `Last sync: ${formatSyncTime(config.lastSyncAt)}`}</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function InstallSettings() {
  const [, force] = useState(0);
  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);
  if (isStandalone()) {
    return (
      <div className="card">
        <h2>App</h2>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Running as an installed app. Updates are downloaded automatically and applied the next time you open it.
        </p>
      </div>
    );
  }
  return (
    <div className="card stack">
      <h2>Install as an app</h2>
      <p className="muted small">The site is a Progressive Web App: install it for a full-screen, offline-capable experience with its own icon.</p>
      {canPromptInstall() ? (
        <button className="btn primary" onClick={() => void promptInstall()}>
          Install Ear Trainer
        </button>
      ) : isIos() ? (
        <p className="small">
          On iPhone/iPad: open this page in <b>Safari</b>, tap the <b>Share</b> button, then <b>Add to Home Screen</b>. The microphone works inside the installed app on iOS 16.4 and later.
        </p>
      ) : (
        <p className="small">
          In Chrome or Edge use the <b>install icon</b> in the address bar (or the browser menu → "Install app" / "Add to Home screen"). On Android Chrome: menu → <b>Add to Home screen</b>.
        </p>
      )}
    </div>
  );
}
