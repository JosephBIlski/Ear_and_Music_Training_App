import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { degreeLabel, solfege, solfegeLaBased, degreeNumber, type Mode } from '../theory/notes';
import { chordFunction, chordType, INVERSION_NAMES } from '../theory/chords';
import { intervalDef } from '../theory/intervals';

/** Label helpers that respect user settings. */
export function useLabels() {
  const labelStyle = useStore((s) => s.settings.labelStyle);
  const minorLabelling = useStore((s) => s.settings.minorLabelling);

  const degree = useCallback(
    (d: number, mode: Mode) => degreeLabel(d, mode, { style: labelStyle, minorLabelling }),
    [labelStyle, minorLabelling],
  );
  /** Two-part label for pad buttons: main + secondary. */
  const degreeParts = useCallback(
    (d: number, mode: Mode): { main: string; sub: string | null } => {
      const sol = mode === 'minor' && minorLabelling === 'la-based' ? solfegeLaBased(d) : solfege(d, mode);
      const num = degreeNumber(d);
      if (labelStyle === 'solfege') return { main: sol, sub: null };
      if (labelStyle === 'numbers') return { main: num, sub: null };
      return { main: sol, sub: num };
    },
    [labelStyle, minorLabelling],
  );
  const interval = useCallback((semis: number) => intervalDef(semis).short, []);
  const quality = useCallback((token: string) => {
    const [type, inv] = token.split(':');
    const t = chordType(type);
    const name = t.symbol === '' ? 'maj' : t.symbol;
    return inv != null ? `${name} · ${INVERSION_NAMES[Number(inv)]}` : name;
  }, []);
  const fn = useCallback((id: string) => chordFunction(id).label, []);

  /** Generic token label by input kind. */
  const token = useCallback(
    (kind: 'degree' | 'interval' | 'chordQuality' | 'chordFunction' | 'pitch', value: string, mode: Mode) => {
      switch (kind) {
        case 'degree':
          return degree(Number(value), mode);
        case 'interval':
          return interval(Number(value));
        case 'chordQuality':
          return quality(value);
        case 'chordFunction':
          return fn(value);
        case 'pitch':
          return value;
      }
    },
    [degree, interval, quality, fn],
  );

  return { degree, degreeParts, interval, quality, fn, token };
}
