import { AudioEngine } from "@/lib/audio-engine";
import type { DeckId } from "@/lib/audio-engine";
import type { Handedness, HandObservation, TrackerSnapshot } from "./types";

export type GestureSource = "fist-vol";

export interface DeckEngagement {
  engaged: boolean;
  value: number;
  source: GestureSource | null;
  hand: Handedness | null;
}

export type EngagementState = Record<DeckId, DeckEngagement>;

const IDLE_A: DeckEngagement = { engaged: false, value: 0, source: null, hand: null };
const IDLE_B: DeckEngagement = { engaged: false, value: 0, source: null, hand: null };

const DECK_A_MAX_DISPLAY_X = 0.45;
const DECK_B_MIN_DISPLAY_X = 0.55;

type Listener = (state: EngagementState) => void;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class GestureMapper {
  private static _instance: GestureMapper | null = null;

  private state: EngagementState = { A: { ...IDLE_A }, B: { ...IDLE_B } };
  private listeners = new Set<Listener>();

  static instance(): GestureMapper {
    if (!GestureMapper._instance) GestureMapper._instance = new GestureMapper();
    return GestureMapper._instance;
  }

  private constructor() {}

  update(snapshot: TrackerSnapshot): void {
    const fistA = this.bestFistInRegion(snapshot.hands, "A");
    const fistB = this.bestFistInRegion(snapshot.hands, "B");

    const nextA = fistA
      ? this.engageVolume("A", fistA)
      : { ...this.state.A, engaged: false, source: null, hand: null };

    const nextB = fistB
      ? this.engageVolume("B", fistB)
      : { ...this.state.B, engaged: false, source: null, hand: null };

    const next: EngagementState = { A: nextA, B: nextB };
    if (this.changed(next)) {
      this.state = next;
      for (const l of this.listeners) l(this.state);
    }
  }

  reset(): void {
    this.state = { A: { ...IDLE_A }, B: { ...IDLE_B } };
    for (const l of this.listeners) l(this.state);
  }

  getState(): EngagementState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private bestFistInRegion(hands: HandObservation[], deck: DeckId): HandObservation | null {
    let best: HandObservation | null = null;
    for (const hand of hands) {
      if (hand.posture !== "FIST") continue;
      const wrist = hand.landmarks[0];
      if (!wrist) continue;
      const displayX = 1 - wrist.x;
      const inRegion =
        deck === "A" ? displayX <= DECK_A_MAX_DISPLAY_X : displayX >= DECK_B_MIN_DISPLAY_X;
      if (!inRegion) continue;
      if (!best || hand.score > best.score) best = hand;
    }
    return best;
  }

  private engageVolume(deck: DeckId, hand: HandObservation): DeckEngagement {
    const wrist = hand.landmarks[0];
    const value = clamp(1 - (wrist?.y ?? 0.5), 0, 1);
    this.applyVolume(deck, value);
    return { engaged: true, value, source: "fist-vol", hand: hand.handedness };
  }

  private applyVolume(deck: DeckId, value: number): void {
    const engine = AudioEngine.instance();
    if (!engine.isReady()) return;
    try {
      engine.getDeck(deck).setVolume(value);
    } catch {
      /* engine torn down mid-update */
    }
  }

  private changed(next: EngagementState): boolean {
    for (const id of ["A", "B"] as DeckId[]) {
      const a = this.state[id];
      const b = next[id];
      if (a.engaged !== b.engaged || a.source !== b.source || a.hand !== b.hand) return true;
      if (Math.abs(a.value - b.value) > 0.005) return true;
    }
    return false;
  }
}
