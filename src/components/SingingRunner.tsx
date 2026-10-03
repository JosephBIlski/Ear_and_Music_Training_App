import { useCallback, useEffect, useRef, useState } from 'react';
import { engine, sequencePlan, concatPlans, silence, type PlaybackHandle } from '../audio/engine';
import { mic, type PitchFrame } from '../audio/mic';
import { useLabels } from '../hooks/useLabels';
import type { SingingConfig } from '../singing/types';
import { useStore } from '../store/useStore';
import { cadenceChords, cadenceLabels, type CadenceStyle } from '../theory/cadence';
import { intervalDef } from '../theory/intervals';
import { generateMelody } from '../theory/melody';
import { clampMidi, keyName, midiToName, type Mode } from '../theory/notes';
import { chance, pick, randInt } from '../theory/random';
import { PitchMeter } from './PitchMeter';
import type { RunSummary } from './ExerciseRunner';

interface Step {
  target: number; // midi
  octaveFree: boolean;
  label: string;
  /** SRS id credited for this step */
  itemId?: string;
  /** notes to play when the step begins (guide) */
  guide?: number[];
}

interface Round {
  title: string;
  /** label of the key-establishing sounds, e.g. "I – IV – V – I" or "do" */
  contextLabel?: string;
  /** playback before the steps (cadence, reference note, melody...) */
  intro: ReturnType<typeof sequencePlan>;
  steps: Step[];
  tonic?: number;
  mode?: Mode;
  /** replayable */
  replay?: ReturnType<typeof sequencePlan>;
}

interface Props {
  moduleId: string;
  levelId?: string;
  config: SingingConfig;
  rounds: number;
  mode: 'test' | 'practice' | 'daily';
  passAccuracy?: number;
  title?: string;
  onFinish?: (summary: RunSummary) => void;
  onQuit?: () => void;
  autoStart?: boolean;
}

type Phase = 'idle' | 'mic-error' | 'intro' | 'singing' | 'step-done' | 'round-done' | 'summary';

const STEP_TIMEOUT_MS = 12_000;

export function SingingRunner({ moduleId, levelId, config, rounds, mode, passAccuracy, title, onFinish, onQuit, autoStart }: Props) {
  const settings = useStore((s) => s.settings);
  const recordAnswers = useStore((s) => s.recordAnswers);
  const recordLevelResult = useStore((s) => s.recordLevelResult);
  const logSession = useStore((s) => s.logSession);
  const labels = useLabels();

  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState<Round | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [frame, setFrame] = useState<PitchFrame | null>(null);
  const [hold, setHold] = useState(0);
  const [stepResults, setStepResults] = useState<boolean[]>([]);
  const [totals, setTotals] = useState({ steps: 0, passed: 0, centsSum: 0, centsCount: 0 });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [micError, setMicError] = useState('');

  const holdRef = useRef(0);
  const lastTimeRef = useRef(0);
  const listenFromRef = useRef(0);
  const centsAccRef = useRef<number[]>([]);
  const handleRef = useRef<PlaybackHandle | null>(null);
  const timersRef = useRef<number[]>([]);
  const startRef = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const stepRef = useRef<Step | null>(null);
  const missesRef = useRef<Record<string, number>>({});
  const finishedRef = useRef(false);
  phaseRef.current = phase;

  const after = (ms: number, fn: () => void) => timersRef.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    engine.setVolume(settings.volume);
    mic.sensitivity = settings.micSensitivity;
  }, [settings.volume, settings.micSensitivity]);

  useEffect(() => {
    return () => {
      clearTimers();
      handleRef.current?.stop();
      engine.stopAll();
      mic.stop();
    };
  }, []);

  // --- round construction -----------------------------------------------------
  const vocalLow = settings.vocalLow;
  const vocalHigh = settings.vocalHigh;

  const degLabel = useCallback((d: number, m: Mode) => labels.degree(d, m), [labels]);

  const keyContext = settings.keyContext;
  const buildRound = useCallback((): Round => {
    const eff = (style: CadenceStyle): CadenceStyle => (style === 'none' || keyContext === 'level' ? style : keyContext);
    switch (config.type) {
      case 'match': {
        const target = randInt(vocalLow, vocalHigh);
        return {
          title: 'Sing the note you hear',
          intro: sequencePlan([{ notes: [target], duration: 1.2, velocity: 0.8 }]),
          replay: sequencePlan([{ notes: [target], duration: 1.2, velocity: 0.8 }]),
          steps: [{ target, octaveFree: false, label: midiToName(target) }],
        };
      }
      case 'pattern': {
        const pattern = pick(config.patterns);
        const minD = Math.min(...pattern);
        const maxD = Math.max(...pattern);
        // choose tonic so the whole pattern sits within the vocal range
        const lo = vocalLow - minD;
        const hi = vocalHigh - maxD;
        const tonic = hi >= lo ? randInt(lo, hi) : Math.round((lo + hi) / 2);
        const tonicChord = cadenceChords(tonic, config.mode, 'tonic', 0.9);
        const intro = concatPlans(sequencePlan(tonicChord.map((c) => ({ notes: c.notes, duration: c.duration, velocity: 0.7 }))), silence(0.2));
        const steps: Step[] = pattern.map((d) => ({
          target: tonic + d,
          octaveFree: false,
          label: degLabel(((d % 12) + 12) % 12, config.mode),
          guide: config.guide === 'full' ? [tonic + d] : undefined,
        }));
        return { title: pattern.map((d) => degLabel(((d % 12) + 12) % 12, config.mode)).join(' – '), intro, steps, tonic, mode: config.mode };
      }
      case 'degree': {
        const m: Mode = config.mode === 'both' ? (chance(0.5) ? 'major' : 'minor') : config.mode;
        const tonic = randInt(53, 64);
        const degree = pickWeighted(config.degrees, (d) => `sing:deg:${m}:${d}`);
        const style = eff(config.cadence);
        const cad = cadenceChords(tonic, m, style);
        const intro = concatPlans(sequencePlan(cad.map((c) => ({ notes: c.notes, duration: c.duration, velocity: 0.7 }))), silence(0.2));
        const target = clampMidi(tonic + degree, vocalLow, vocalHigh);
        return {
          title: `Sing ${degLabel(degree, m)}`,
          contextLabel: cadenceLabels(m, style).join(' – '),
          intro,
          replay: intro,
          steps: [{ target, octaveFree: true, label: degLabel(degree, m), itemId: `sing:deg:${m}:${degree}` }],
          tonic,
          mode: m,
        };
      }
      case 'interval': {
        const semis = pickWeighted(config.intervals, (s) => `sing:int:${s}`);
        const dir = pick(config.directions);
        const ref = dir === 'asc' ? randInt(vocalLow, Math.max(vocalLow, vocalHigh - semis)) : randInt(Math.min(vocalHigh, vocalLow + semis), vocalHigh);
        const target = dir === 'asc' ? ref + semis : ref - semis;
        const def = intervalDef(semis);
        return {
          title: `Sing a ${def.name} ${dir === 'asc' ? 'above' : 'below'}`,
          intro: sequencePlan([{ notes: [ref], duration: 1.2, velocity: 0.8 }]),
          replay: sequencePlan([{ notes: [ref], duration: 1.2, velocity: 0.8 }]),
          steps: [{ target, octaveFree: false, label: `${def.short} ${dir === 'asc' ? '↑' : '↓'} from ${midiToName(ref)}`, itemId: `sing:int:${semis}` }],
        };
      }
      case 'echo': {
        const m: Mode = config.mode === 'both' ? (chance(0.5) ? 'major' : 'minor') : config.mode;
        // tonic inside the vocal range so the melody is singable
        const tonic = randInt(vocalLow + 2, Math.max(vocalLow + 2, vocalHigh - 9));
        const len = randInt(config.length[0], config.length[1]);
        const melody = generateMelody({ tonic, mode: m, degrees: config.degrees, length: len, low: vocalLow, high: vocalHigh, maxLeap: config.maxLeap, startOnTonic: chance(0.6), endStable: true, rhythm: 'even' });
        const style = eff(config.cadence);
        const cad = cadenceChords(tonic, m, style);
        const cadPlan = sequencePlan(cad.map((c) => ({ notes: c.notes, duration: c.duration, velocity: 0.65 })));
        const mel = sequencePlan(melody.map((n) => ({ notes: [n.midi], duration: 0.7, velocity: 0.85 })));
        const intro = concatPlans(cadPlan, silence(0.2), mel, silence(0.2));
        return {
          title: `Echo the ${len}-note melody`,
          contextLabel: cadenceLabels(m, style).join(' – '),
          intro,
          replay: mel,
          steps: melody.map((n) => ({ target: n.midi, octaveFree: false, label: degLabel(n.degree, m), itemId: `sing:deg:${m}:${n.degree}` })),
          tonic,
          mode: m,
        };
      }
    }
  }, [config, vocalLow, vocalHigh, degLabel, keyContext]);

  function pickWeighted<T>(choices: T[], idFor: (c: T) => string): T {
    const srs = useStore.getState().srs;
    const weights = choices.map((c) => {
      const it = srs[idFor(c)];
      if (!it || it.recent.length === 0) return 2;
      const acc = it.recent.reduce((a, b) => a + b, 0) / it.recent.length;
      return 1 + (1 - acc) * 3;
    });
    let total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < choices.length; i++) {
      r -= weights[i];
      if (r <= 0) return choices[i];
    }
    return choices[choices.length - 1];
  }

  // --- flow ----------------------------------------------------------------------
  const playPlan = useCallback((plan: ReturnType<typeof sequencePlan>) => {
    handleRef.current?.stop();
    const h = engine.play(plan, settings.timbre);
    handleRef.current = h;
    listenFromRef.current = performance.now() + (plan.length ?? 0) * 1000 + 150;
    return h;
  }, [settings.timbre]);

  const startStep = useCallback(
    (r: Round, i: number) => {
      const step = r.steps[i];
      stepRef.current = step;
      setStepIdx(i);
      holdRef.current = 0;
      setHold(0);
      centsAccRef.current = [];
      lastTimeRef.current = 0;
      setPhase('singing');
      if (step.guide) {
        playPlan(sequencePlan([{ notes: step.guide, duration: 0.8, velocity: 0.7 }]));
        // when guiding, listen while the note plays (headphones assumed)
        listenFromRef.current = performance.now() + 150;
      }
      after(STEP_TIMEOUT_MS, () => {
        if (phaseRef.current === 'singing' && stepRef.current === step) completeStep(false);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playPlan],
  );

  const startRound = useCallback(
    (idx: number) => {
      clearTimers();
      const r = buildRound();
      setRound(r);
      setRoundIdx(idx);
      setStepResults([]);
      setPhase('intro');
      const h = playPlan(r.intro);
      h.done.then(() => {
        if (phaseRef.current === 'intro') startStep(r, 0);
      });
    },
    [buildRound, playPlan, startStep],
  );

  const finish = useCallback(
    (t: typeof totals, roundsDone: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      clearTimers();
      mic.stop();
      const durationSec = Math.round((performance.now() - startRef.current) / 1000);
      const accuracy = t.steps ? t.passed / t.steps : 0;
      const s: RunSummary = {
        questions: roundsDone,
        correct: t.passed,
        accuracy,
        durationSec,
        passed: passAccuracy != null ? accuracy >= passAccuracy : undefined,
        missed: Object.entries(missesRef.current).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
      };
      if (roundsDone > 0) {
        logSession({ moduleId, levelId, mode, questions: roundsDone, correct: t.passed, durationSec });
        if (levelId && mode !== 'practice' && passAccuracy != null && roundsDone >= 2) recordLevelResult(moduleId, levelId, accuracy, passAccuracy);
      }
      setSummary(s);
      setPhase('summary');
      onFinish?.(s);
    },
    [logSession, recordLevelResult, moduleId, levelId, mode, passAccuracy, onFinish],
  );

  const completeStep = useCallback(
    (passed: boolean) => {
      const r = round;
      const step = stepRef.current;
      if (!r || !step || phaseRef.current !== 'singing') return;
      phaseRef.current = 'step-done';
      clearTimers();
      const cents = centsAccRef.current;
      const avgAbs = cents.length ? cents.reduce((a, c) => a + Math.abs(c), 0) / cents.length : 0;
      setTotals((t) => ({ steps: t.steps + 1, passed: t.passed + (passed ? 1 : 0), centsSum: t.centsSum + avgAbs, centsCount: t.centsCount + (cents.length ? 1 : 0) }));
      if (step.itemId) {
        recordAnswers([{ id: step.itemId, correct: passed }], 0);
        if (!passed) missesRef.current[step.itemId] = (missesRef.current[step.itemId] ?? 0) + 1;
      }
      const results = [...stepResults, passed];
      setStepResults(results);
      setPhase('step-done');
      // feedback: play the target if failed
      if (!passed) {
        playPlan(sequencePlan([{ notes: [step.target], duration: 1.0, velocity: 0.8 }]));
      }
      const delay = passed ? 500 : 1300;
      after(delay, () => {
        const nextStep = stepIdx + 1;
        if (nextStep < r.steps.length) startStep(r, nextStep);
        else setPhase('round-done');
      });
    },
    [round, stepIdx, stepResults, recordAnswers, playPlan, startStep],
  );

  // mic frames
  useEffect(() => {
    return mic.subscribe((f) => {
      if (phaseRef.current === 'singing' || phaseRef.current === 'step-done') setFrame(f);
      if (phaseRef.current !== 'singing' || !stepRef.current) return;
      if (f.time < listenFromRef.current) return;
      const step = stepRef.current;
      const dt = lastTimeRef.current ? Math.min(100, f.time - lastTimeRef.current) : 0;
      lastTimeRef.current = f.time;
      if (Number.isNaN(f.midi)) {
        holdRef.current = Math.max(0, holdRef.current - dt * 1.5);
        setHold(holdRef.current / config.holdMs);
        return;
      }
      const cents = centsFor(f.midi, step.target, step.octaveFree);
      if (Math.abs(cents) <= config.toleranceCents) {
        holdRef.current += dt;
        centsAccRef.current.push(cents);
        if (holdRef.current >= config.holdMs) {
          holdRef.current = config.holdMs;
          setHold(1);
          completeStep(true);
          return;
        }
      } else {
        holdRef.current = Math.max(0, holdRef.current - dt * 2);
      }
      setHold(holdRef.current / config.holdMs);
    });
  }, [config.holdMs, config.toleranceCents, completeStep]);

  const begin = useCallback(async () => {
    await engine.resume();
    const ok = await mic.start();
    if (!ok) {
      setMicError(mic.state === 'denied' ? 'Microphone access was denied. Allow the microphone for this site and try again.' : `Could not start the microphone: ${mic.errorMessage}`);
      setPhase('mic-error');
      return;
    }
    startRef.current = performance.now();
    finishedRef.current = false;
    missesRef.current = {};
    setTotals({ steps: 0, passed: 0, centsSum: 0, centsCount: 0 });
    startRound(0);
  }, [startRound]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void begin();
    }
  }, [autoStart, begin]);

  const nextRound = useCallback(() => {
    const n = roundIdx + 1;
    if (n >= rounds) finish(totals, n);
    else startRound(n);
  }, [roundIdx, rounds, finish, totals, startRound]);

  // Auto-advance between rounds. The timer must not depend on callback identity
  // (the component re-renders on every microphone frame), hence the ref.
  const nextRoundRef = useRef(nextRound);
  nextRoundRef.current = nextRound;
  const autoAdvanceMs = settings.autoAdvanceMs;
  useEffect(() => {
    if (phase !== 'round-done' || autoAdvanceMs === 0) return;
    const t = window.setTimeout(() => nextRoundRef.current(), Math.max(700, autoAdvanceMs));
    return () => window.clearTimeout(t);
  }, [phase, autoAdvanceMs]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' && phase === 'idle') {
        e.preventDefault();
        void begin();
      } else if (e.key === ' ' && round?.replay && (phase === 'singing' || phase === 'intro')) {
        e.preventDefault();
        playPlan(round.replay);
      } else if (e.key === 'Enter' && phase === 'round-done') {
        e.preventDefault();
        nextRoundRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, begin, round, playPlan]);

  // --- render ---------------------------------------------------------------------
  if (phase === 'idle' || phase === 'mic-error') {
    return (
      <div className="card center" style={{ padding: '2rem 1rem' }}>
        {title && <h2>{title}</h2>}
        <p className="muted">
          {rounds} rounds. Wear headphones so the microphone only hears your voice. Your vocal range is set to {midiToName(vocalLow)}–{midiToName(vocalHigh)} (change it in Settings).
        </p>
        {phase === 'mic-error' && <div className="alert mb">{micError}</div>}
        <button className="btn primary large" onClick={() => void begin()}>
          {phase === 'mic-error' ? 'Try again' : 'Start (enables microphone)'}
        </button>
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    const avgCents = totals.centsCount ? Math.round(totals.centsSum / totals.centsCount) : null;
    return (
      <div className="card">
        <h2>{summary.passed == null ? 'Done' : summary.passed ? '🎉 Level passed' : 'Keep going'}</h2>
        <div className="summary-grid mt">
          <div>
            <div className="big-number">{Math.round(summary.accuracy * 100)}%</div>
            <div className="muted small">notes hit</div>
          </div>
          <div>
            <div className="big-number">{totals.passed}</div>
            <div className="muted small">of {totals.steps} notes</div>
          </div>
          {avgCents != null && (
            <div>
              <div className="big-number">±{avgCents}¢</div>
              <div className="muted small">average deviation while in tune</div>
            </div>
          )}
        </div>
        <div className="row mt">
          <button className="btn primary" onClick={() => void begin()}>
            Again
          </button>
          {onQuit && (
            <button className="btn" onClick={onQuit}>
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!round) return null;
  const step = round.steps[stepIdx];
  const cents = frame && !Number.isNaN(frame.midi) && step ? centsFor(frame.midi, step.target, step.octaveFree) : NaN;

  return (
    <div className="stack">
      <div className="card">
        <div className="question-header">
          <div className="row">
            <span className="badge accent">
              round {roundIdx + 1} / {rounds}
            </span>
            {round.tonic != null && round.mode && <span className="badge">{keyName(round.tonic, round.mode)}</span>}
            {round.contextLabel && <span className="badge" title="Key context">{round.contextLabel}</span>}
            {mic.state !== 'running' && <span className="badge bad">mic off</span>}
          </div>
          <div className="row">
            <span className="badge good">✓ {totals.passed}</span>
            <span className="badge bad">✗ {totals.steps - totals.passed}</span>
          </div>
        </div>
        <div className="prompt">{round.title}</div>
        {round.steps.length > 1 && (
          <div className="slots mt">
            {round.steps.map((s, i) => (
              <div key={i} className={`slot ${i === stepIdx && phase === 'singing' ? 'current' : ''} ${stepResults[i] === true ? 'correct' : stepResults[i] === false ? 'wrong' : ''}`}>
                {s.label}
              </div>
            ))}
          </div>
        )}
        <div className="row mt">
          {round.replay && (
            <button className="btn small" onClick={() => playPlan(round.replay!)} disabled={phase === 'intro'}>
              ↻ Replay <span className="kbd">Space</span>
            </button>
          )}
          {phase === 'singing' && (
            <button className="btn small ghost" onClick={() => completeStep(false)}>
              Skip this note
            </button>
          )}
          <span className="spacer" />
          {onQuit && (
            <button className="btn small ghost" onClick={() => finish(totals, roundIdx)}>
              End
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {phase === 'intro' ? (
          <div className="center muted" style={{ padding: '1.5rem 0' }}>
            Listen…
          </div>
        ) : phase === 'round-done' ? (
          <div className={`feedback ${stepResults.every(Boolean) ? 'good' : 'bad'}`}>
            <div className="row between">
              <div>
                <div className="big">{stepResults.every(Boolean) ? 'Round complete' : `${stepResults.filter(Boolean).length} / ${stepResults.length} notes hit`}</div>
                <div className="muted small">{autoAdvanceMs === 0 ? 'Auto-advance is off – press Next when ready.' : 'Moving on automatically…'}</div>
              </div>
              <button className="btn primary" onClick={() => nextRoundRef.current()}>
                {roundIdx + 1 >= rounds ? 'Finish' : 'Next round'} <span className="kbd">Enter</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="row between mb">
              <div>
                <div className="small muted">Now sing</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{step.label}</div>
              </div>
              <div className="small muted">
                {step.octaveFree ? 'any octave' : midiToName(step.target)} · hold {Math.round(config.holdMs / 100) / 10}s within ±{config.toleranceCents}¢
              </div>
            </div>
            <PitchMeter cents={cents} toleranceCents={config.toleranceCents} sungMidi={frame?.midi ?? NaN} targetLabel={step.label} holdFraction={hold} />
            {phase === 'step-done' && stepResults[stepIdx] === false && <div className="alert mt">Missed – here is the note.</div>}
            {phase === 'step-done' && stepResults[stepIdx] === true && <div className="alert info mt">Nice.</div>}
          </>
        )}
      </div>
    </div>
  );
}

function centsFor(sungMidi: number, target: number, octaveFree: boolean): number {
  let diff = sungMidi - target;
  if (octaveFree) {
    diff = ((diff % 12) + 12) % 12;
    if (diff > 6) diff -= 12;
  }
  return diff * 100;
}

