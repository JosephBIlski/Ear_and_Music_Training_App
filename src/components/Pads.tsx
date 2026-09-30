import { useEffect } from 'react';
import { useLabels } from '../hooks/useLabels';
import { isDiatonic, type Mode } from '../theory/notes';
import { chordFunction, chordType, INVERSION_NAMES, inversionCount } from '../theory/chords';
import { intervalDef } from '../theory/intervals';

export type Mark = Record<string, 'correct' | 'wrong' | 'selected'>;

interface BaseProps {
  onPick: (token: string) => void;
  disabled?: boolean;
  marks?: Mark;
  /** enable number-key shortcuts */
  keyboard?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

function useHotkeys(tokens: string[], onPick: (t: string) => void, enabled: boolean | undefined, disabled: boolean | undefined) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      const idx = KEYS.indexOf(e.key);
      if (idx >= 0 && idx < tokens.length) {
        e.preventDefault();
        onPick(tokens[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tokens, onPick, enabled, disabled]);
}

export function DegreePad({ choices, mode, onPick, disabled, marks = {}, keyboard }: BaseProps & { choices: number[]; mode: Mode }) {
  const { degreeParts } = useLabels();
  const sorted = [...choices].sort((a, b) => a - b);
  const tokens = sorted.map(String);
  useHotkeys(tokens, onPick, keyboard, disabled);
  return (
    <div className="pad">
      {sorted.map((d, i) => {
        const { main, sub } = degreeParts(d, mode);
        const mark = marks[String(d)];
        return (
          <button key={d} className={`pad-btn ${isDiatonic(d, mode) ? '' : 'chromatic'} ${mark ?? ''}`} onClick={() => onPick(String(d))} disabled={disabled}>
            {keyboard && i < KEYS.length && <span className="key">{KEYS[i]}</span>}
            {main}
            {sub && <small>{sub}</small>}
          </button>
        );
      })}
    </div>
  );
}

export function IntervalPad({ choices, onPick, disabled, marks = {}, keyboard }: BaseProps & { choices: number[] }) {
  const sorted = [...choices].sort((a, b) => a - b);
  const tokens = sorted.map(String);
  useHotkeys(tokens, onPick, keyboard, disabled);
  return (
    <div className="pad">
      {sorted.map((s, i) => {
        const def = intervalDef(s);
        const mark = marks[String(s)];
        return (
          <button key={s} className={`pad-btn ${mark ?? ''}`} onClick={() => onPick(String(s))} disabled={disabled}>
            {keyboard && i < KEYS.length && <span className="key">{KEYS[i]}</span>}
            {def.short}
            <small>{def.name}</small>
          </button>
        );
      })}
    </div>
  );
}

export function ChordQualityPad({ choices, inversions, askInversion, onPick, disabled, marks = {}, keyboard }: BaseProps & { choices: string[]; inversions: number[]; askInversion: boolean }) {
  if (!askInversion) {
    return <SimpleQualityPad choices={choices} onPick={onPick} disabled={disabled} marks={marks} keyboard={keyboard} />;
  }
  return (
    <div className="stack">
      {choices.map((type) => {
        const t = chordType(type);
        const invs = inversions.filter((i) => i < inversionCount(type));
        return (
          <div key={type} className="row">
            <span style={{ width: 90, fontWeight: 700 }}>{t.symbol === '' ? 'maj' : t.symbol}</span>
            {invs.map((inv) => {
              const token = `${type}:${inv}`;
              const mark = marks[token];
              return (
                <button key={token} className={`pad-btn ${mark ?? ''}`} style={{ minHeight: 48, flex: 1 }} onClick={() => onPick(token)} disabled={disabled}>
                  {INVERSION_NAMES[inv]}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function SimpleQualityPad({ choices, onPick, disabled, marks = {}, keyboard }: BaseProps & { choices: string[] }) {
  useHotkeys(choices, onPick, keyboard, disabled);
  return (
    <div className="pad">
      {choices.map((type, i) => {
        const t = chordType(type);
        const mark = marks[type];
        return (
          <button key={type} className={`pad-btn ${mark ?? ''}`} onClick={() => onPick(type)} disabled={disabled}>
            {keyboard && i < KEYS.length && <span className="key">{KEYS[i]}</span>}
            {t.symbol === '' ? 'maj' : t.symbol}
            <small>{t.name}</small>
          </button>
        );
      })}
    </div>
  );
}

export function FunctionPad({ choices, onPick, disabled, marks = {}, keyboard }: BaseProps & { choices: string[]; mode: Mode }) {
  // order by root degree then category for a musically sensible layout
  const sorted = [...choices].sort((a, b) => {
    const fa = chordFunction(a);
    const fb = chordFunction(b);
    const cat = (c: string) => ['diatonic', 'seventh', 'borrowed', 'secondary'].indexOf(c);
    return cat(fa.category) - cat(fb.category) || fa.rootDegree - fb.rootDegree;
  });
  useHotkeys(sorted, onPick, keyboard, disabled);
  return (
    <div className="pad">
      {sorted.map((id, i) => {
        const f = chordFunction(id);
        const mark = marks[id];
        return (
          <button key={id} className={`pad-btn ${f.category !== 'diatonic' && f.category !== 'seventh' ? 'chromatic' : ''} ${mark ?? ''}`} onClick={() => onPick(id)} disabled={disabled} title={f.description}>
            {keyboard && i < KEYS.length && <span className="key">{KEYS[i]}</span>}
            {f.label}
            <small>{chordType(f.type).name}</small>
          </button>
        );
      })}
    </div>
  );
}
