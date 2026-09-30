import { describe, expect, it } from 'vitest';
import { degreeOf, resolutionPath, solfege, solfegeAlt, solfegeLaBased, degreeNumber, midiToFreq, freqToMidi, keyName } from './notes';

describe('solfege', () => {
  it('names diatonic major degrees', () => {
    expect([0, 2, 4, 5, 7, 9, 11].map((d) => solfege(d, 'major'))).toEqual(['do', 're', 'mi', 'fa', 'so', 'la', 'ti']);
  });
  it('names do-based minor degrees', () => {
    expect([0, 2, 3, 5, 7, 8, 10].map((d) => solfege(d, 'minor'))).toEqual(['do', 're', 'me', 'fa', 'so', 'le', 'te']);
    expect(solfege(9, 'minor')).toBe('la');
    expect(solfege(11, 'minor')).toBe('ti');
  });
  it('names chromatic degrees in major', () => {
    expect([1, 3, 6, 8, 10].map((d) => solfege(d, 'major'))).toEqual(['ra', 'me', 'fi', 'le', 'te']);
    expect(solfegeAlt(6, 'major')).toBe('se');
    expect(solfegeAlt(4, 'major')).toBeNull();
  });
  it('la-based minor relabels via relative major', () => {
    expect(solfegeLaBased(0)).toBe('la');
    expect(solfegeLaBased(3)).toBe('do');
  });
  it('degree numbers', () => {
    expect(degreeNumber(3)).toBe('b3');
    expect(degreeNumber(6)).toBe('#4');
  });
});

describe('pitch math', () => {
  it('converts midi and frequency', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(freqToMidi(880)).toBeCloseTo(81);
  });
  it('computes degrees', () => {
    expect(degreeOf(67, 60)).toBe(7);
    expect(degreeOf(59, 60)).toBe(11);
    expect(degreeOf(48, 60)).toBe(0);
  });
  it('names keys', () => {
    expect(keyName(61, 'major')).toBe('Db major');
    expect(keyName(61, 'minor')).toBe('C# minor');
  });
});

describe('resolutionPath', () => {
  it('resolves ti up to do', () => {
    expect(resolutionPath(71, 60, 'major')).toEqual([71, 72]);
  });
  it('resolves fa down to do via mi re', () => {
    expect(resolutionPath(65, 60, 'major')).toEqual([65, 64, 62, 60]);
  });
  it('resolves so up through la ti to do', () => {
    expect(resolutionPath(67, 60, 'major')).toEqual([67, 69, 71, 72]);
  });
  it('resolves me down in minor', () => {
    expect(resolutionPath(63, 60, 'minor')).toEqual([63, 62, 60]);
  });
  it('returns tonic alone', () => {
    expect(resolutionPath(72, 60, 'major')).toEqual([72]);
  });
});
