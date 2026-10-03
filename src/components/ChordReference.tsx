import { useMemo, useState } from 'react';
import { useLabels } from '../hooks/useLabels';
import { CHORD_FUNCTIONS, CHORD_TYPES, buildChord, type ChordFunction } from '../theory/chords';
import { KEY_NAMES_MAJOR, KEY_NAMES_MINOR, NOTE_NAMES_FLAT, NOTE_NAMES_SHARP, pitchClass, scaleFor, type Mode } from '../theory/notes';
import { engine } from '../audio/engine';
import { useStore } from '../store/useStore';

interface Props {
  /** initial key; the user can change it inside the panel */
  tonic?: number;
  mode?: Mode;
  compact?: boolean;
}

/** Chord-tone formula names relative to the chord root (1 3 5, 1 b3 b5 …). */
function formula(intervals: number[], typeId: string): string {
  const name = (i: number): string => {
    switch (i) {
      case 0: return '1';
      case 1: return 'b2';
      case 2: return typeId.startsWith('sus') ? '2' : '2';
      case 3: return 'b3';
      case 4: return '3';
      case 5: return '4';
      case 6: return 'b5';
      case 7: return '5';
      case 8: return typeId === 'aug' ? '#5' : 'b6';
      case 9: return typeId === 'dim7' ? 'bb7' : '6';
      case 10: return 'b7';
      case 11: return '7';
      case 14: return '9';
      default: return String(i);
    }
  };
  return intervals.map(name).join(' ');
}

export function ChordReference({ tonic: initialTonic = 60, mode: initialMode = 'major', compact }: Props) {
  const labels = useLabels();
  const timbre = useStore((s) => s.settings.timbre);
  const [tonicPc, setTonicPc] = useState(pitchClass(initialTonic));
  const [mode, setMode] = useState<Mode>(initialMode);
  const [family, setFamily] = useState<'triads' | 'sevenths' | 'colour'>('triads');
  const [chromatic, setChromatic] = useState(false);
  const [qualityRoot, setQualityRoot] = useState<number | null>(null); // degree relative to do, null = do

  const keyNames = mode === 'major' ? KEY_NAMES_MAJOR : KEY_NAMES_MINOR;
  // Spell with flats when the key signature has flats (F, Bb, Eb, Ab, Db, Gb major and their relative minors).
  const FLAT_MAJORS = [5, 10, 3, 8, 1, 6];
  const useFlats = FLAT_MAJORS.includes(mode === 'major' ? tonicPc : (tonicPc + 3) % 12);
  const noteNames = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const noteName = (degree: number) => noteNames[(tonicPc + degree) % 12];
  const tonicMidi = 60 + tonicPc - (tonicPc > 6 ? 12 : 0);

  const scaleDegrees = chromatic ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : scaleFor(mode);

  const functions = useMemo(() => {
    const cats: ChordFunction['category'][] = family === 'triads' ? ['diatonic'] : family === 'sevenths' ? ['seventh'] : ['borrowed', 'secondary'];
    const list = CHORD_FUNCTIONS.filter((f) => f.mode === mode && cats.includes(f.category));
    return list;
  }, [mode, family]);

  const play = (degrees: number[]) => {
    engine.playNow(degrees.map((d) => tonicMidi + d), 1.2, 0.7, timbre);
  };

  const degreesOf = (rootDegree: number, typeId: string) => buildChord(rootDegree, typeId).map((d) => d % 12);

  const rootForQuality = qualityRoot ?? 0;

  return (
    <div className={`reference ${compact ? 'compact' : ''}`}>
      <div className="row">
        <label className="field">
          <span>Key</span>
          <select value={tonicPc} onChange={(e) => setTonicPc(Number(e.target.value))}>
            {keyNames.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="major">major</option>
            <option value="minor">minor</option>
          </select>
        </label>
        <label className="check" style={{ alignSelf: 'flex-end' }}>
          <input type="checkbox" checked={chromatic} onChange={(e) => setChromatic(e.target.checked)} /> chromatic
        </label>
      </div>

      <h3 className="mt">Scale of {keyNames[tonicPc]} {mode}</h3>
      <table className="plain ref-table">
        <thead>
          <tr>
            <th>Degree</th>
            {scaleDegrees.map((d) => (
              <td key={d} className="mono center">{labels.degreeParts(d, mode).sub ?? labels.degreeParts(d, mode).main}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Solfège</th>
            {scaleDegrees.map((d) => (
              <td key={d} className="center">
                <button className="chip tiny-chip" onClick={() => play([d])}>
                  {labels.degreeParts(d, mode).main === labels.degreeParts(d, mode).sub ? labels.degreeParts(d, mode).main : (labels.degreeParts(d, mode).main)}
                </button>
              </td>
            ))}
          </tr>
          <tr>
            <th>Note</th>
            {scaleDegrees.map((d) => (
              <td key={d} className="center mono">{noteName(d)}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="row between mt">
        <h3 style={{ margin: 0 }}>Chords in the key</h3>
        <div className="chips">
          {(['triads', 'sevenths', 'colour'] as const).map((f) => (
            <button key={f} className={`chip ${family === f ? 'on' : ''}`} onClick={() => setFamily(f)}>
              {f === 'colour' ? 'borrowed / secondary' : f}
            </button>
          ))}
        </div>
      </div>
      {functions.length === 0 ? (
        <p className="muted small">No chords of this kind are defined for {mode}. Try the other mode.</p>
      ) : (
        <table className="plain ref-table">
          <thead>
            <tr>
              <th>Function</th>
              <th>Chord</th>
              <th>Solfège</th>
              <th>Degrees</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {functions.map((f) => {
              const degs = degreesOf(f.rootDegree, f.type);
              const type = CHORD_TYPES.find((t) => t.id === f.type)!;
              return (
                <tr key={f.id} title={f.description}>
                  <td className="mono"><b>{f.label}</b></td>
                  <td className="mono">{noteName(f.rootDegree)}{type.symbol}</td>
                  <td>{degs.map((d) => labels.degreeParts(d, mode).main).join(' ')}</td>
                  <td className="mono muted">{degs.map((d) => labels.degreeParts(d, mode).sub ?? labels.degreeParts(d, mode).main).join(' ')}</td>
                  <td className="mono">{degs.map(noteName).join(' ')}</td>
                  <td>
                    <button className="btn small ghost" onClick={() => play(buildChord(f.rootDegree, f.type))} aria-label={`play ${f.label}`}>
                      ▶
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="row between mt">
        <h3 style={{ margin: 0 }}>Chord qualities</h3>
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
          <span className="small">root</span>
          <select value={rootForQuality} onChange={(e) => setQualityRoot(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => (
              <option key={d} value={d}>
                {noteName(d)} ({labels.degreeParts(d, mode).main})
              </option>
            ))}
          </select>
        </label>
      </div>
      <table className="plain ref-table">
        <thead>
          <tr>
            <th>Quality</th>
            <th>Formula</th>
            <th>Solfège</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {CHORD_TYPES.map((t) => {
            const degs = buildChord(rootForQuality, t.id).map((d) => d % 12);
            return (
              <tr key={t.id}>
                <td>
                  <b className="mono">{noteName(rootForQuality)}{t.symbol}</b> <span className="muted small">{t.name}</span>
                </td>
                <td className="mono muted">{formula(t.intervals, t.id)}</td>
                <td>{degs.map((d) => labels.degreeParts(d, mode).main).join(' ')}</td>
                <td className="mono">{degs.map(noteName).join(' ')}</td>
                <td>
                  <button className="btn small ghost" onClick={() => play(buildChord(rootForQuality, t.id))} aria-label={`play ${t.name}`}>
                    ▶
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="tiny muted mt">Solfège is relative to the key's do (do-based minor unless changed in Settings). Press ▶ to hear a chord in the current key.</p>
    </div>
  );
}

/** Slide-in drawer wrapper used inside exercises. */
export function ReferenceDrawer({ open, onClose, tonic, mode }: { open: boolean; onClose: () => void; tonic?: number; mode?: Mode }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Chord reference">
        <div className="row between mb">
          <h2 style={{ margin: 0 }}>Reference</h2>
          <button className="btn small" onClick={onClose}>
            Close <span className="kbd">Esc</span>
          </button>
        </div>
        <ChordReference key={`${tonic}-${mode}`} tonic={tonic} mode={mode} compact />
      </aside>
    </>
  );
}
