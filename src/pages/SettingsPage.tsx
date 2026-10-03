import { useEffect, useRef, useState } from 'react';
import { engine, TIMBRES, type Timbre } from '../audio/engine';
import { mic, type PitchFrame } from '../audio/mic';
import { midiInput } from '../audio/midi';
import { exportState, useStore, DEFAULT_SETTINGS } from '../store/useStore';
import { midiToName } from '../theory/notes';
import { InstallSettings, SyncSettings } from '../components/SyncSettings';

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const resetProgress = useStore((s) => s.resetProgress);
  const importState = useStore((s) => s.importState);
  const [micOn, setMicOn] = useState(false);
  const [frame, setFrame] = useState<PitchFrame | null>(null);
  const [midiStatus, setMidiStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!micOn) return;
    const unsub = mic.subscribe(setFrame);
    void mic.start();
    return () => {
      unsub();
      mic.stop();
    };
  }, [micOn]);
  useEffect(() => {
    mic.sensitivity = settings.micSensitivity;
  }, [settings.micSensitivity]);

  const preview = (t: Timbre) => {
    engine.setVolume(settings.volume);
    engine.playNow([60, 64, 67], 1.2, 0.8, t);
  };

  return (
    <div className="page narrow">
      <h1>Settings</h1>

      <div className="card stack">
        <h2>Labels & input</h2>
        <label className="field">
          <span>Degree labels</span>
          <select value={settings.labelStyle} onChange={(e) => update({ labelStyle: e.target.value as typeof settings.labelStyle })}>
            <option value="solfege">Solfège (do re mi)</option>
            <option value="numbers">Numbers (1 2 3)</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="field">
          <span>Minor key labelling</span>
          <select value={settings.minorLabelling} onChange={(e) => update({ minorLabelling: e.target.value as typeof settings.minorLabelling })}>
            <option value="do-based">do-based (do re me fa so le te) – Benbassat / Functional Ear Trainer</option>
            <option value="la-based">la-based (la ti do re mi fa so)</option>
          </select>
        </label>
        <label className="field">
          <span>Default answer input for degree questions</span>
          <select value={settings.inputMode} onChange={(e) => update({ inputMode: e.target.value as typeof settings.inputMode })}>
            <option value="degrees">Degree buttons</option>
            <option value="piano">On-screen piano (do is marked)</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.showKeyName} onChange={(e) => update({ showKeyName: e.target.checked })} /> Show the key name during questions
        </label>
        <div className="row">
          <label className="check">
            <input
              type="checkbox"
              checked={settings.useMidi}
              onChange={async (e) => {
                update({ useMidi: e.target.checked });
                if (e.target.checked) {
                  const ok = await midiInput.connect();
                  setMidiStatus(ok ? `MIDI connected: ${midiInput.inputNames.join(', ') || 'no devices yet'}` : 'Web MIDI is not available in this browser (Chrome/Edge support it).');
                } else setMidiStatus('');
              }}
            />{' '}
            Answer with a MIDI keyboard
          </label>
          {midiStatus && <span className="small muted">{midiStatus}</span>}
        </div>
      </div>

      <div className="card stack">
        <h2>Playback</h2>
        <label className="field">
          <span>Default instrument</span>
          <div className="chips">
            {TIMBRES.map((t) => (
              <button
                key={t.id}
                className={`chip ${settings.timbre === t.id ? 'on' : ''}`}
                onClick={() => {
                  update({ timbre: t.id });
                  preview(t.id);
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </label>
        <label className="field">
          <span>Volume: {Math.round(settings.volume * 100)}%</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => update({ volume: Number(e.target.value) })} onMouseUp={() => preview(settings.timbre)} />
        </label>
        <label className="field">
          <span>Auto-advance to the next question: {settings.autoAdvanceMs === 0 ? 'off – you press Next / Enter' : `after ${settings.autoAdvanceMs / 1000}s`}</span>
          <input type="range" min={0} max={4000} step={200} value={settings.autoAdvanceMs} onChange={(e) => update({ autoAdvanceMs: Number(e.target.value) })} />
          <span className="tiny muted">Applies to recognition and transcription questions and to singing rounds. A Next button is always available.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.playResolution} onChange={(e) => update({ playResolution: e.target.checked })} /> Play the note's resolution to do after answering (Benbassat method)
        </label>
      </div>

      <div className="card stack">
        <h2>Singing</h2>
        <p className="muted small">Set the lowest and highest notes you can sing comfortably. Singing exercises pick targets inside this range.</p>
        <div className="row">
          <label className="field">
            <span>Lowest: {midiToName(settings.vocalLow)}</span>
            <input type="range" min={36} max={72} value={settings.vocalLow} onChange={(e) => update({ vocalLow: Math.min(Number(e.target.value), settings.vocalHigh - 7) })} />
          </label>
          <button className="btn small" onClick={() => engine.playNow([settings.vocalLow], 1.2)}>
            ▶ low
          </button>
          <label className="field">
            <span>Highest: {midiToName(settings.vocalHigh)}</span>
            <input type="range" min={48} max={96} value={settings.vocalHigh} onChange={(e) => update({ vocalHigh: Math.max(Number(e.target.value), settings.vocalLow + 7) })} />
          </label>
          <button className="btn small" onClick={() => engine.playNow([settings.vocalHigh], 1.2)}>
            ▶ high
          </button>
        </div>
        <p className="tiny muted">Typical ranges: bass/baritone C2–E4 (36–64), tenor D3–A4 (50–69), alto F3–D5 (53–74), soprano A3–G5 (57–79).</p>
        <label className="field">
          <span>Microphone sensitivity (lower = picks up quieter singing): {settings.micSensitivity.toFixed(3)}</span>
          <input type="range" min={0.002} max={0.05} step={0.001} value={settings.micSensitivity} onChange={(e) => update({ micSensitivity: Number(e.target.value) })} />
        </label>
        <div className="row">
          <button className="btn small" onClick={() => setMicOn((v) => !v)}>
            {micOn ? 'Stop mic test' : 'Test microphone'}
          </button>
          {micOn && (
            <span className="small muted">
              {mic.state !== 'running' ? `mic: ${mic.state} ${mic.errorMessage}` : frame && !Number.isNaN(frame.midi) ? `hearing ${midiToName(Math.round(frame.midi))} (${frame.frequency.toFixed(1)} Hz, clarity ${frame.clarity.toFixed(2)})` : `listening… level ${(frame?.rms ?? 0).toFixed(3)}`}
            </span>
          )}
        </div>
      </div>

      <div className="card stack">
        <h2>Training</h2>
        <label className="field">
          <span>Daily session target: {settings.dailyMinutes} minutes</span>
          <input type="range" min={5} max={40} step={5} value={settings.dailyMinutes} onChange={(e) => update({ dailyMinutes: Number(e.target.value) })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.freeNavigation} onChange={(e) => update({ freeNavigation: e.target.checked })} /> Free navigation (start any level without passing the previous one)
        </label>
      </div>

      <SyncSettings />

      <InstallSettings />

      <div className="card stack">
        <h2>Data</h2>
        <p className="muted small">Everything is stored in this browser only. Export to move to another device or keep a backup.</p>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              const blob = new Blob([exportState()], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `ear-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
            }}
          >
            Export progress
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const ok = importState(await f.text());
              alert(ok ? 'Imported.' : 'That file could not be read.');
            }}
          />
          <span className="spacer" />
          <button className="btn ghost" onClick={() => update(DEFAULT_SETTINGS)}>
            Reset settings
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Delete all progress, statistics and scheduling data? This cannot be undone.')) resetProgress();
            }}
          >
            Reset all progress
          </button>
        </div>
      </div>
    </div>
  );
}
