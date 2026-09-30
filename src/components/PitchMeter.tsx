import { midiToName } from '../theory/notes';

interface Props {
  /** cents from target, NaN when no pitch */
  cents: number;
  toleranceCents: number;
  sungMidi: number; // fractional
  targetLabel: string;
  holdFraction: number; // 0..1
  range?: number; // ± cents shown
}

export function PitchMeter({ cents, toleranceCents, sungMidi, targetLabel, holdFraction, range = 250 }: Props) {
  const has = !Number.isNaN(cents);
  const clamped = Math.max(-range, Math.min(range, cents));
  const left = 50 + (clamped / range) * 50;
  const zoneW = (toleranceCents / range) * 50;
  const inZone = has && Math.abs(cents) <= toleranceCents;
  return (
    <div className="stack">
      <div className="meter">
        <div className="zone" style={{ left: `${50 - zoneW}%`, width: `${zoneW * 2}%` }} />
        <div className="centre" />
        {has ? <div className={`needle ${inZone ? 'in' : ''}`} style={{ left: `calc(${left}% - 2px)` }} /> : <div className="none">Sing or hum…</div>}
        <div className="label">flat</div>
        <div className="label right">sharp</div>
        <div className="label" style={{ top: 6, bottom: 'auto', left: 8 }}>
          target <b style={{ color: 'var(--text)' }}>{targetLabel}</b>
        </div>
        {has && (
          <div className="label right" style={{ top: 6, bottom: 'auto' }}>
            you: <b style={{ color: 'var(--text)' }}>{midiToName(Math.round(sungMidi))}</b> {cents > 0 ? '+' : ''}
            {Math.round(cents)}¢
          </div>
        )}
      </div>
      <div className="hold">
        <div style={{ width: `${Math.round(holdFraction * 100)}%` }} />
      </div>
    </div>
  );
}
