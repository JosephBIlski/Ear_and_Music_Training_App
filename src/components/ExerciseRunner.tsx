import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine, planLength, type PlaybackHandle } from '../audio/engine';
import { midiInput } from '../audio/midi';
import { checkAnswer, type AnswerResult, type ExerciseConfig, type Question } from '../exercises/types';
import { generateQuestion } from '../exercises/generators';
import { useLabels } from '../hooks/useLabels';
import { selectionWeights, isDue } from '../srs/scheduler';
import { useStore } from '../store/useStore';
import { weightedPick } from '../theory/random';
import { degreeOf, keyName, midiToName } from '../theory/notes';
import { Piano } from './Piano';
import { ChordQualityPad, DegreePad, FunctionPad, IntervalPad, type Mark } from './Pads';
import { SequenceSlots } from './SequenceSlots';

export interface RunSummary {
  questions: number;
  correct: number;
  /** per-position accuracy (notes/chords), used for pass/fail */
  accuracy: number;
  durationSec: number;
  passed?: boolean;
  missed: { id: string; count: number }[];
}

interface Props {
  moduleId: string;
  levelId?: string;
  config: ExerciseConfig;
  questionCount: number; // Infinity for endless practice
  mode: 'test' | 'practice' | 'daily';
  passAccuracy?: number;
  review?: boolean;
  title?: string;
  onFinish?: (summary: RunSummary) => void;
  onQuit?: () => void;
  /** start immediately on mount (the mounting click counts as the audio gesture) */
  autoStart?: boolean;
}

type Phase = 'idle' | 'playing' | 'answering' | 'feedback' | 'summary';

export function ExerciseRunner({ moduleId, levelId, config, questionCount, mode, passAccuracy, review, title, onFinish, onQuit, autoStart }: Props) {
  const settings = useStore((s) => s.settings);
  const recordAnswers = useStore((s) => s.recordAnswers);
  const recordConfusion = useStore((s) => s.recordConfusion);
  const recordLevelResult = useStore((s) => s.recordLevelResult);
  const logSession = useStore((s) => s.logSession);
  const labels = useLabels();

  const [phase, setPhase] = useState<Phase>('idle');
  const [question, setQuestion] = useState<Question | null>(null);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<(string | null)[]>([]);
  const [slot, setSlot] = useState(0);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [replays, setReplays] = useState(0);
  const [usePiano, setUsePiano] = useState(settings.inputMode === 'piano');
  const [pianoSound, setPianoSound] = useState(mode === 'practice');
  const [isPlaying, setIsPlaying] = useState(false);
  const [stats, setStats] = useState({ correct: 0, positions: 0, positionsCorrect: 0 });

  const handleRef = useRef<PlaybackHandle | null>(null);
  const timersRef = useRef<number[]>([]);
  const historyRef = useRef<string[]>([]);
  const requeueRef = useRef<string[]>([]);
  const missesRef = useRef<Record<string, number>>({});
  const startRef = useRef<number>(0);
  const targetStartRef = useRef<number>(0);
  const prevKeyRef = useRef<{ tonic: number; mode: Question['mode'] } | undefined>(undefined);
  const finishedRef = useRef(false);

  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };
  const stopPlayback = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    engine.stopAll();
    setIsPlaying(false);
  };

  useEffect(() => {
    engine.setVolume(settings.volume);
    engine.defaultTimbre = settings.timbre;
  }, [settings.volume, settings.timbre]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- SRS-aware item picker ------------------------------------------------
  const pickItem = useCallback(
    (ids: string[]) => {
      const srs = useStore.getState().srs;
      let candidates = ids;
      if (review) {
        const due = ids.filter((id) => srs[id] && srs[id].attempts > 0 && isDue(srs[id]));
        if (due.length >= 3) candidates = due;
      }
      const weights = selectionWeights(candidates, srs, { history: historyRef.current, requeue: requeueRef.current });
      const chosen = weightedPick(candidates, weights);
      historyRef.current.push(chosen);
      requeueRef.current = requeueRef.current.filter((r) => r !== chosen);
      return chosen;
    },
    [review],
  );

  const total = Number.isFinite(questionCount) ? questionCount : Infinity;

  // --- Question lifecycle ------------------------------------------------------
  const play = useCallback(
    (q: Question, full: boolean) => {
      stopPlayback();
      const plan = full ? q.fullPlan : q.targetPlan;
      const handle = engine.play(plan, q.timbre);
      handleRef.current = handle;
      setIsPlaying(true);
      handle.done.then(() => setIsPlaying(false));
      return handle;
    },
    [],
  );

  const startQuestion = useCallback(
    (idx: number) => {
      clearTimers();
      const q = generateQuestion(config, { pickItem, index: idx, previous: prevKeyRef.current, defaultTimbre: settings.timbre });
      prevKeyRef.current = { tonic: q.tonic, mode: q.mode };
      setQuestion(q);
      setResponse(Array(q.answer.length).fill(null));
      setSlot(0);
      setResult(null);
      setReplays(0);
      setPhase('playing');
      play(q, true);
      const cadenceLen = planLength(q.fullPlan) - planLength(q.targetPlan);
      after(Math.max(0, cadenceLen * 1000 - 80), () => {
        targetStartRef.current = performance.now();
        setPhase('answering');
      });
    },
    [config, pickItem, play, settings.timbre],
  );

  const begin = useCallback(async () => {
    await engine.resume();
    startRef.current = performance.now();
    finishedRef.current = false;
    setIndex(0);
    setStats({ correct: 0, positions: 0, positionsCorrect: 0 });
    historyRef.current = [];
    requeueRef.current = [];
    missesRef.current = {};
    prevKeyRef.current = undefined;
    startQuestion(0);
  }, [startQuestion]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void begin();
    }
  }, [autoStart, begin]);

  const finish = useCallback(
    (finalStats: typeof stats, count: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      clearTimers();
      stopPlayback();
      const durationSec = Math.round((performance.now() - startRef.current) / 1000);
      const accuracy = finalStats.positions ? finalStats.positionsCorrect / finalStats.positions : 0;
      const summary: RunSummary = {
        questions: count,
        correct: finalStats.correct,
        accuracy,
        durationSec,
        passed: passAccuracy != null ? accuracy >= passAccuracy : undefined,
        missed: Object.entries(missesRef.current)
          .map(([id, c]) => ({ id, count: c }))
          .sort((a, b) => b.count - a.count),
      };
      if (count > 0) {
        logSession({ moduleId, levelId, mode, questions: count, correct: finalStats.correct, durationSec });
        if (levelId && mode !== 'practice' && passAccuracy != null && count >= 3) recordLevelResult(moduleId, levelId, accuracy, passAccuracy);
      }
      setPhase('summary');
      setSummary(summary);
      onFinish?.(summary);
    },
    [logSession, recordLevelResult, moduleId, levelId, mode, passAccuracy, onFinish],
  );
  const [summary, setSummary] = useState<RunSummary | null>(null);

  const next = useCallback(() => {
    if (!question) return;
    const nextIdx = index + 1;
    if (nextIdx >= total) {
      finish(stats, nextIdx);
      return;
    }
    setIndex(nextIdx);
    startQuestion(nextIdx);
  }, [question, index, total, finish, stats, startQuestion]);

  const submit = useCallback(
    (tokens: string[]) => {
      if (!question || phase === 'feedback') return;
      clearTimers();
      const responseMs = Math.max(0, performance.now() - targetStartRef.current);
      const res = checkAnswer(question, tokens);
      setResult(res);
      setPhase('feedback');
      recordAnswers(res.items, responseMs);
      for (const p of res.pairs) {
        if (p.given && p.given !== p.expected) recordConfusion(`${question.kind}:${question.mode}`, p.expected, p.given);
      }
      for (const it of res.items) {
        if (!it.correct) {
          missesRef.current[it.id] = (missesRef.current[it.id] ?? 0) + 1;
          if (!requeueRef.current.includes(it.id)) requeueRef.current.push(it.id);
        }
      }
      const newStats = {
        correct: stats.correct + (res.correct ? 1 : 0),
        positions: stats.positions + res.perPosition.length,
        positionsCorrect: stats.positionsCorrect + res.perPosition.filter(Boolean).length,
      };
      setStats(newStats);

      // Feedback audio: replay the target when wrong (single answers), then the resolution.
      stopPlayback();
      let delay = 0;
      if (!res.correct && question.answer.length === 1 && question.kind !== 'melody') {
        const h = engine.play(question.targetPlan, question.timbre);
        handleRef.current = h;
        delay += planLength(question.targetPlan) * 1000 + 150;
      }
      if (question.feedbackPlan && settings.playResolution) {
        const fp = question.feedbackPlan;
        after(delay, () => {
          const h = engine.play(fp, question.timbre);
          handleRef.current = h;
        });
        delay += planLength(fp) * 1000;
      }
      if (settings.autoAdvanceMs > 0 && question.answer.length <= 3) {
        const wait = delay + settings.autoAdvanceMs * (res.correct ? 1 : 1.6);
        after(wait, () => {
          const nextIdx = index + 1;
          if (nextIdx >= total) finish(newStats, nextIdx);
          else {
            setIndex(nextIdx);
            startQuestion(nextIdx);
          }
        });
      }
    },
    [question, phase, recordAnswers, recordConfusion, stats, settings.playResolution, settings.autoAdvanceMs, index, total, finish, startQuestion],
  );

  const autoSubmit = question ? question.kind !== 'melody' && question.kind !== 'progression' : true;

  const pick = useCallback(
    (token: string) => {
      if (!question || phase === 'feedback' || phase === 'idle' || phase === 'summary') return;
      if (question.answer.length === 1) {
        submit([token]);
        return;
      }
      const filled = response.slice();
      filled[slot] = token;
      setResponse(filled);
      // advance to next empty slot
      let nextSlot = filled.findIndex((v, i) => i > slot && v == null);
      if (nextSlot < 0) nextSlot = filled.findIndex((v) => v == null);
      if (nextSlot < 0) nextSlot = Math.min(slot + 1, filled.length - 1);
      setSlot(nextSlot);
      if (autoSubmit && filled.every((v) => v != null)) submit(filled as string[]);
    },
    [question, phase, response, slot, submit, autoSubmit],
  );

  // MIDI input
  useEffect(() => {
    if (!settings.useMidi) return;
    void midiInput.connect();
    return midiInput.subscribe((midi) => {
      if (!question) return;
      if (question.input.kind === 'pitch') pick(String(midi));
      else if (question.input.kind === 'degree') pick(String(degreeOf(midi, question.tonic)));
    });
  }, [settings.useMidi, question, pick]);

  const replay = useCallback(
    (full: boolean) => {
      if (!question || phase === 'idle' || phase === 'summary') return;
      if (phase === 'answering' && question.maxReplays != null && replays >= question.maxReplays) return;
      if (phase === 'answering') setReplays((r) => r + 1);
      play(question, full);
    },
    [question, phase, replays, play],
  );

  // Keyboard shortcuts: space = replay, enter = next / check, r = target only
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) && e.key !== 'Enter') return;
      if (e.key === ' ') {
        e.preventDefault();
        if (phase === 'idle') void begin();
        else replay(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'idle') void begin();
        else if (phase === 'feedback') next();
        else if (phase === 'answering' && !autoSubmit && response.every((v) => v != null)) submit(response as string[]);
      } else if (e.key.toLowerCase() === 'r' && phase !== 'idle') {
        replay(false);
      } else if (e.key === 'Backspace' && phase === 'answering' && response.length > 1) {
        const filled = response.slice();
        const lastFilled = filled.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
        if (lastFilled != null) {
          filled[lastFilled] = null;
          setResponse(filled);
          setSlot(lastFilled);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, begin, replay, next, submit, response, autoSubmit]);

  // --- Rendering ---------------------------------------------------------------
  const marks: Mark = useMemo(() => {
    const m: Mark = {};
    if (!question) return m;
    if (result && question.answer.length === 1) {
      m[question.answer[0]] = 'correct';
      if (!result.correct && result.pairs[0].given) m[result.pairs[0].given] = 'wrong';
    }
    return m;
  }, [question, result]);

  const tokenLabel = useCallback(
    (t: string) => {
      if (!question) return t;
      if (question.input.kind === 'pitch') return midiToName(Number(t));
      return labels.token(question.input.kind, t, question.mode);
    },
    [question, labels],
  );

  const inputDisabled = phase !== 'answering';
  const pianoHighlight = useMemo(() => {
    const h: Record<number, 'active' | 'correct' | 'wrong'> = {};
    if (!question || !result) return h;
    if (question.input.kind === 'pitch') {
      question.answer.forEach((a) => (h[Number(a)] = 'correct'));
      result.pairs.forEach((p) => {
        if (p.given && p.given !== p.expected) h[Number(p.given)] = 'wrong';
      });
    }
    return h;
  }, [question, result]);

  if (phase === 'idle') {
    return (
      <div className="card center" style={{ padding: '2rem 1rem' }}>
        {title && <h2>{title}</h2>}
        <p className="muted">
          {Number.isFinite(total) ? `${total} questions.` : 'Endless practice.'} Use headphones if you can. <span className="kbd">Space</span> replays, <span className="kbd">Enter</span> continues, number keys answer.
        </p>
        <button className="btn primary large" onClick={() => void begin()}>
          Start
        </button>
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    return <Summary summary={summary} mode={mode} labelFor={(id) => idLabel(id, labels)} onRestart={() => void begin()} onQuit={onQuit} />;
  }

  if (!question) return null;

  const progressPct = Number.isFinite(total) ? (index / total) * 100 : 0;
  const replaysLeft = question.maxReplays != null ? Math.max(0, question.maxReplays - replays) : null;
  const canUsePiano = question.input.kind === 'degree' || question.input.kind === 'pitch';
  const showPiano = question.input.kind === 'pitch' || (usePiano && question.input.kind === 'degree');

  return (
    <div className="stack">
      <div className="card">
        <div className="question-header">
          <div className="row">
            <span className="badge accent">
              {Number.isFinite(total) ? `${index + 1} / ${total}` : `#${index + 1}`}
            </span>
            {settings.showKeyName && question.hasContext && <span className="badge">{keyName(question.tonic, question.mode)}</span>}
            {!question.hasContext && question.kind !== 'intervals' && question.kind !== 'chords' && <span className="badge warn">{question.mode} · no cadence</span>}
            {isPlaying && (
              <span className="playing-indicator" aria-label="playing">
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          <div className="row">
            <span className="badge good">✓ {stats.correct}</span>
            <span className="badge bad">✗ {index + (phase === 'feedback' ? 1 : 0) - stats.correct}</span>
          </div>
        </div>
        {Number.isFinite(total) && (
          <div className="progress mb">
            <div style={{ width: `${progressPct}%` }} />
          </div>
        )}
        <div className="prompt">{question.prompt}</div>
        <div className="row mt">
          <button className="btn small" onClick={() => replay(true)} disabled={phase === 'playing' || (replaysLeft != null && replaysLeft <= 0 && phase === 'answering')}>
            ↻ Replay {question.hasContext ? 'with cadence' : ''}
          </button>
          {question.hasContext && (
            <button className="btn small ghost" onClick={() => replay(false)} disabled={phase === 'playing' || (replaysLeft != null && replaysLeft <= 0 && phase === 'answering')}>
              Target only <span className="kbd">R</span>
            </button>
          )}
          {replaysLeft != null && phase !== 'feedback' && <span className="badge">{replaysLeft} replays left</span>}
          <span className="spacer" />
          {canUsePiano && question.input.kind === 'degree' && (
            <button className="btn small ghost" onClick={() => setUsePiano((v) => !v)}>
              {usePiano ? 'Use degree buttons' : 'Use piano'}
            </button>
          )}
          {showPiano && question.input.kind === 'degree' && (
            <label className="check small muted">
              <input type="checkbox" checked={pianoSound} onChange={(e) => setPianoSound(e.target.checked)} /> piano sounds
            </label>
          )}
          {onQuit && (
            <button className="btn small ghost" onClick={() => finish(stats, index + (phase === 'feedback' ? 1 : 0))}>
              End
            </button>
          )}
        </div>
      </div>

      {question.answer.length > 1 && (
        <div className="card subtle">
          <div className="row between">
            <span className="small muted">Fill each slot in order. Click a slot to change it. <span className="kbd">⌫</span> removes the last note.</span>
            {!autoSubmit && phase === 'answering' && (
              <button className="btn primary small" disabled={!response.every((v) => v != null)} onClick={() => submit(response as string[])}>
                Check <span className="kbd">Enter</span>
              </button>
            )}
          </div>
          <div className="mt">
            <SequenceSlots count={question.answer.length} values={response} current={slot} onSelect={setSlot} label={tokenLabel} result={result ? { expected: question.answer, perPosition: result.perPosition } : null} />
          </div>
        </div>
      )}

      <div className="card">
        {showPiano ? (
          <Piano
            low={question.input.kind === 'pitch' ? Math.floor(question.input.low / 12) * 12 : Math.floor((question.tonic - 12) / 12) * 12}
            high={question.input.kind === 'pitch' ? Math.ceil(question.input.high / 12) * 12 : Math.floor((question.tonic - 12) / 12) * 12 + 24}
            tonic={question.input.kind === 'degree' ? question.tonic : undefined}
            mode={question.mode}
            showDegreeLabels={question.input.kind === 'degree'}
            showNoteNames={question.input.kind === 'pitch'}
            onNote={(m) => pick(question.input.kind === 'pitch' ? String(m) : String(degreeOf(m, question.tonic)))}
            disabled={inputDisabled}
            sound={question.input.kind === 'pitch' || pianoSound}
            highlight={pianoHighlight}
            keyboard
          />
        ) : question.input.kind === 'degree' ? (
          <DegreePad choices={question.input.choices} mode={question.input.mode} onPick={pick} disabled={inputDisabled} marks={marks} keyboard />
        ) : question.input.kind === 'interval' ? (
          <IntervalPad choices={question.input.choices} onPick={pick} disabled={inputDisabled} marks={marks} keyboard />
        ) : question.input.kind === 'chordQuality' ? (
          <ChordQualityPad choices={question.input.choices} inversions={question.input.inversions} askInversion={question.input.askInversion} onPick={pick} disabled={inputDisabled} marks={marks} keyboard />
        ) : question.input.kind === 'chordFunction' ? (
          <FunctionPad choices={question.input.choices} mode={question.input.mode} onPick={pick} disabled={inputDisabled} marks={marks} keyboard />
        ) : null}
      </div>

      {phase === 'feedback' && result && (
        <div className={`feedback ${result.correct ? 'good' : 'bad'}`}>
          <div className="row between">
            <div>
              <div className="big">{result.correct ? 'Correct' : question.answer.length > 1 ? `${result.perPosition.filter(Boolean).length} / ${result.perPosition.length} right` : 'Not quite'}</div>
              <div className="muted">
                {question.answer.length === 1 ? (
                  <>
                    Answer: <b style={{ color: 'var(--text)' }}>{tokenLabel(question.answer[0])}</b>
                    {!result.correct && result.pairs[0].given && <> · you said {tokenLabel(result.pairs[0].given)}</>}
                  </>
                ) : (
                  <>Answer: {question.answer.map(tokenLabel).join(' – ')}</>
                )}
              </div>
              {question.explain && <div className="small muted">{question.explain}</div>}
            </div>
            <button className="btn primary" onClick={next}>
              {index + 1 >= total ? 'Finish' : 'Next'} <span className="kbd">Enter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function idLabel(id: string, labels: ReturnType<typeof useLabels>): string {
  const [kind, a, b] = id.split(':');
  switch (kind) {
    case 'deg':
      return `${labels.degree(Number(b), a as 'major' | 'minor')} (${a})`;
    case 'int':
      return `${labels.interval(Number(b))} ${a === 'asc' ? '↑' : a === 'desc' ? '↓' : '(harmonic)'}`;
    case 'chq':
      return labels.quality(a);
    case 'chi':
      return labels.quality(`${a}:${b}`);
    case 'chf':
      return `${labels.fn(b)} (${a})`;
    default:
      return id;
  }
}

function Summary({ summary, mode, labelFor, onRestart, onQuit }: { summary: RunSummary; mode: string; labelFor: (id: string) => string; onRestart: () => void; onQuit?: () => void }) {
  const pct = Math.round(summary.accuracy * 100);
  return (
    <div className="card">
      <h2>{summary.passed == null ? 'Session complete' : summary.passed ? '🎉 Level passed' : 'Keep going'}</h2>
      <div className="summary-grid mt">
        <div>
          <div className="big-number">{pct}%</div>
          <div className="muted small">accuracy</div>
        </div>
        <div>
          <div className="big-number">{summary.correct}</div>
          <div className="muted small">of {summary.questions} fully correct</div>
        </div>
        <div>
          <div className="big-number">{Math.max(1, Math.round(summary.durationSec / 60))}</div>
          <div className="muted small">minutes</div>
        </div>
      </div>
      {summary.passed === false && <p className="muted mt">Not passed this time. Missed items are now weighted heavily by the scheduler – another run or two usually does it.</p>}
      {summary.missed.length > 0 && (
        <div className="mt">
          <h3>Most missed</h3>
          <div className="chips">
            {summary.missed.slice(0, 8).map((m) => (
              <span key={m.id} className="chip">
                {labelFor(m.id)} ×{m.count}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="row mt">
        <button className="btn primary" onClick={onRestart}>
          {mode === 'test' ? 'Run again' : 'Another round'}
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
