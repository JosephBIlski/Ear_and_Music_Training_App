interface Props {
  count: number;
  values: (string | null)[];
  current: number;
  onSelect: (i: number) => void;
  label: (token: string) => string;
  /** after checking: expected tokens and per-position correctness */
  result?: { expected: string[]; perPosition: boolean[] } | null;
}

export function SequenceSlots({ count, values, current, onSelect, label, result }: Props) {
  return (
    <div className="slots">
      {Array.from({ length: count }, (_, i) => {
        const v = values[i];
        const cls = ['slot'];
        if (v) cls.push('filled');
        if (i === current && !result) cls.push('current');
        if (result) cls.push(result.perPosition[i] ? 'correct' : 'wrong');
        return (
          <div key={i} className={cls.join(' ')} onClick={() => !result && onSelect(i)} role="button">
            {v ? label(v) : <span className="muted">{i + 1}</span>}
            {result && !result.perPosition[i] && <span className="expected">→ {label(result.expected[i])}</span>}
          </div>
        );
      })}
    </div>
  );
}
