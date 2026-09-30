import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExerciseRunner, type RunSummary } from '../components/ExerciseRunner';
import { SingingRunner } from '../components/SingingRunner';
import { getLevel, MODULES } from '../curriculum';
import type { ExerciseConfig } from '../exercises/types';
import type { SingingConfig } from '../singing/types';
import { buildDailyPlan, estimateMinutes } from '../store/daily';
import { todayKey, useStore } from '../store/useStore';

export function DailyPage() {
  const daily = useStore((s) => s.daily);
  const progress = useStore((s) => s.progress);
  const srs = useStore((s) => s.srs);
  const settings = useStore((s) => s.settings);
  const setDaily = useStore((s) => s.setDaily);
  const completeDailyBlock = useStore((s) => s.completeDailyBlock);
  const [running, setRunning] = useState(false);
  const [interstitial, setInterstitial] = useState<RunSummary | null>(null);

  const today = todayKey();
  useEffect(() => {
    if (!daily || daily.date !== today) setDaily(buildDailyPlan(progress, srs, settings, today));
  }, [daily, today, progress, srs, settings, setDaily]);

  const plan = daily && daily.date === today ? daily : null;
  const block = plan && plan.current < plan.blocks.length ? plan.blocks[plan.current] : null;
  const found = useMemo(() => (block ? getLevel(block.moduleId, block.levelId) : undefined), [block]);

  if (!plan) return <div className="page narrow">Preparing today's session…</div>;

  const doneCount = plan.blocks.filter((b) => b.done).length;

  if (plan.completed || !block || !found) {
    const totalQ = plan.blocks.reduce((a, b) => a + b.questions, 0);
    const totalC = plan.blocks.reduce((a, b) => a + (b.correct ?? 0), 0);
    return (
      <div className="page narrow">
        <div className="card center" style={{ padding: '2rem 1rem' }}>
          <h1>🎉 Session complete</h1>
          <p className="muted">
            {totalC} of {totalQ} correct across {plan.blocks.length} blocks. Come back tomorrow – the scheduler will have new reviews ready.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn primary">
              Home
            </Link>
            <button className="btn" onClick={() => setDaily(buildDailyPlan(progress, srs, settings, today))}>
              Build another session
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { module: mod, level } = found;

  const onFinish = (s: RunSummary) => {
    completeDailyBlock(plan.current, s.correct);
    setRunning(false);
    setInterstitial(s);
  };

  return (
    <div className="page narrow">
      <div className="row between mb">
        <div>
          <div className="small muted">Daily session · {estimateMinutes(plan)} min planned</div>
          <h1>
            Block {plan.current + 1} of {plan.blocks.length}: {mod.icon} {mod.name}
          </h1>
        </div>
        <span className="badge accent">
          {doneCount} / {plan.blocks.length} done
        </span>
      </div>
      <div className="progress mb">
        <div style={{ width: `${(doneCount / plan.blocks.length) * 100}%` }} />
      </div>

      {!running ? (
        <div className="card">
          {interstitial && (
            <div className="alert info mb">
              Last block: {Math.round(interstitial.accuracy * 100)}% accuracy{interstitial.passed != null ? (interstitial.passed ? ' – level passed!' : '') : ''}.
            </div>
          )}
          <h2>
            {level.name} {block.review && <span className="badge warn">review</span>}
          </h2>
          <p className="muted">{level.description}</p>
          <div className="row">
            <button
              className="btn primary large"
              onClick={() => {
                setInterstitial(null);
                setRunning(true);
              }}
            >
              Start block ({block.questions} {mod.kind === 'singing' ? 'rounds' : 'questions'})
            </button>
            <button className="btn ghost" onClick={() => completeDailyBlock(plan.current, 0)}>
              Skip block
            </button>
          </div>
          <div className="chips mt">
            {plan.blocks.map((b, i) => {
              const m = MODULES.find((x) => x.id === b.moduleId)!;
              return (
                <span key={i} className={`chip ${b.done ? 'on' : ''}`} style={i === plan.current ? { borderColor: 'var(--warn)' } : undefined}>
                  {m.icon} {m.name}
                </span>
              );
            })}
          </div>
        </div>
      ) : level.config.kind === 'singing' ? (
        <SingingRunner key={`${plan.current}-${level.id}`} moduleId={mod.id} levelId={level.id} config={level.config as SingingConfig} rounds={block.questions} mode="daily" passAccuracy={level.passAccuracy} title={level.name} onFinish={onFinish} autoStart />
      ) : (
        <ExerciseRunner key={`${plan.current}-${level.id}`} moduleId={mod.id} levelId={level.id} config={level.config as ExerciseConfig} questionCount={block.questions} mode="daily" passAccuracy={level.passAccuracy} review={block.review} title={level.name} onFinish={onFinish} autoStart />
      )}
    </div>
  );
}
