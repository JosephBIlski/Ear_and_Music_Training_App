import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExerciseRunner } from '../components/ExerciseRunner';
import { SingingRunner } from '../components/SingingRunner';
import { getLevel } from '../curriculum';
import type { ExerciseConfig } from '../exercises/types';
import type { SingingConfig } from '../singing/types';
import { isLevelUnlocked, useStore } from '../store/useStore';

export function LevelPage() {
  const { moduleId = '', levelId = '' } = useParams();
  const navigate = useNavigate();
  const found = getLevel(moduleId, levelId);
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  if (!found) return <div className="page">Unknown level.</div>;
  const { module: mod, level, index } = found;
  const unlocked = isLevelUnlocked(progress, settings, mod.id, mod.levels, index);
  const nextLevel = mod.levels[index + 1];

  return (
    <div className="page narrow">
      <div className="row between mb">
        <div>
          <div className="small muted">
            <Link to={`/module/${mod.id}`}>
              {mod.icon} {mod.name}
            </Link>{' '}
            · level {index + 1}
          </div>
          <h1>{level.name}</h1>
        </div>
        <span className="badge">pass at {Math.round(level.passAccuracy * 100)}%</span>
      </div>
      <div className="card subtle mb">
        <p style={{ marginBottom: 0 }}>{level.description}</p>
      </div>
      {!unlocked ? (
        <div className="alert">This level is locked. Pass the previous level or enable free navigation in Settings.</div>
      ) : level.config.kind === 'singing' ? (
        <SingingRunner key={level.id} moduleId={mod.id} levelId={level.id} config={level.config as SingingConfig} rounds={level.questions} mode="test" passAccuracy={level.passAccuracy} title={level.name} onQuit={() => navigate(`/module/${mod.id}`)} />
      ) : (
        <ExerciseRunner key={level.id} moduleId={mod.id} levelId={level.id} config={level.config as ExerciseConfig} questionCount={level.questions} mode="test" passAccuracy={level.passAccuracy} title={level.name} onQuit={() => navigate(`/module/${mod.id}`)} />
      )}
      {progress[mod.id]?.[level.id]?.passed && nextLevel && (
        <div className="row mt">
          <Link className="btn good" to={`/train/${mod.id}/${nextLevel.id}`}>
            Next level: {nextLevel.name} →
          </Link>
        </div>
      )}
    </div>
  );
}
