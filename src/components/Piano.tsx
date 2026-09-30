import { useCallback, useEffect, useMemo, useRef } from 'react';
import { engine } from '../audio/engine';
import { midiToName, degreeOf, solfege, type Mode } from '../theory/notes';
import { useStore } from '../store/useStore';

interface Props {
  low?: number; // midi of first key (should be a C ideally)
  high?: number;
  onNote?: (midi: number) => void;
  /** notes to highlight */
  highlight?: Record<number, 'active' | 'correct' | 'wrong'>;
  /** tonic to mark as do, and mode for degree labels */
  tonic?: number;
  mode?: Mode;
  showDegreeLabels?: boolean;
  showNoteNames?: boolean;
  disabled?: boolean;
  /** play the key sound when pressed */
  sound?: boolean;
  /** enable computer keyboard (a s d f g h j k = white keys from `low`, w e t y u = black) */
  keyboard?: boolean;
}

const KEYBOARD_MAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17,
};

const BLACK = new Set([1, 3, 6, 8, 10]);

export function Piano({ low = 48, high = 84, onNote, highlight = {}, tonic, mode = 'major', showDegreeLabels, showNoteNames, disabled, sound = true, keyboard }: Props) {
  const timbre = useStore((s) => s.settings.timbre);
  const pressedRef = useRef<Set<number>>(new Set());

  const press = useCallback(
    (midi: number) => {
      if (disabled) return;
      if (sound) engine.playNow([midi], 0.7, 0.75, timbre);
      onNote?.(midi);
    },
    [disabled, sound, onNote, timbre],
  );

  useEffect(() => {
    if (!keyboard) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      const off = KEYBOARD_MAP[e.key.toLowerCase()];
      if (off == null) return;
      const base = tonic != null ? tonic - ((tonic - low) % 12) : low; // start mapping at the C at/below tonic's octave
      const midi = base + off;
      if (midi < low || midi > high) return;
      if (pressedRef.current.has(midi)) return;
      pressedRef.current.add(midi);
      e.preventDefault();
      press(midi);
    };
    const up = (e: KeyboardEvent) => {
      const off = KEYBOARD_MAP[e.key.toLowerCase()];
      if (off == null) return;
      pressedRef.current.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [keyboard, low, high, tonic, press]);

  const whites = useMemo(() => {
    const out: number[] = [];
    for (let m = low; m <= high; m++) if (!BLACK.has(m % 12)) out.push(m);
    return out;
  }, [low, high]);
  const whiteCount = whites.length;

  const label = (m: number) => {
    if (showDegreeLabels && tonic != null) return solfege(degreeOf(m, tonic), mode);
    if (showNoteNames) return midiToName(m);
    if (m % 12 === 0) return midiToName(m);
    return '';
  };

  const cls = (m: number, base: string) => {
    const parts = [base];
    const h = highlight[m];
    if (h) parts.push(h);
    if (tonic != null && degreeOf(m, tonic) === 0) parts.push('tonic');
    return parts.join(' ');
  };

  return (
    <div className="piano" aria-label="piano keyboard">
      {whites.map((m) => (
        <div key={m} className={cls(m, 'white')} onPointerDown={() => press(m)} role="button" aria-label={midiToName(m)}>
          {label(m)}
        </div>
      ))}
      {whites.map((m, i) => {
        const black = m + 1;
        if (black > high || !BLACK.has(black % 12)) return null;
        // position: right edge of white key i, width ~ 60% of a white key
        const whiteWidth = 100 / whiteCount;
        const left = (i + 1) * whiteWidth - whiteWidth * 0.32;
        return (
          <div
            key={black}
            className={cls(black, 'black')}
            style={{ left: `${left}%`, width: `${whiteWidth * 0.64}%` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              press(black);
            }}
            role="button"
            aria-label={midiToName(black)}
          >
            {showDegreeLabels && tonic != null ? solfege(degreeOf(black, tonic), mode) : ''}
          </div>
        );
      })}
    </div>
  );
}
