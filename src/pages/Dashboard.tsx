import { Link } from 'react-router-dom';
import { MODULES } from '../curriculum';
import { useLabels } from '../hooks/useLabels';
import { dueItems, weakestItems, recentAccuracy } from '../srs/scheduler';
import { computeStreak, currentLevelIndex, minutesToday, todayKey, useStore } from '../store/useStore';
import { estimateMinutes } from '../store/daily';

export function Dashboard() {
  const progress = useStore((s) => s.progress);
  const history = useStore((s) => s.history);
  const srs = useStore((s) => s.srs);
  const daily = useStore((s) => s.daily);
  const labels = useLabels();

  const streak = computeStreak(history);
  const minutes = minutesToday(history);
  const due = dueItems(srs).length;
  const totalAnswered = Object.values(srs).reduce((a, i) => a + i.attempts, 0);
  const weakest = weakestItems(srs, '', 6);
  const dailyToday = daily && daily.date === todayKey() ? daily : null;

  return (
    <div className="page">
      <div className="row between mb">
        <div>
          <h1>Train your ear, 15 minutes a day</h1>
          <p className="muted">Movable-do relative pitch → singing → transcription. Pick up where you left off, or run today's session.</p>
        </div>
      </div>

      <div className="grid mb">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="row between">
            <h2>Today's session</h2>
            <span className="badge accent">{dailyToday ? `${estimateMinutes(dailyToday)} min` : '~15 min'}</span>
          </div>
          {dailyToday ? (
            <>
              <div className="progress mb">
                <div style={{ width: `${(dailyToday.blocks.filter((b) => b.done).length / dailyToday.blocks.length) * 100}%` }} />
              </div>
              <div className="chips mb">
                {dailyToday.blocks.map((b, i) => {
                  const mod = MODULES.find((m) => m.id === b.moduleId)!;
                  return (
                    <span key={i} className={`chip ${b.done ? 'on' : ''}`}>
                      {mod.icon} {mod.name}
                      {b.review ? ' (review)' : ''} · {b.questions}
                    </span>
                  );
                })}
              </div>
              <Link to="/daily" className="btn primary">
                {dailyToday.completed ? 'Session done – run extra' : dailyToday.blocks.some((b) => b.done) ? 'Continue session' : 'Start session'}
              </Link>
            </>
          ) : (
            <>
              <p className="muted">A mix of functional degrees, one or two recognition modules, a singing exercise, and transcription – sized to your daily target and weighted toward what is due for review.</p>
              <Link to="/daily" className="btn primary">
                Start today's session
              </Link>
            </>
          )}
        </div>
        <div className="card">
          <div className="summary-grid">
            <div>
              <div className="big-number">{streak}</div>
              <div className="muted small">day streak</div>
            </div>
            <div>
              <div className="big-number">{Math.round(minutes)}</div>
              <div className="muted small">min today</div>
            </div>
            <div>
              <div className="big-number">{due}</div>
              <div className="muted small">items due</div>
            </div>
            <div>
              <div className="big-number">{totalAnswered}</div>
              <div className="muted small">answers total</div>
            </div>
          </div>
        </div>
      </div>

      <h2>Modules</h2>
      <p className="muted small">Recommended order left to right, but you can work several in parallel. Each has levels, an explanation and a free practice mode.</p>
      <div className="grid mb">
        {MODULES.map((m) => {
          const passed = m.levels.filter((l) => progress[m.id]?.[l.id]?.passed).length;
          const cur = currentLevelIndex(progress, m.id, m.levels);
          return (
            <Link key={m.id} to={`/module/${m.id}`} className="card module-card">
              <div className="row between">
                <span className="icon">{m.icon}</span>
                <span className="badge">
                  {passed} / {m.levels.length} levels
                </span>
              </div>
              <h3>{m.name}</h3>
              <div className="muted small">{m.tagline}</div>
              <div className="progress">
                <div style={{ width: `${(passed / m.levels.length) * 100}%` }} />
              </div>
              <div className="small">
                Next: <b>{m.levels[cur].name}</b>
              </div>
            </Link>
          );
        })}
      </div>

      {weakest.length > 0 && (
        <div className="card">
          <h3>Needs attention</h3>
          <p className="muted small">Items with the lowest recent accuracy. The scheduler already asks these more often; use Practice mode to drill them directly.</p>
          <div className="chips">
            {weakest.map((w) => (
              <span key={w.id} className="chip">
                {idLabel(w.id, labels)} · {Math.round(recentAccuracy(w) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function idLabel(id: string, labels: ReturnType<typeof useLabels>): string {
  const parts = id.split(':');
  switch (parts[0]) {
    case 'deg':
      return `${labels.degree(Number(parts[2]), parts[1] as 'major' | 'minor')} · ${parts[1]}`;
    case 'int':
      return `${labels.interval(Number(parts[2]))} ${parts[1] === 'asc' ? '↑' : parts[1] === 'desc' ? '↓' : 'harm.'}`;
    case 'chq':
      return `${labels.quality(parts[1])} chord`;
    case 'chi':
      return labels.quality(`${parts[1]}:${parts[2]}`);
    case 'chf':
      return `${labels.fn(parts[2])} · ${parts[1]}`;
    case 'sing':
      if (parts[1] === 'deg') return `sing ${labels.degree(Number(parts[3]), parts[2] as 'major' | 'minor')} · ${parts[2]}`;
      if (parts[1] === 'int') return `sing ${labels.interval(Number(parts[2]))}`;
      return id;
    default:
      return id;
  }
}
