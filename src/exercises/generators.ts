import { concatPlans, sequencePlan, silence, type PlaybackPlan, type Timbre, mergePlans, shiftPlan } from '../audio/engine';
import { cadenceChords, cadenceLabels, type CadenceStyle } from '../theory/cadence';
import { buildChord, chordFunction, inversionCount, pianoVoicing, voiceChord } from '../theory/chords';
import { intervalDef, type IntervalDirection } from '../theory/intervals';
import { generateMelody, randomTempo } from '../theory/melody';
import { degreeOf, resolutionPath, type Mode, solfege, keyName } from '../theory/notes';
import { generateProgression } from '../theory/progression';
import { chance, pick, randInt } from '../theory/random';
import type {
  ChordsConfig,
  DegreesConfig,
  ExerciseConfig,
  GeneratorContext,
  HarmonyConfig,
  IntervalsConfig,
  KeyContext,
  MelodyConfig,
  ProgressionConfig,
  Question,
} from './types';

// ---------------------------------------------------------------------------
// helpers

function chooseMode(m: Mode | 'both'): Mode {
  return m === 'both' ? (chance(0.5) ? 'major' : 'minor') : m;
}

function chooseTonic(keys: 'C' | 'random'): number {
  // Tonics between F3 (53) and E4 (64) keep cadences in a comfortable register.
  if (keys === 'C') return 60;
  return randInt(53, 64);
}

function chooseTimbre(list: Timbre[] | undefined, fallback: Timbre): Timbre {
  return list && list.length ? pick(list) : fallback;
}

/** The level's cadence style, replaced by the user's preference unless the level has none. */
function effectiveCadence(cfg: CadenceStyle, ctx: GeneratorContext): CadenceStyle {
  if (cfg === 'none') return 'none';
  return ctx.cadenceOverride ?? cfg;
}

function cadencePlan(tonic: number, mode: Mode, style: CadenceStyle): { plan: PlaybackPlan; context?: KeyContext } {
  const chords = cadenceChords(tonic, mode, style);
  if (!chords.length) return { plan: silence(0) };
  const labels = cadenceLabels(mode, style);
  const sounds: KeyContext['sounds'] = [];
  let t = 0;
  chords.forEach((c, i) => {
    sounds.push({ label: labels[i] ?? '', start: t, end: t + c.duration });
    t += c.duration;
  });
  const plan = concatPlans(sequencePlan(chords.map((c) => ({ notes: c.notes, duration: c.duration, velocity: 0.7 }))), silence(0.35));
  return { plan, context: { style, label: labels.join(' – '), sounds } };
}

export const itemIds = {
  degree: (mode: Mode, degree: number) => `deg:${mode}:${degree}`,
  interval: (dir: IntervalDirection, semis: number) => `int:${dir}:${semis}`,
  chordQuality: (type: string) => `chq:${type}`,
  chordInversion: (type: string, inv: number) => `chi:${type}:${inv}`,
  chordFunction: (mode: Mode, fid: string) => `chf:${mode}:${fid}`,
};

// ---------------------------------------------------------------------------
// Functional degrees (Benbassat)

export function generateDegrees(cfg: DegreesConfig, ctx: GeneratorContext): Question {
  const cadenceNow = cfg.cadenceEvery <= 1 || ctx.index % cfg.cadenceEvery === 0 || !ctx.previous;
  const mode = cadenceNow || !ctx.previous ? chooseMode(cfg.mode) : ctx.previous.mode;
  const tonic = cadenceNow || !ctx.previous ? chooseTonic(cfg.keys) : ctx.previous.tonic;
  const timbre = chooseTimbre(cfg.timbres, ctx.defaultTimbre);

  // Range: 1 octave = tonic..tonic+12 ; 2 = tonic-12..tonic+12 ; 3 = tonic-12..tonic+24
  const low = cfg.octaves === 1 ? tonic : tonic - 12;
  const high = cfg.octaves === 3 ? tonic + 24 : tonic + 12;

  const degreeIds = cfg.degrees.map((d) => itemIds.degree(mode, d));
  const targets: number[] = [];
  const ids: string[] = [];
  for (let i = 0; i < cfg.notesPerQuestion; i++) {
    const id = ctx.pickItem(degreeIds);
    const degree = Number(id.split(':')[2]);
    const options: number[] = [];
    for (let m = low; m <= high; m++) if (degreeOf(m, tonic) === degree) options.push(m);
    let midi = pick(options);
    // for sequences keep notes within a comfortable leap of the previous
    if (targets.length) {
      const prev = targets[targets.length - 1];
      const near = options.filter((m) => Math.abs(m - prev) <= 9 && m !== prev);
      if (near.length) midi = pick(near);
    }
    targets.push(midi);
    ids.push(id);
  }

  const noteDur = cfg.notesPerQuestion > 1 ? 0.75 : 1.1;
  const targetPlan = sequencePlan(targets.map((m) => ({ notes: [m], duration: noteDur, velocity: 0.9 })));
  const cadStyle = effectiveCadence(cfg.cadence, ctx);
  const cad = cadenceNow ? cadencePlan(tonic, mode, cadStyle) : { plan: silence(0) };
  const fullPlan = cadenceNow ? concatPlans(cad.plan, targetPlan) : targetPlan;

  let feedbackPlan: PlaybackPlan | undefined;
  if (cfg.resolution) {
    // Benbassat resolution: walk each target stepwise to the tonic.
    const paths = targets.map((m) => resolutionPath(m, tonic, mode));
    const plans = paths.map((p) => sequencePlan(p.map((m, i) => ({ notes: [m], duration: i === p.length - 1 ? 0.7 : 0.32, velocity: 0.75 }))));
    feedbackPlan = concatPlans(...plans);
  }

  const names = targets.map((m) => solfege(degreeOf(m, tonic), mode)).join(' – ');
  return {
    kind: 'degrees',
    itemIds: ids,
    fullPlan,
    targetPlan,
    hasContext: cadenceNow && cadStyle !== 'none',
    context: cad.context,
    tonic,
    mode,
    timbre,
    input: { kind: 'degree', mode, choices: cfg.degrees, count: cfg.notesPerQuestion },
    answer: targets.map((m) => String(degreeOf(m, tonic))),
    prompt: cfg.notesPerQuestion > 1 ? `Which ${cfg.notesPerQuestion} degrees did you hear?` : 'Which degree did you hear?',
    explain: `${names} in ${keyName(tonic, mode)}`,
    feedbackPlan,
  };
}

// ---------------------------------------------------------------------------
// Intervals

export function generateInterval(cfg: IntervalsConfig, ctx: GeneratorContext): Question {
  const dir = pick(cfg.directions);
  const ids = cfg.intervals.map((s) => itemIds.interval(dir, s));
  const id = ctx.pickItem(ids);
  const semis = Number(id.split(':')[2]);
  const timbre = chooseTimbre(cfg.timbres, ctx.defaultTimbre);

  const lowRoot = cfg.low;
  const highRoot = cfg.high - semis;
  const root = randInt(lowRoot, Math.max(lowRoot, highRoot));
  let notes: number[][];
  let durations: number[];
  if (dir === 'asc') {
    notes = [[root], [root + semis]];
    durations = [0.7, 1.0];
  } else if (dir === 'desc') {
    notes = [[root + semis], [root]];
    durations = [0.7, 1.0];
  } else {
    notes = [[root, root + semis]];
    durations = [1.6];
  }
  const targetPlan = sequencePlan(notes.map((n, i) => ({ notes: n, duration: durations[i], velocity: 0.85 })));
  const def = intervalDef(semis);
  return {
    kind: 'intervals',
    itemIds: [id],
    fullPlan: targetPlan,
    targetPlan,
    hasContext: false,
    tonic: root,
    mode: 'major',
    timbre,
    input: { kind: 'interval', choices: cfg.intervals, count: 1 },
    answer: [String(semis)],
    prompt: dir === 'harmonic' ? 'Which interval is sounding?' : `Which interval (${dir === 'asc' ? 'ascending' : 'descending'})?`,
    explain: `${def.name} (${def.short}), ${dir === 'harmonic' ? 'harmonic' : dir === 'asc' ? 'ascending' : 'descending'}`,
  };
}

// ---------------------------------------------------------------------------
// Chord quality

export function generateChord(cfg: ChordsConfig, ctx: GeneratorContext): Question {
  const timbre = chooseTimbre(cfg.timbres, ctx.defaultTimbre);
  const style = pick(cfg.styles);
  let type: string;
  let inversion: number;
  if (cfg.askInversion) {
    const ids: string[] = [];
    for (const t of cfg.types) for (const inv of cfg.inversions) if (inv < inversionCount(t)) ids.push(itemIds.chordInversion(t, inv));
    const id = ctx.pickItem(ids);
    const parts = id.split(':');
    type = parts[1];
    inversion = Number(parts[2]);
  } else {
    const id = ctx.pickItem(cfg.types.map((t) => itemIds.chordQuality(t)));
    type = id.split(':')[1];
    const allowed = cfg.inversions.filter((i) => i < inversionCount(type));
    inversion = allowed.length ? pick(allowed) : 0;
  }
  const root = randInt(48, 62);
  let notes = buildChord(root, type, inversion);
  notes = voiceChord(notes, 46, 84);
  if (cfg.openVoicing && notes.length >= 3 && chance(0.5)) {
    // drop the lowest note an octave for a wider sound
    notes = [notes[0] - 12, ...notes.slice(1)];
  }
  let targetPlan: PlaybackPlan;
  if (style === 'arpeggio') {
    const arp = sequencePlan(notes.map((n) => ({ notes: [n], duration: 0.28, velocity: 0.8 })), 0, 0);
    // sustain the arpeggiated notes then hit the block chord
    const block = sequencePlan([{ notes, duration: 1.4, velocity: 0.8 }], arp.length ?? 0);
    targetPlan = mergePlans(arp, block);
  } else {
    targetPlan = sequencePlan([{ notes, duration: 1.7, velocity: 0.85 }]);
  }
  const itemId = cfg.askInversion ? itemIds.chordInversion(type, inversion) : itemIds.chordQuality(type);
  return {
    kind: 'chords',
    itemIds: [itemId],
    fullPlan: targetPlan,
    targetPlan,
    hasContext: false,
    tonic: root,
    mode: 'major',
    timbre,
    input: { kind: 'chordQuality', choices: cfg.types, inversions: cfg.inversions, askInversion: cfg.askInversion },
    answer: [cfg.askInversion ? `${type}:${inversion}` : type],
    prompt: cfg.askInversion ? 'Which chord quality and inversion?' : 'Which chord quality?',
  };
}

// ---------------------------------------------------------------------------
// Chord function (Roman numerals in a key)

export function generateHarmony(cfg: HarmonyConfig, ctx: GeneratorContext): Question {
  const mode = chooseMode(cfg.mode);
  const tonic = randInt(53, 64);
  const timbre = chooseTimbre(cfg.timbres, ctx.defaultTimbre);
  const fns = cfg.functions.map((id) => chordFunction(id)).filter((f) => f.mode === mode);
  const pool = fns.length ? fns : cfg.functions.map(chordFunction);
  const id = ctx.pickItem(pool.map((f) => itemIds.chordFunction(mode, f.id)));
  const fid = id.split(':')[2];
  const fn = chordFunction(fid);
  const allowedInv = cfg.inversions.filter((i) => i < inversionCount(fn.type));
  const inversion = allowedInv.length ? pick(allowedInv) : 0;
  const cadStyle = effectiveCadence(cfg.cadence, ctx);
  const cadChords = cadenceChords(tonic, mode, cadStyle);
  const last = cadChords.length ? cadChords[cadChords.length - 1].notes : [];
  const prev = last.length > 1 ? last.slice(1) : undefined;
  const notes = pianoVoicing(tonic + fn.rootDegree, fn.type, inversion, prev);
  const targetPlan = sequencePlan([{ notes, duration: 1.8, velocity: 0.85 }]);
  const cad = cadencePlan(tonic, mode, cadStyle);
  const fullPlan = concatPlans(cad.plan, targetPlan);
  return {
    kind: 'harmony',
    itemIds: [id],
    fullPlan,
    targetPlan,
    hasContext: cadStyle !== 'none',
    context: cad.context,
    tonic,
    mode,
    timbre,
    input: { kind: 'chordFunction', mode, choices: pool.map((f) => f.id), count: 1 },
    answer: [fid],
    prompt: 'Which chord (relative to the key)?',
    explain: `${fn.label} in ${keyName(tonic, mode)}${fn.description ? ' – ' + fn.description : ''}`,
  };
}

// ---------------------------------------------------------------------------
// Melody transcription

function accompanimentFor(tonic: number, mode: Mode, totalBeats: number, beat: number): PlaybackPlan {
  // Simple I – IV – V – I (or i – iv – V – i) pad under the melody, one chord per 2 beats.
  const cad = cadenceChords(tonic, mode, 'full');
  const events = [];
  let t = 0;
  let i = 0;
  while (t < totalBeats * beat) {
    const c = cad[i % cad.length];
    const dur = Math.min(2 * beat, totalBeats * beat - t);
    events.push({ time: t, notes: c.notes.map((n) => n - 12).filter((n) => n >= 36), duration: dur - 0.05, velocity: 0.35 });
    t += dur;
    i++;
  }
  return { events, length: totalBeats * beat };
}

export function generateMelodyQuestion(cfg: MelodyConfig, ctx: GeneratorContext): Question {
  const mode = chooseMode(cfg.mode);
  const tonic = cfg.absolute ? randInt(55, 66) : chooseTonic(cfg.keys);
  const timbre = chooseTimbre(cfg.timbres, ctx.defaultTimbre);
  const length = randInt(cfg.length[0], cfg.length[1]);
  const bpm = randomTempo(cfg.tempo[0], cfg.tempo[1]);
  const beat = 60 / bpm;
  const low = tonic - Math.floor((cfg.range - 12) / 2);
  const high = low + cfg.range;
  const melody = generateMelody({
    tonic,
    mode,
    degrees: cfg.degrees,
    length,
    low,
    high,
    maxLeap: cfg.maxLeap,
    startOnTonic: !cfg.absolute && chance(0.6),
    endStable: chance(0.7),
    rhythm: cfg.rhythm,
    chromaticAsPassing: cfg.chromaticAsPassing,
  });
  const melodyPlan = sequencePlan(melody.map((n) => ({ notes: [n.midi], duration: n.duration * beat, velocity: 0.9 })));
  const totalBeats = melody.reduce((a, n) => a + n.duration, 0);
  let targetPlan = melodyPlan;
  if (cfg.accompaniment) {
    targetPlan = mergePlans(melodyPlan, accompanimentFor(tonic, mode, totalBeats, beat));
  }
  const cadStyle = cfg.absolute ? 'none' : effectiveCadence(cfg.cadence, ctx);
  const cad = cadencePlan(tonic, mode, cadStyle);
  const fullPlan = cfg.absolute ? targetPlan : concatPlans(cad.plan, targetPlan);
  const ids = melody.map((n) => itemIds.degree(mode, n.degree));
  const answer = cfg.absolute ? melody.map((n) => String(n.midi)) : melody.map((n) => String(n.degree));
  return {
    kind: 'melody',
    itemIds: ids,
    fullPlan,
    targetPlan,
    hasContext: cadStyle !== 'none',
    context: cad.context,
    tonic,
    mode,
    timbre,
    input: cfg.absolute
      ? { kind: 'pitch', count: length, low: low - 3, high: high + 3 }
      : { kind: 'degree', mode, choices: cfg.degrees, count: length },
    answer,
    prompt: `Transcribe the ${length}-note melody`,
    explain: cfg.absolute
      ? `${bpm} bpm`
      : `${melody.map((n) => solfege(n.degree, mode)).join(' ')} in ${keyName(tonic, mode)}, ${bpm} bpm`,
    maxReplays: cfg.maxReplays,
  };
}

// ---------------------------------------------------------------------------
// Chord progression transcription

export function generateProgressionQuestion(cfg: ProgressionConfig, ctx: GeneratorContext): Question {
  const mode = chooseMode(cfg.mode);
  const tonic = chooseTonic(cfg.keys);
  const timbre = chooseTimbre(cfg.timbres, ctx.defaultTimbre);
  const length = randInt(cfg.length[0], cfg.length[1]);
  const bpm = randomTempo(cfg.tempo[0], cfg.tempo[1]);
  const beat = 60 / bpm;
  const fns = cfg.functions.map(chordFunction).filter((f) => f.mode === mode);
  const pool = fns.length ? fns : cfg.functions.map(chordFunction);
  const prog = generateProgression(pool, length, { startOnTonic: true, endOnTonic: chance(0.5) });
  const chordDur = beat * 2;
  let prev: number[] | undefined;
  const voicings = prog.map((f) => {
    const allowedInv = cfg.inversions.filter((i) => i < inversionCount(f.type));
    const inv = allowedInv.length ? pick(allowedInv) : 0;
    const v = pianoVoicing(tonic + f.rootDegree, f.type, inv, prev);
    prev = v.slice(1);
    return v;
  });
  let targetPlan: PlaybackPlan = sequencePlan(voicings.map((v) => ({ notes: v, duration: chordDur, velocity: 0.8 })));
  if (cfg.withMelody) {
    // a light melody using chord tones on top
    const events = [];
    for (let i = 0; i < voicings.length; i++) {
      const tones = voicings[i].slice(1);
      const top = Math.max(...tones);
      const notes = [top + 12, pick(tones) + 12, top + 12, pick(tones) + 12].map((n) => (n > 88 ? n - 12 : n));
      for (let k = 0; k < 4; k++) events.push({ time: i * chordDur + (k * chordDur) / 4, notes: [notes[k]], duration: chordDur / 4 - 0.03, velocity: 0.65 });
    }
    targetPlan = mergePlans(targetPlan, { events, length: targetPlan.length });
  }
  const cadStyle = effectiveCadence(cfg.cadence, ctx);
  const cad = cadencePlan(tonic, mode, cadStyle);
  const fullPlan = concatPlans(cad.plan, shiftPlan(targetPlan, 0));
  return {
    kind: 'progression',
    itemIds: prog.map((f) => itemIds.chordFunction(mode, f.id)),
    fullPlan,
    targetPlan,
    hasContext: cadStyle !== 'none',
    context: cad.context,
    tonic,
    mode,
    timbre,
    input: { kind: 'chordFunction', mode, choices: pool.map((f) => f.id), count: length },
    answer: prog.map((f) => f.id),
    prompt: `Transcribe the ${length}-chord progression`,
    explain: `${prog.map((f) => f.label).join(' – ')} in ${keyName(tonic, mode)}`,
    maxReplays: cfg.maxReplays,
  };
}

// ---------------------------------------------------------------------------

export function generateQuestion(cfg: ExerciseConfig, ctx: GeneratorContext): Question {
  switch (cfg.kind) {
    case 'degrees':
      return generateDegrees(cfg, ctx);
    case 'intervals':
      return generateInterval(cfg, ctx);
    case 'chords':
      return generateChord(cfg, ctx);
    case 'harmony':
      return generateHarmony(cfg, ctx);
    case 'melody':
      return generateMelodyQuestion(cfg, ctx);
    case 'progression':
      return generateProgressionQuestion(cfg, ctx);
  }
}
