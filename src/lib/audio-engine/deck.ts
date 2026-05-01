import type { DeckId, DeckSnapshot } from "./types";

type Listener = (snap: DeckSnapshot) => void;

export class Deck {
  readonly id: DeckId;
  readonly output: GainNode;

  private context: AudioContext;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private trackName: string | null = null;

  private startedAtCtx = 0;
  private offsetAtStart = 0;
  private pausedPosition = 0;
  private playing = false;
  private vol = 1;

  private listeners = new Set<Listener>();

  constructor(context: AudioContext, id: DeckId) {
    this.context = context;
    this.id = id;
    this.output = context.createGain();
    this.output.gain.value = this.vol;
  }

  async load(file: File | Blob, name?: string): Promise<{ durationMs: number }> {
    this.stopSource();
    const arrayBuf = await file.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuf);
    this.trackName = name ?? (file instanceof File ? file.name : "Untitled");
    this.pausedPosition = 0;
    this.playing = false;
    this.notify();
    return { durationMs: this.buffer.duration * 1000 };
  }

  play(): void {
    if (!this.buffer || this.playing) return;
    const src = this.context.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.output);
    src.onended = () => {
      if (this.source !== src) return;
      this.playing = false;
      this.pausedPosition = this.buffer?.duration ?? 0;
      this.source = null;
      this.notify();
    };
    const offset = clamp(this.pausedPosition, 0, this.buffer.duration);
    src.start(0, offset);
    this.source = src;
    this.offsetAtStart = offset;
    this.startedAtCtx = this.context.currentTime;
    this.playing = true;
    this.notify();
  }

  pause(): void {
    if (!this.playing) return;
    const pos = this.getPositionSeconds();
    this.stopSource();
    this.pausedPosition = pos;
    this.playing = false;
    this.notify();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seekMs(ms: number): void {
    if (!this.buffer) return;
    const target = clamp(ms / 1000, 0, this.buffer.duration);
    const wasPlaying = this.playing;
    this.stopSource();
    this.pausedPosition = target;
    this.playing = false;
    if (wasPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  setVolume(v: number): void {
    this.vol = clamp(v, 0, 1);
    this.output.gain.setTargetAtTime(this.vol, this.context.currentTime, 0.01);
    this.notify();
  }

  getPositionSeconds(): number {
    if (!this.buffer) return 0;
    if (this.playing) {
      const elapsed = this.context.currentTime - this.startedAtCtx;
      return Math.min(this.offsetAtStart + elapsed, this.buffer.duration);
    }
    return this.pausedPosition;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  snapshot(): DeckSnapshot {
    return {
      id: this.id,
      hasTrack: this.buffer !== null,
      trackName: this.trackName,
      isPlaying: this.playing,
      positionMs: this.getPositionSeconds() * 1000,
      durationMs: (this.buffer?.duration ?? 0) * 1000,
      volume: this.vol,
    };
  }

  private stopSource(): void {
    if (!this.source) return;
    try {
      this.source.onended = null;
      this.source.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.source.disconnect();
    } catch {
      /* already disconnected */
    }
    this.source = null;
  }

  private notify(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
