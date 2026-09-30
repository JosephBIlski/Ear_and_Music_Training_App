import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TIMBRES, type Timbre } from '../audio/engine';
import { ExerciseRunner } from '../components/ExerciseRunner';
import { SingingRunner } from '../components/SingingRunner';
import { getModule } from '../curriculum';
import type { ExerciseConfig } from '../exercises/types';
import { useLabels } from '../hooks/useLabels';
import type { SingingConfig } from '../singing/types';
import { currentLevelIndex, useStore } from '../store/useStore';
import { CHORD_FUNCTIONS, CHORD_TYPES, INVERSION_NAMES } from '../theory/chords';
import { INTERVALS } from '../theory/intervals';
import type { Mode } from '../theory/notes';

const COUNTS = [10, 20, 40, Infinity];

export function PracticePage() {
  const { moduleId = '' } = useParams();
  const navigate = useNavigate();
  const mod = getModule(moduleId);
  const progress = useStore((s) => s.progress);
  const labels = useLabels();
  const cur = mod ? currentLevelIndex(progress, mod.id, mod.levels) : 0;
  const [levelIdx, setLevelIdx] = useState(cur);
  const [config, setConfig] = useState<ExerciseConfig | SingingConfig>(() => (mod ? structuredClone(mod.levels[cur].config) : ({} as ExerciseConfig)));
  const [count, setCount] = useState<number>(20);
  const [running, setRunning] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const modesFor = useMemo(() => ['major', 'minor', 'both'] as const, []);

  if (!mod) return <div className="page">Unknown module.</div>;

  const loadLevel = (i: number) => {
    setLevelIdx(i);
    setConfig(structuredClone(mod.levels[i].config));
  };
  const patch = (p: Partial<ExerciseConfig | SingingConfig>) => setConfig((c) => ({ ...c, ...p }) as ExerciseConfig | SingingConfig);
  const toggleIn = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const modeOf = (c: { mode?: Mode | 'both' }): Mode => (c.mode === 'minor' ? 'minor' : 'major');

  const Chips = <T extends string | number>({ values, selected, onToggle, label }: { values: T[]; selected: T[]; onToggle: (v: T) => void; label: (v: T) => string }) => (
    <div className="chips">
      {values.map((v) => (
        <button key={String(v)} className={`chip ${selected.includes(v) ? 'on' : ''}`} onClick={() => onToggle(v)}>
          {label(v)}
        </button>
      ))}
    </div>
  );

  const timbreChips = 'timbres' in config || config.kind !== 'singing' ? (
    <label className="field">
      <span>Instruments (empty = your default)</span>
      <Chips values={TIMBRES.map((t) => t.id)} selected={((config as { timbres?: Timbre[] }).timbres ?? []) as Timbre[]} onToggle={(v) => patch({ timbres: toggleIn(((config as { timbres?: Timbre[] }).timbres ?? []) as Timbre[], v) } as Partial<ExerciseConfig>)} label={(v) => TIMBRES.find((t) => t.id === v)!.name} />
    </label>
  ) : null;

  const form = (() => {
    switch (config.kind) {
      case 'degrees':
        return (
          <>
            <label className="field">
              <span>Mode</span>
              <select value={config.mode} onChange={(e) => patch({ mode: e.target.value as Mode | 'both' })}>
                {modesFor.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Degrees</span>
              <Chips values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]} selected={config.degrees} onToggle={(d) => patch({ degrees: toggleIn(config.degrees, d).sort((a, b) => a - b) })} label={(d) => labels.degree(d, modeOf(config))} />
            </label>
            <div className="row">
              <label className="field">
                <span>Keys</span>
                <select value={config.keys} onChange={(e) => patch({ keys: e.target.value as 'C' | 'random' })}>
                  <option value="C">C only</option>
                  <option value="random">random</option>
                </select>
              </label>
              <label className="field">
                <span>Octaves</span>
                <select value={config.octaves} onChange={(e) => patch({ octaves: Number(e.target.value) as 1 | 2 | 3 })}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </label>
              <label className="field">
                <span>Notes per question</span>
                <select value={config.notesPerQuestion} onChange={(e) => patch({ notesPerQuestion: Number(e.target.value) })}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Cadence</span>
                <select value={config.cadence} onChange={(e) => patch({ cadence: e.target.value as 'full' | 'short' | 'tonic' | 'none' })}>
                  <option value="full">I–IV–V–I</option>
                  <option value="short">I–V–I</option>
                  <option value="tonic">tonic chord</option>
                  <option value="none">none</option>
                </select>
              </label>
              <label className="field">
                <span>Cadence every N questions</span>
                <input type="number" min={1} max={20} value={config.cadenceEvery} onChange={(e) => patch({ cadenceEvery: Math.max(1, Number(e.target.value)) })} />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={config.resolution} onChange={(e) => patch({ resolution: e.target.checked })} /> Play resolution to do after answering
            </label>
            {timbreChips}
          </>
        );
      case 'intervals':
        return (
          <>
            <label className="field">
              <span>Intervals</span>
              <Chips values={INTERVALS.filter((i) => i.semitones > 0).map((i) => i.semitones)} selected={config.intervals} onToggle={(s) => patch({ intervals: toggleIn(config.intervals, s).sort((a, b) => a - b) })} label={(s) => INTERVALS.find((i) => i.semitones === s)!.short} />
            </label>
            <label className="field">
              <span>Direction</span>
              <Chips values={['asc', 'desc', 'harmonic'] as const} selected={config.directions} onToggle={(d) => patch({ directions: toggleIn(config.directions, d) })} label={(d) => (d === 'asc' ? 'ascending' : d === 'desc' ? 'descending' : 'harmonic')} />
            </label>
            {timbreChips}
          </>
        );
      case 'chords':
        return (
          <>
            <label className="field">
              <span>Chord types</span>
              <Chips values={CHORD_TYPES.map((c) => c.id)} selected={config.types} onToggle={(t) => patch({ types: toggleIn(config.types, t) })} label={(t) => CHORD_TYPES.find((c) => c.id === t)!.name} />
            </label>
            <div className="row">
              <label className="field">
                <span>Inversions</span>
                <Chips values={[0, 1, 2, 3]} selected={config.inversions} onToggle={(i) => patch({ inversions: toggleIn(config.inversions, i).sort() })} label={(i) => INVERSION_NAMES[i]} />
              </label>
              <label className="field">
                <span>Playback</span>
                <Chips values={['block', 'arpeggio'] as const} selected={config.styles} onToggle={(s) => patch({ styles: toggleIn(config.styles, s) })} label={(s) => s} />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={config.askInversion} onChange={(e) => patch({ askInversion: e.target.checked })} /> Ask for the inversion too
            </label>
            <label className="check">
              <input type="checkbox" checked={!!config.openVoicing} onChange={(e) => patch({ openVoicing: e.target.checked })} /> Open voicings
            </label>
            {timbreChips}
          </>
        );
      case 'harmony':
      case 'progression': {
        const m = config.mode;
        const fns = CHORD_FUNCTIONS.filter((f) => m === 'both' || f.mode === m);
        return (
          <>
            <label className="field">
              <span>Mode</span>
              <select value={config.mode} onChange={(e) => patch({ mode: e.target.value as Mode | 'both' })}>
                {modesFor.map((mm) => (
                  <option key={mm}>{mm}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Chords</span>
              <Chips values={fns.map((f) => f.id)} selected={config.functions} onToggle={(id) => patch({ functions: toggleIn(config.functions, id) })} label={(id) => `${CHORD_FUNCTIONS.find((f) => f.id === id)!.label}${m === 'both' ? ` (${CHORD_FUNCTIONS.find((f) => f.id === id)!.mode[0]})` : ''}`} />
            </label>
            <div className="row">
              <label className="field">
                <span>Inversions</span>
                <Chips values={[0, 1, 2]} selected={config.inversions} onToggle={(i) => patch({ inversions: toggleIn(config.inversions, i).sort() })} label={(i) => INVERSION_NAMES[i]} />
              </label>
              <label className="field">
                <span>Cadence</span>
                <select value={config.cadence} onChange={(e) => patch({ cadence: e.target.value as 'full' | 'short' | 'tonic' | 'none' })}>
                  <option value="full">I–IV–V–I</option>
                  <option value="short">I–V–I</option>
                  <option value="tonic">tonic chord</option>
                </select>
              </label>
              {config.kind === 'progression' && (
                <>
                  <label className="field">
                    <span>Chords per progression</span>
                    <input type="number" min={2} max={10} value={config.length[1]} onChange={(e) => patch({ length: [Math.min(config.length[0], Number(e.target.value)), Number(e.target.value)] })} />
                  </label>
                  <label className="field">
                    <span>Max replays (0 = unlimited)</span>
                    <input type="number" min={0} max={10} value={config.maxReplays ?? 0} onChange={(e) => patch({ maxReplays: Number(e.target.value) || undefined })} />
                  </label>
                </>
              )}
            </div>
            {config.kind === 'progression' && (
              <label className="check">
                <input type="checkbox" checked={!!config.withMelody} onChange={(e) => patch({ withMelody: e.target.checked })} /> Melody on top
              </label>
            )}
            {timbreChips}
          </>
        );
      }
      case 'melody':
        return (
          <>
            <label className="field">
              <span>Mode</span>
              <select value={config.mode} onChange={(e) => patch({ mode: e.target.value as Mode | 'both' })}>
                {modesFor.map((mm) => (
                  <option key={mm}>{mm}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Degrees</span>
              <Chips values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]} selected={config.degrees} onToggle={(d) => patch({ degrees: toggleIn(config.degrees, d).sort((a, b) => a - b) })} label={(d) => labels.degree(d, modeOf(config))} />
            </label>
            <div className="row">
              <label className="field">
                <span>Notes (min)</span>
                <input type="number" min={2} max={16} value={config.length[0]} onChange={(e) => patch({ length: [Number(e.target.value), Math.max(Number(e.target.value), config.length[1])] })} />
              </label>
              <label className="field">
                <span>Notes (max)</span>
                <input type="number" min={2} max={16} value={config.length[1]} onChange={(e) => patch({ length: [Math.min(config.length[0], Number(e.target.value)), Number(e.target.value)] })} />
              </label>
              <label className="field">
                <span>Max leap (semitones)</span>
                <input type="number" min={1} max={24} value={config.maxLeap} onChange={(e) => patch({ maxLeap: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Range (semitones)</span>
                <input type="number" min={7} max={36} value={config.range} onChange={(e) => patch({ range: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Rhythm</span>
                <select value={config.rhythm} onChange={(e) => patch({ rhythm: e.target.value as 'even' | 'simple' | 'varied' | 'syncopated' })}>
                  {['even', 'simple', 'varied', 'syncopated'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Cadence</span>
                <select value={config.cadence} onChange={(e) => patch({ cadence: e.target.value as 'full' | 'short' | 'tonic' | 'none' })}>
                  <option value="full">I–IV–V–I</option>
                  <option value="short">I–V–I</option>
                  <option value="tonic">tonic chord</option>
                  <option value="none">none</option>
                </select>
              </label>
              <label className="field">
                <span>Keys</span>
                <select value={config.keys} onChange={(e) => patch({ keys: e.target.value as 'C' | 'random' })}>
                  <option value="C">C only</option>
                  <option value="random">random</option>
                </select>
              </label>
              <label className="field">
                <span>Max replays (0 = unlimited)</span>
                <input type="number" min={0} max={10} value={config.maxReplays ?? 0} onChange={(e) => patch({ maxReplays: Number(e.target.value) || undefined })} />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={!!config.chromaticAsPassing} onChange={(e) => patch({ chromaticAsPassing: e.target.checked })} /> Chromatic notes only as passing tones
            </label>
            <label className="check">
              <input type="checkbox" checked={!!config.accompaniment} onChange={(e) => patch({ accompaniment: e.target.checked })} /> Chord accompaniment underneath
            </label>
            <label className="check">
              <input type="checkbox" checked={!!config.absolute} onChange={(e) => patch({ absolute: e.target.checked })} /> Absolute mode (no key, answer on the piano)
            </label>
            {timbreChips}
          </>
        );
      case 'singing':
        return (
          <>
            <div className="row">
              <label className="field">
                <span>Tolerance (cents)</span>
                <input type="number" min={10} max={100} value={config.toleranceCents} onChange={(e) => patch({ toleranceCents: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Hold (ms)</span>
                <input type="number" min={200} max={3000} step={100} value={config.holdMs} onChange={(e) => patch({ holdMs: Number(e.target.value) })} />
              </label>
            </div>
            {config.type === 'pattern' && (
              <label className="field">
                <span>Guide</span>
                <select value={config.guide} onChange={(e) => patch({ guide: e.target.value as 'full' | 'tonic' | 'none' })}>
                  <option value="full">piano plays each note</option>
                  <option value="tonic">tonic only</option>
                  <option value="none">nothing</option>
                </select>
              </label>
            )}
            {(config.type === 'degree' || config.type === 'echo') && (
              <label className="field">
                <span>Degrees</span>
                <Chips values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]} selected={config.degrees} onToggle={(d) => patch({ degrees: toggleIn(config.degrees, d).sort((a, b) => a - b) })} label={(d) => labels.degree(d, modeOf(config))} />
              </label>
            )}
            {config.type === 'interval' && (
              <label className="field">
                <span>Intervals</span>
                <Chips values={INTERVALS.filter((i) => i.semitones > 0 && i.semitones <= 12).map((i) => i.semitones)} selected={config.intervals} onToggle={(s) => patch({ intervals: toggleIn(config.intervals, s).sort((a, b) => a - b) })} label={(s) => INTERVALS.find((i) => i.semitones === s)!.short} />
              </label>
            )}
            <p className="tiny muted">Pick a level above to change exercise type; then adjust its parameters here.</p>
          </>
        );
    }
  })();

  if (running) {
    return (
      <div className="page narrow">
        <div className="row between mb">
          <div className="small muted">
            <Link to={`/module/${mod.id}`}>
              {mod.icon} {mod.name}
            </Link>{' '}
            · practice
          </div>
          <button className="btn small ghost" onClick={() => setRunning(false)}>
            ← Change settings
          </button>
        </div>
        {config.kind === 'singing' ? (
          <SingingRunner key={runKey} moduleId={mod.id} config={config} rounds={Number.isFinite(count) ? count : 999} mode="practice" title="Practice" onQuit={() => setRunning(false)} />
        ) : (
          <ExerciseRunner key={runKey} moduleId={mod.id} config={config} questionCount={count} mode="practice" title="Practice" onQuit={() => setRunning(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="page narrow">
      <div className="small muted">
        <Link to={`/module/${mod.id}`}>
          {mod.icon} {mod.name}
        </Link>
      </div>
      <h1>Practice mode</h1>
      <p className="muted">Free configuration. Results feed the spaced-repetition scheduler but do not unlock levels. Start from a level's settings and tweak.</p>
      <div className="card stack">
        <label className="field">
          <span>Start from level</span>
          <select value={levelIdx} onChange={(e) => loadLevel(Number(e.target.value))}>
            {mod.levels.map((l, i) => (
              <option key={l.id} value={i}>
                {i + 1}. {l.name}
              </option>
            ))}
          </select>
        </label>
        {form}
        <label className="field">
          <span>Questions</span>
          <div className="chips">
            {COUNTS.map((c) => (
              <button key={c} className={`chip ${count === c ? 'on' : ''}`} onClick={() => setCount(c)}>
                {Number.isFinite(c) ? c : '∞'}
              </button>
            ))}
          </div>
        </label>
        <div className="row">
          <button
            className="btn primary large"
            onClick={() => {
              setRunKey((k) => k + 1);
              setRunning(true);
            }}
          >
            Start practice
          </button>
          <button className="btn" onClick={() => navigate(`/module/${mod.id}`)}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
