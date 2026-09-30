import { Link, useParams } from 'react-router-dom';
import { getModule } from '../curriculum';
import { currentLevelIndex, isLevelUnlocked, useStore } from '../store/useStore';

export function ModulePage() {
  const { moduleId = '' } = useParams();
  const mod = getModule(moduleId);
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  if (!mod) return <div className="page">Unknown module.</div>;
  const cur = currentLevelIndex(progress, mod.id, mod.levels);

  return (
    <div className="page">
      <div className="row between mb">
        <div>
          <h1>
            {mod.icon} {mod.name}
          </h1>
          <p className="muted">{mod.tagline}</p>
        </div>
        <div className="row">
          <Link className="btn" to={`/practice/${mod.id}`}>
            Practice mode
          </Link>
          <Link className="btn primary" to={`/train/${mod.id}/${mod.levels[cur].id}`}>
            Continue: level {cur + 1}
          </Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="card">
          <h2>Levels</h2>
          {mod.levels.map((l, i) => {
            const res = progress[mod.id]?.[l.id];
            const unlocked = isLevelUnlocked(progress, settings, mod.id, mod.levels, i);
            const state = res?.passed ? 'passed' : i === cur ? 'current' : unlocked ? '' : 'locked';
            return (
              <div key={l.id} className={`level-row ${unlocked ? '' : 'locked'}`}>
                <div className={`num ${state}`}>{res?.passed ? '✓' : i + 1}</div>
                <div className="body">
                  <div className="title">{l.name}</div>
                  <div className="muted small">{l.summary}</div>
                  {res && (
                    <div className="tiny muted">
                      best {Math.round(res.bestAccuracy * 100)}% · {res.attempts} run{res.attempts === 1 ? '' : 's'} · need {Math.round(l.passAccuracy * 100)}%
                    </div>
                  )}
                </div>
                {unlocked ? (
                  <Link className={`btn small ${i === cur ? 'primary' : ''}`} to={`/train/${mod.id}/${l.id}`}>
                    {res?.passed ? 'Replay' : 'Start'}
                  </Link>
                ) : (
                  <span className="badge">locked</span>
                )}
              </div>
            );
          })}
          {!settings.freeNavigation && <p className="tiny muted mt">Levels unlock in order. You can turn on free navigation in Settings.</p>}
        </div>
        <div className="stack">
          <div className="card explain">
            <h2>What this trains</h2>
            {mod.explanation.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="card">
            <h3>Tips</h3>
            <ul className="tips">
              {mod.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
