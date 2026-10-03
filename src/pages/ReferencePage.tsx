import { ChordReference } from '../components/ChordReference';

export function ReferencePage() {
  return (
    <div className="page">
      <h1>Chord & scale reference</h1>
      <p className="muted">Which notes make up each chord, in solfège, scale degrees and note names, for any key. The same panel is available from the Reference button inside exercises.</p>
      <div className="card">
        <ChordReference />
      </div>
    </div>
  );
}
