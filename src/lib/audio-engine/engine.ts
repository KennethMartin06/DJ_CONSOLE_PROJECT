import { Deck } from "./deck";
import { Mixer } from "./mixer";
import type { DeckId } from "./types";

export class AudioEngine {
  private static _instance: AudioEngine | null = null;

  private context: AudioContext | null = null;
  private mixer: Mixer | null = null;
  private decks = new Map<DeckId, Deck>();

  static instance(): AudioEngine {
    if (!AudioEngine._instance) AudioEngine._instance = new AudioEngine();
    return AudioEngine._instance;
  }

  private constructor() {}

  isReady(): boolean {
    return this.context !== null;
  }

  async ensure(): Promise<void> {
    if (this.context) {
      if (this.context.state === "suspended") await this.context.resume();
      return;
    }
    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new Ctor({ latencyHint: "interactive" });

    this.mixer = new Mixer(this.context);

    const deckA = new Deck(this.context, "A");
    deckA.output.connect(this.mixer.input.A);
    this.decks.set("A", deckA);

    const deckB = new Deck(this.context, "B");
    deckB.output.connect(this.mixer.input.B);
    this.decks.set("B", deckB);
  }

  getDeck(id: DeckId): Deck {
    const d = this.decks.get(id);
    if (!d) throw new Error(`Deck ${id} not initialized — call ensure() first`);
    return d;
  }

  getMixer(): Mixer {
    if (!this.mixer) throw new Error("Mixer not initialized — call ensure() first");
    return this.mixer;
  }

  outputLatencyMs(): number {
    if (!this.context) return 0;
    const out = this.context.outputLatency ?? 0;
    const base = this.context.baseLatency ?? 0;
    return (out + base) * 1000;
  }

  sampleRate(): number {
    return this.context?.sampleRate ?? 0;
  }
}
