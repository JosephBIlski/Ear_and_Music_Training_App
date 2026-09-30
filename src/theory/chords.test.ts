import { describe, expect, it } from 'vitest';
import { buildChord, chordFunction, pianoVoicing, voiceChord, functionsFor } from './chords';
import { cadenceChords } from './cadence';
import { generateProgression } from './progression';
import { setRandomSource, seeded, resetRandomSource } from './random';

describe('chords', () => {
  it('builds triads and inversions', () => {
    expect(buildChord(60, 'maj')).toEqual([60, 64, 67]);
    expect(buildChord(60, 'min', 1)).toEqual([63, 67, 72]);
    expect(buildChord(60, 'dom7', 3)).toEqual([70, 72, 76, 79]);
  });
  it('voices within range', () => {
    const v = voiceChord([36, 40, 43], 55, 79);
    expect(v[0]).toBeGreaterThanOrEqual(55);
    expect(v[v.length - 1]).toBeLessThanOrEqual(79);
  });
  it('piano voicing has a bass root', () => {
    const v = pianoVoicing(65, 'maj', 0);
    expect(v[0] % 12).toBe(65 % 12);
    expect(v.length).toBe(4);
  });
  it('has functions per mode', () => {
    expect(functionsFor('major', ['diatonic']).map((f) => f.id)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(chordFunction('Vm').type).toBe('maj');
  });
});

describe('cadence', () => {
  it('full cadence is I IV V I', () => {
    const c = cadenceChords(60, 'major', 'full');
    expect(c.length).toBe(4);
    expect(c[0].notes[0] % 12).toBe(0);
    expect(c[1].notes[0] % 12).toBe(5);
    expect(c[2].notes[0] % 12).toBe(7);
  });
  it('minor cadence uses minor iv and major V', () => {
    const c = cadenceChords(57, 'minor', 'full');
    const iv = c[1].notes.slice(1).map((n) => (n - 57 - 5 + 120) % 12).sort((a, b) => a - b);
    expect(iv).toEqual([0, 3, 7]);
    const V = c[2].notes.slice(1).map((n) => (n - 57 - 7 + 120) % 12).sort((a, b) => a - b);
    expect(V).toEqual([0, 4, 7]);
  });
});

describe('progression', () => {
  it('starts on tonic and has the requested length', () => {
    setRandomSource(seeded(42));
    const allowed = functionsFor('major', ['diatonic']);
    for (let i = 0; i < 20; i++) {
      const p = generateProgression(allowed, 4, { startOnTonic: true });
      expect(p.length).toBe(4);
      expect(p[0].id).toBe('I');
    }
    resetRandomSource();
  });
});
