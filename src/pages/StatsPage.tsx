import { MODULES } from '../curriculum';
import { useLabels } from '../hooks/useLabels';
import { recentAccuracy, dueItems } from '../srs/scheduler';
import { computeStreak, todayKey, useStore } from '../store/useStore';
import { CHORD_TYPES, CHORD_FUNCTIONS } from '../theory/chords';
import { INTERVALS } from '../theory/intervals';
import type { Mode } from '../theory/notes';
import { idLabel } from './Dashboard';

function colour(acc: number | null): string {
  if (acc == null) return 'var(--bg-elev-2)';
  if (acc >= 0.9) return 'rgba(74, 222, 128, 0.25)';
  if (acc >= 0.75) return 'rgba(251, 191, 36, 0.22)';
  return 'rgba(248, 113, 113, 0.25)';
}

export function StatsPage() {
  const srs = useStore((s) => s.srs);
  const progress = useStore((s) => s.progress);
  const history = useStore((s) => s.history);
  const confusions = useStore((s) => s.confusions);
  const labels = useLabels();

  const totalAnswers = Object.values(srs).reduce((a, i) => a + i.attempts, 0);
  const totalCorrect = Object.values(srs).reduce((a, i) => a + i.correct, 0);
  const minutes = Math.round(history.reduce((a, h) => a + h.durationSec, 0) / 60);
  const days = new Set(history.map((h) => todayKey(new Date(h.at)))).size;
  const due = dueItems(srs).length;

  // last 14 days minutes
  const dayBars: { label: string; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const m = history.filter((h) => todayKey(new Date(h.at)) === key).reduce((a, h) => a + h.durationSec, 0) / 60;
    dayBars.push({ label: `${d.getDate()}`, minutes: m });
  }
  const maxMin = Math.max(1, ...dayBars.map((b) => b.minutes));

  const cell = (id: string, label: string) => {
    const it = srs[id];
    const acc = it && it.attempts > 0 ? recentAccuracy(it) : null;
    return (
      <div key={id} className="cell" style={{ background: colour(acc) }} title={it ? `${it.correct}/${it.attempts} all time` : 'not yet seen'}>
        <b>{label}</b>
        <span className="muted">{acc == null ? '–' : `${Math.round(acc * 100)}%`}</span>
      </div>
    );
  };

  const confusionRows = Object.entries(confusions)
    .flatMap(([kind, table]) => Object.entries(table).map(([pair, n]) => ({ kind, pair, n })))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);

  const pairLabel = (kind: string, pair: string) => {
    const [expected, given] = pair.split('>');
    const [k, mode] = kind.split(':');
    const m = (mode ?? 'major') as Mode;
    const f = (t: string) => {
      switch (k) {
        case 'degrees':
        case 'melody':
          return labels.degree(Number(t), m);
        case 'intervals':
          return labels.interval(Number(t));
        case 'chords':
          return labels.quality(t);
        case 'harmony':
        case 'progression':
          return labels.fn(t);
        default:
          return t;
      }
    };
    return `${f(expected)} → answered ${f(given)}`;
  };

  return (
    <div className="page">
      <h1>Progress</h1>
      <div className="grid mb">
        <div className="card">
          <div className="summary-grid">
            <div>
              <div className="big-number">{computeStreak(history)}</div>
              <div className="muted small">day streak</div>
            </div>
            <div>
              <div className="big-number">{days}</div>
              <div className="muted small">days practised</div>
            </div>
            <div>
              <div className="big-number">{minutes}</div>
              <div className="muted small">minutes total</div>
            </div>
            <div>
              <div className="big-number">{totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0}%</div>
              <div className="muted small">all-time accuracy ({totalAnswers})</div>
            </div>
            <div>
              <div className="big-number">{due}</div>
              <div className="muted small">items due</div>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Last 14 days (minutes)</h3>
          <div className="bars" style={{ marginBottom: 22 }}>
            {dayBars.map((b, i) => (
              <div key={i} className="bar" style={{ height: `${(b.minutes / maxMin) * 100}%`, opacity: b.minutes ? 1 : 0.25 }} title={`${Math.round(b.minutes)} min`}>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb">
        <h3>Levels</h3>
        <table className="plain">
          <tbody>
            {MODULES.map((m) => {
              const passed = m.levels.filter((l) => progress[m.id]?.[l.id]?.passed).length;
              return (
                <tr key={m.id}>
                  <td style={{ width: 200 }}>
                    {m.icon} {m.name}
                  </td>
                  <td>
                    <div className="progress">
                      <div style={{ width: `${(passed / m.levels.length) * 100}%` }} />
                    </div>
                  </td>
                  <td className="mono muted" style={{ width: 80, textAlign: 'right' }}>
                    {passed} / {m.levels.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid mb">
        {(['major', 'minor'] as Mode[]).map((mode) => (
          <div key={mode} className="card">
            <h3>Degrees · {mode}</h3>
            <div className="heat">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => cell(`deg:${mode}:${d}`, labels.degree(d, mode)))}</div>
          </div>
        ))}
        <div className="card">
          <h3>Intervals (ascending / descending / harmonic)</h3>
          <div className="heat">
            {INTERVALS.filter((i) => i.semitones > 0 && i.semitones <= 12).flatMap((i) => [cell(`int:asc:${i.semitones}`, `${i.short}↑`), cell(`int:desc:${i.semitones}`, `${i.short}↓`), cell(`int:harmonic:${i.semitones}`, `${i.short}=`)])}
          </div>
        </div>
        <div className="card">
          <h3>Chord qualities</h3>
          <div className="heat">{CHORD_TYPES.map((c) => cell(`chq:${c.id}`, c.symbol === '' ? 'maj' : c.symbol))}</div>
        </div>
        {(['major', 'minor'] as Mode[]).map((mode) => (
          <div key={mode} className="card">
            <h3>Chord functions · {mode}</h3>
            <div className="heat">{CHORD_FUNCTIONS.filter((f) => f.mode === mode).map((f) => cell(`chf:${mode}:${f.id}`, f.label))}</div>
          </div>
        ))}
        <div className="card">
          <h3>Singing · degrees</h3>
          <div className="heat">
            {(['major', 'minor'] as Mode[]).flatMap((mode) => [0, 2, 3, 4, 5, 7, 8, 9, 10, 11].map((d) => cell(`sing:deg:${mode}:${d}`, `${labels.degree(d, mode)} ${mode[0]}`)))}
          </div>
        </div>
      </div>

      {confusionRows.length > 0 && (
        <div className="card">
          <h3>Most common confusions</h3>
          <p className="muted small">Pairs you mix up most. Drill them directly in Practice mode with only those options enabled.</p>
          <table className="plain">
            <tbody>
              {confusionRows.map((r) => (
                <tr key={r.kind + r.pair}>
                  <td className="muted" style={{ width: 140 }}>
                    {r.kind.replace(':', ' · ')}
                  </td>
                  <td>{pairLabel(r.kind, r.pair)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    ×{r.n}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {due > 0 && (
        <div className="card mt">
          <h3>Due for review</h3>
          <div className="chips">
            {dueItems(srs)
              .sort((a, b) => recentAccuracy(a) - recentAccuracy(b))
              .slice(0, 20)
              .map((i) => (
                <span key={i.id} className="chip">
                  {idLabel(i.id, labels)}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
