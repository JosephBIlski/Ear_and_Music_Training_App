/**
 * Web Audio synth engine. Everything is synthesised (no samples) so the app
 * works fully offline. Several timbres are provided so transcription practice
 * covers a variety of "instruments".
 */
import { midiToFreq } from '../theory/notes';

export type Timbre = 'piano' | 'epiano' | 'strings' | 'pluck' | 'organ' | 'sine' | 'synthlead';
export const TIMBRES: { id: Timbre; name: string }[] = [
  { id: 'piano', name: 'Piano' },
  { id: 'epiano', name: 'Electric piano' },
  { id: 'strings', name: 'Strings / pad' },
  { id: 'pluck', name: 'Pluck / guitar' },
  { id: 'organ', name: 'Organ' },
  { id: 'synthlead', name: 'Synth lead' },
  { id: 'sine', name: 'Pure tone' },
];

export interface PlayEvent {
  /** seconds from the start of the plan */
  time: number;
  notes: number[];
  /** seconds */
  duration: number;
  velocity?: number; // 0..1
  timbre?: Timbre;
}

export interface PlaybackPlan {
  events: PlayEvent[];
  /** total length in seconds (defaults to last event end) */
  length?: number;
}

export function planLength(plan: PlaybackPlan): number {
  if (plan.length != null) return plan.length;
  return plan.events.reduce((m, e) => Math.max(m, e.time + e.duration), 0);
}

export interface PlaybackHandle {
  /** resolves when playback finished (or was stopped) */
  done: Promise<void>;
  stop: () => void;
  /** returns the plan-relative time of the current playhead */
  position: () => number;
}

class Engine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  volume = 0.8;
  defaultTimbre: Timbre = 'piano';
  private activeStops: Set<() => void> = new Set();

  get context(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resume() {
    const ctx = this.context;
    if (ctx.state === 'suspended') await ctx.resume();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.context.currentTime, 0.02);
  }

  /** Stop everything currently sounding (used when the user answers early / navigates away). */
  stopAll() {
    for (const stop of Array.from(this.activeStops)) stop();
    this.activeStops.clear();
  }

  now(): number {
    return this.context.currentTime;
  }

  /**
   * Schedule a single note. Returns a function that hard-stops it.
   * `when` is absolute AudioContext time.
   */
  note(midi: number, when: number, duration: number, velocity = 0.8, timbre: Timbre = this.defaultTimbre): () => void {
    const ctx = this.context;
    const master = this.master!;
    const freq = midiToFreq(midi);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);
    const nodes: AudioScheduledSourceNode[] = [];
    const vel = Math.max(0.05, Math.min(1, velocity));
    const end = when + duration;
    let release = 0.25;

    const osc = (type: OscillatorType, mult: number, gain: number, detune = 0, decay?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mult;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      if (decay) {
        g.gain.setValueAtTime(gain, when);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.001), when + decay);
      }
      o.connect(g);
      g.connect(out);
      o.start(when);
      nodes.push(o);
      return o;
    };

    // Brightness roll-off with pitch so high notes are not harsh.
    const bright = Math.max(0.25, Math.min(1, 1.6 - midi / 84));

    switch (timbre) {
      case 'piano': {
        // Additive "piano-ish": partials with independent decays + a short noisy hammer transient via a filtered sawtooth.
        osc('sine', 1, 0.55);
        osc('sine', 2, 0.28 * bright, 0, duration + 1);
        osc('sine', 3, 0.14 * bright, 0, duration * 0.6 + 0.4);
        osc('sine', 4, 0.07 * bright, 0, duration * 0.4 + 0.25);
        osc('sine', 5.02, 0.04 * bright, 0, 0.5);
        osc('triangle', 1, 0.12, 3, 0.35);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(vel, when + 0.008);
        out.gain.setTargetAtTime(vel * 0.5, when + 0.02, 0.35);
        out.gain.setTargetAtTime(vel * 0.32, when + 0.6, 1.2);
        release = 0.18;
        break;
      }
      case 'epiano': {
        osc('sine', 1, 0.6);
        osc('sine', 2, 0.25 * bright, 0, 0.6);
        osc('sine', 3.01, 0.08 * bright, 0, 0.3);
        osc('sine', 0.5, 0.05);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(vel, when + 0.005);
        out.gain.setTargetAtTime(vel * 0.4, when + 0.03, 0.5);
        release = 0.15;
        break;
      }
      case 'strings': {
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = Math.min(6000, freq * 6 * bright);
        filt.Q.value = 0.5;
        filt.connect(out);
        for (const d of [-7, 0, 7]) {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = freq;
          o.detune.value = d;
          const g = ctx.createGain();
          g.gain.value = 0.16;
          o.connect(g);
          g.connect(filt);
          o.start(when);
          nodes.push(o);
        }
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(vel, when + Math.min(0.25, duration * 0.4));
        release = 0.35;
        break;
      }
      case 'pluck': {
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(Math.min(9000, freq * 10), when);
        filt.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), when + 0.4);
        filt.connect(out);
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = 0.35;
        o.connect(g);
        g.connect(filt);
        o.start(when);
        nodes.push(o);
        osc('sine', 1, 0.3);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(vel, when + 0.004);
        out.gain.setTargetAtTime(0.0001, when + 0.02, 0.45);
        release = 0.1;
        break;
      }
      case 'organ': {
        osc('sine', 1, 0.5);
        osc('sine', 2, 0.35);
        osc('sine', 3, 0.15);
        osc('sine', 4, 0.12);
        osc('sine', 0.5, 0.2);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(vel * 0.7, when + 0.02);
        release = 0.08;
        break;
      }
      case 'synthlead': {
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = Math.min(5000, freq * 5 * bright);
        filt.connect(out);
        for (const [type, d] of [['square', -4], ['sawtooth', 4]] as [OscillatorType, number][]) {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = freq;
          o.detune.value = d;
          const g = ctx.createGain();
          g.gain.value = 0.18;
          o.connect(g);
          g.connect(filt);
          o.start(when);
          nodes.push(o);
        }
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(vel * 0.8, when + 0.02);
        release = 0.12;
        break;
      }
      case 'sine':
      default: {
        osc('sine', 1, 0.8);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(vel * 0.8, when + 0.02);
        release = 0.1;
      }
    }

    // Release
    out.gain.setTargetAtTime(0.0001, end, release / 4);
    const stopAt = end + release * 2 + 0.05;
    for (const n of nodes) n.stop(stopAt);

    let stopped = false;
    const hardStop = () => {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      try {
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0.0001, t + 0.04);
        for (const n of nodes) n.stop(t + 0.06);
      } catch {
        /* node may already be stopped */
      }
      this.activeStops.delete(hardStop);
    };
    this.activeStops.add(hardStop);
    setTimeout(() => this.activeStops.delete(hardStop), (stopAt - ctx.currentTime) * 1000 + 100);
    return hardStop;
  }

  /** Play a chord immediately (used for UI feedback such as piano key clicks). */
  playNow(notes: number[], duration = 0.8, velocity = 0.8, timbre?: Timbre) {
    void this.resume();
    const t = this.now() + 0.01;
    for (const n of notes) this.note(n, t, duration, velocity, timbre ?? this.defaultTimbre);
  }

  /** Schedule a plan; returns a handle to await or stop it. */
  play(plan: PlaybackPlan, timbre?: Timbre): PlaybackHandle {
    void this.resume();
    const ctx = this.context;
    const start = ctx.currentTime + 0.06;
    const stops: (() => void)[] = [];
    for (const ev of plan.events) {
      for (const n of ev.notes) {
        stops.push(this.note(n, start + ev.time, ev.duration, ev.velocity ?? 0.8, ev.timbre ?? timbre ?? this.defaultTimbre));
      }
    }
    const total = planLength(plan);
    let finished = false;
    let resolveDone: () => void = () => {};
    const done = new Promise<void>((res) => (resolveDone = res));
    const timer = setTimeout(() => {
      finished = true;
      resolveDone();
    }, (total + 0.1) * 1000);
    const stop = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      for (const s of stops) s();
      resolveDone();
    };
    return {
      done,
      stop,
      position: () => Math.min(total, Math.max(0, ctx.currentTime - start)),
    };
  }
}

export const engine = new Engine();

// --- Plan builders ------------------------------------------------------------

export function sequencePlan(notes: { notes: number[]; duration: number; velocity?: number }[], startAt = 0, gap = 0.02): PlaybackPlan {
  const events: PlayEvent[] = [];
  let t = startAt;
  for (const n of notes) {
    events.push({ time: t, notes: n.notes, duration: Math.max(0.05, n.duration - gap), velocity: n.velocity });
    t += n.duration;
  }
  return { events, length: t };
}

export function concatPlans(...plans: PlaybackPlan[]): PlaybackPlan {
  const events: PlayEvent[] = [];
  let offset = 0;
  for (const p of plans) {
    for (const e of p.events) events.push({ ...e, time: e.time + offset });
    offset += planLength(p);
  }
  return { events, length: offset };
}

export function shiftPlan(plan: PlaybackPlan, offset: number): PlaybackPlan {
  return { events: plan.events.map((e) => ({ ...e, time: e.time + offset })), length: planLength(plan) + offset };
}

export function mergePlans(...plans: PlaybackPlan[]): PlaybackPlan {
  const events = plans.flatMap((p) => p.events);
  return { events, length: Math.max(...plans.map(planLength)) };
}

export function silence(seconds: number): PlaybackPlan {
  return { events: [], length: seconds };
}
