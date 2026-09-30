export interface IntervalDef {
  semitones: number;
  short: string;
  name: string;
}

export const INTERVALS: IntervalDef[] = [
  { semitones: 0, short: 'P1', name: 'Unison' },
  { semitones: 1, short: 'm2', name: 'Minor 2nd' },
  { semitones: 2, short: 'M2', name: 'Major 2nd' },
  { semitones: 3, short: 'm3', name: 'Minor 3rd' },
  { semitones: 4, short: 'M3', name: 'Major 3rd' },
  { semitones: 5, short: 'P4', name: 'Perfect 4th' },
  { semitones: 6, short: 'TT', name: 'Tritone' },
  { semitones: 7, short: 'P5', name: 'Perfect 5th' },
  { semitones: 8, short: 'm6', name: 'Minor 6th' },
  { semitones: 9, short: 'M6', name: 'Major 6th' },
  { semitones: 10, short: 'm7', name: 'Minor 7th' },
  { semitones: 11, short: 'M7', name: 'Major 7th' },
  { semitones: 12, short: 'P8', name: 'Octave' },
  { semitones: 13, short: 'm9', name: 'Minor 9th' },
  { semitones: 14, short: 'M9', name: 'Major 9th' },
  { semitones: 15, short: 'm10', name: 'Minor 10th' },
  { semitones: 16, short: 'M10', name: 'Major 10th' },
  { semitones: 17, short: 'P11', name: 'Perfect 11th' },
  { semitones: 19, short: 'P12', name: 'Perfect 12th' },
];

export function intervalDef(semitones: number): IntervalDef {
  const d = INTERVALS.find((i) => i.semitones === semitones);
  if (d) return d;
  return { semitones, short: `${semitones}st`, name: `${semitones} semitones` };
}

/** Well-known reference songs to help beginners anchor intervals. */
export const INTERVAL_SONGS: Record<number, string> = {
  1: 'Jaws theme / Für Elise (opening)',
  2: 'Happy Birthday (first two notes)',
  3: 'Greensleeves / Smoke on the Water',
  4: 'Oh When the Saints / Kumbaya',
  5: 'Here Comes the Bride / Amazing Grace',
  6: 'The Simpsons theme / Maria (West Side Story)',
  7: 'Star Wars theme / Twinkle Twinkle',
  8: 'The Entertainer (3rd–4th notes) / Love Story theme',
  9: 'My Bonnie Lies Over the Ocean / NBC chime',
  10: 'Somewhere (West Side Story) / Star Trek (original)',
  11: 'Take On Me (chorus leap) / Superman theme (up-octave then down)',
  12: 'Somewhere Over the Rainbow',
};

export type IntervalDirection = 'asc' | 'desc' | 'harmonic';
