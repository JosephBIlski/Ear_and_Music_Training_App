/**
 * Microphone capture with a simple analysis loop. Emits smoothed pitch
 * readings (midi + cents) at ~30 fps.
 */
import { detectPitch } from './pitch';
import { freqToMidi } from '../theory/notes';
import { engine } from './engine';

export interface PitchFrame {
  /** raw frequency (0 when no confident pitch) */
  frequency: number;
  /** fractional midi note (NaN when no pitch) */
  midi: number;
  clarity: number;
  rms: number;
  time: number; // ms
}

type Listener = (frame: PitchFrame) => void;

class Mic {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array | null = null;
  private raf = 0;
  private listeners = new Set<Listener>();
  private smoothedMidi = NaN;
  state: 'idle' | 'starting' | 'running' | 'denied' | 'error' = 'idle';
  errorMessage = '';
  sensitivity = 0.01; // rms threshold

  async start(): Promise<boolean> {
    if (this.state === 'running') return true;
    this.state = 'starting';
    try {
      await engine.resume();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      });
      const ctx = engine.context;
      this.source = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.buffer = new Float32Array(this.analyser.fftSize);
      this.source.connect(this.analyser);
      this.state = 'running';
      this.loop();
      return true;
    } catch (e) {
      const err = e as Error;
      this.state = err.name === 'NotAllowedError' ? 'denied' : 'error';
      this.errorMessage = err.message;
      return false;
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.state = 'idle';
    this.smoothedMidi = NaN;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private loop = () => {
    if (!this.analyser || !this.buffer) return;
    this.analyser.getFloatTimeDomainData(this.buffer as Float32Array<ArrayBuffer>);
    const res = detectPitch(this.buffer, engine.context.sampleRate, { rmsThreshold: this.sensitivity });
    let midi = NaN;
    if (res.frequency > 0) {
      const raw = freqToMidi(res.frequency);
      // light smoothing, but reset when jumping more than a semitone (new note)
      if (!Number.isNaN(this.smoothedMidi) && Math.abs(raw - this.smoothedMidi) < 1) {
        this.smoothedMidi = this.smoothedMidi * 0.5 + raw * 0.5;
      } else {
        this.smoothedMidi = raw;
      }
      midi = this.smoothedMidi;
    } else {
      this.smoothedMidi = NaN;
    }
    const frame: PitchFrame = { frequency: res.frequency, midi, clarity: res.clarity, rms: res.rms, time: performance.now() };
    for (const l of this.listeners) l(frame);
    this.raf = requestAnimationFrame(this.loop);
  };
}

export const mic = new Mic();
