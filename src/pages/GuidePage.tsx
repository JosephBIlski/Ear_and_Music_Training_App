import { Link } from 'react-router-dom';

export function GuidePage() {
  return (
    <div className="page narrow explain">
      <h1>How to use this app</h1>
      <div className="card">
        <h2>The goal</h2>
        <p>Get from "I can hear that a melody goes up" to "that is do–mi–so–la, over a I–vi–IV–V", and from there to recreating the ideas in your head on a piano or in FL Studio without hunting. The route is relative pitch: hearing every note and chord as a position inside the key, using movable-do solfège.</p>
        <h2>The 15-minute routine</h2>
        <p>Open <Link to="/daily">Daily session</Link>. It builds a plan from your current level in each module, adds a review block when items are due, and sizes everything to your daily target. A typical day:</p>
        <ul className="tips">
          <li><b>Functional degrees</b> (3–4 min) – the core skill, every day.</li>
          <li><b>Review</b> – due items the scheduler wants to re-test (only when there are enough).</li>
          <li><b>Intervals / chord quality / chord function</b> (3 min) – two of these rotate daily.</li>
          <li><b>Singing</b> (2–3 min) – warm-ups, scales, or "sing the degree".</li>
          <li><b>Transcription</b> (4–5 min) – melodies and chord progressions, alternating emphasis each day.</li>
        </ul>
        <p>Consistency beats length. If you have extra time, use a module's <b>Practice mode</b> to hammer the specific items that show up under "Needs attention" on the home page.</p>
      </div>

      <div className="card">
        <h2>Test mode vs practice mode</h2>
        <p><b>Levels</b> are tests with a fixed configuration and a pass mark. Passing unlocks the next level and records your score. <b>Practice mode</b> lets you configure anything (which degrees, which keys, how many notes, which instruments…) and run as long as you like. Both feed the spaced-repetition scheduler.</p>
        <h2>Spaced repetition</h2>
        <p>Every degree, interval, chord quality and chord function is an item with its own history. Items you miss are re-queued to come back within a few questions, get a heavier weight in every future selection, and become "due" immediately. Items you get right repeatedly are asked less often and scheduled days ahead. The <Link to="/stats">Progress</Link> page shows the accuracy heat-maps and your most common confusions.</p>
      </div>

      <div className="card">
        <h2>The method, briefly</h2>
        <p><b>Cadence → note → resolution.</b> A I–IV–V–I cadence tells your ear where home is. You name the note that follows by its tension, not by comparing it to the previous note. After you answer, the note walks stepwise back to do; listening to that resolution every time is what builds the reflex (Alain Benbassat's method, as used by the Functional Ear Trainer app).</p>
        <p><b>Do-based minor.</b> In minor keys the tonic is still do and the lowered notes are me, le and te. This keeps "home" feeling identical across modes, which is what matters for transcription. Switch to la-based labels in Settings if you were trained that way.</p>
        <p><b>Sing everything.</b> If you can sing a degree on demand you can find it on any instrument. Sing before you answer, sing the resolution along with the app, and do the singing module even if you never plan to perform.</p>
        <p><b>Chords are bass degree + quality.</b> Hear the bass as a scale degree, then ask "major or minor?" – that is most of functional harmony.</p>
      </div>

      <div className="card">
        <h2>From ear to DAW</h2>
        <ul className="tips">
          <li>Hum or record the idea first so it cannot slip away.</li>
          <li>Find do: sing the idea, then sing down to the note that feels like the final resting point. Play that on the keyboard – that is your key.</li>
          <li>Name the degrees of the melody the way you do in the Melody transcription module, then map them to keys (do = the root you found).</li>
          <li>For chords, work out the bass line as degrees and the quality of each chord; enter them as Roman numerals in your notes, then as notes in the piano roll.</li>
          <li>Set FL Studio's piano roll to highlight the scale (View → Scale highlighting) – it makes degree-to-key mapping visual while your ear catches up.</li>
          <li>Use the <b>Absolute</b> melody levels to practise exactly this workflow: no key given, find the notes on the piano by ear.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Controls</h2>
        <table className="plain">
          <tbody>
            <tr><td><span className="kbd">Space</span></td><td>Replay the question (with cadence)</td></tr>
            <tr><td><span className="kbd">R</span></td><td>Replay the target only (no cadence)</td></tr>
            <tr><td><span className="kbd">1</span>–<span className="kbd">9</span> <span className="kbd">0</span> <span className="kbd">-</span> <span className="kbd">=</span></td><td>Pick the answer buttons in order</td></tr>
            <tr><td><span className="kbd">A</span> <span className="kbd">W</span> <span className="kbd">S</span> <span className="kbd">E</span> <span className="kbd">D</span> …</td><td>Play the on-screen piano (A = C, W = C#, …)</td></tr>
            <tr><td><span className="kbd">Enter</span></td><td>Next question / check a sequence</td></tr>
            <tr><td><span className="kbd">Backspace</span></td><td>Remove the last note in a sequence</td></tr>
          </tbody>
        </table>
        <p className="muted small mt">A MIDI keyboard can be enabled in Settings (Chrome and Edge) to answer degree and absolute-pitch questions directly.</p>
      </div>
    </div>
  );
}
