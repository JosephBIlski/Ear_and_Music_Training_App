/**
 * Web MIDI input: lets the user answer on a real keyboard. Optional – the
 * app falls back silently when the API is unavailable.
 */

type NoteListener = (midi: number, velocity: number) => void;

class MidiInput {
  private access: MIDIAccess | null = null;
  private listeners = new Set<NoteListener>();
  supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  state: 'idle' | 'connected' | 'unavailable' = 'idle';
  inputNames: string[] = [];

  async connect(): Promise<boolean> {
    if (!this.supported) {
      this.state = 'unavailable';
      return false;
    }
    try {
      this.access = await navigator.requestMIDIAccess();
      this.bind();
      this.access.onstatechange = () => this.bind();
      this.state = 'connected';
      return true;
    } catch {
      this.state = 'unavailable';
      return false;
    }
  }

  private bind() {
    if (!this.access) return;
    this.inputNames = [];
    this.access.inputs.forEach((input) => {
      this.inputNames.push(input.name ?? 'MIDI input');
      input.onmidimessage = (ev: MIDIMessageEvent) => {
        const data = ev.data;
        if (!data || data.length < 3) return;
        const status = data[0] & 0xf0;
        const note = data[1];
        const vel = data[2];
        if (status === 0x90 && vel > 0) {
          for (const l of this.listeners) l(note, vel / 127);
        }
      };
    });
  }

  subscribe(fn: NoteListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const midiInput = new MidiInput();
