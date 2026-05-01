import type { MixerSnapshot } from "./types";

type Listener = (snap: MixerSnapshot) => void;

export class Mixer {
  readonly input: { A: GainNode; B: GainNode };
  readonly master: GainNode;

  private context: AudioContext;
  private xfader = 0;
  private masterGain = 0.85;
  private listeners = new Set<Listener>();

  constructor(context: AudioContext) {
    this.context = context;
    this.input = {
      A: context.createGain(),
      B: context.createGain(),
    };
    this.master = context.createGain();
    this.master.gain.value = this.masterGain;

    this.input.A.connect(this.master);
    this.input.B.connect(this.master);
    this.master.connect(context.destination);

    this.applyCrossfader();
  }

  setCrossfader(v: number): void {
    this.xfader = Math.max(-1, Math.min(1, v));
    this.applyCrossfader();
    this.notify();
  }

  setMaster(v: number): void {
    this.masterGain = Math.max(0, Math.min(1, v));
    this.master.gain.setTargetAtTime(this.masterGain, this.context.currentTime, 0.01);
    this.notify();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  snapshot(): MixerSnapshot {
    return {
      crossfader: this.xfader,
      master: this.masterGain,
    };
  }

  private applyCrossfader(): void {
    const angle = ((this.xfader + 1) / 2) * (Math.PI / 2);
    const gainA = Math.cos(angle);
    const gainB = Math.sin(angle);
    const t = this.context.currentTime;
    this.input.A.gain.setTargetAtTime(gainA, t, 0.01);
    this.input.B.gain.setTargetAtTime(gainB, t, 0.01);
  }

  private notify(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }
}
