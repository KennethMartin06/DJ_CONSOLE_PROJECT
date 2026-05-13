import { AudioEngine } from "@/lib/audio-engine";
import type { DeckId, EqBand } from "@/lib/audio-engine";
import type { Handedness, HandObservation, NormalizedLandmark, TrackerSnapshot } from "./types";

export type DeckGestureSource = "fist-vol";
export type EqGestureSource = "pinch-rotate";
export type CrossfaderGestureSource = "two-open-xfader";

export interface DeckEngagement {
  engaged: boolean;
  value: number;
  source: DeckGestureSource | null;
  hand: Handedness | null;
}

export interface EqEngagement {
  engaged: boolean;
  band: EqBand | null;
  value: number;
  source: EqGestureSource | null;
  hand: Handedness | null;
}

export interface CrossfaderEngagement {
  engaged: boolean;
  value: number;
  source: CrossfaderGestureSource | null;
}

export interface EngagementState {
  A: DeckEngagement;
  B: DeckEngagement;
  eqA: EqEngagement;
  eqB: EqEngagement;
  crossfader: CrossfaderEngagement;
}

const IDLE_DECK: DeckEngagement = { engaged: false, value: 0, source: null, hand: null };
const IDLE_EQ: EqEngagement = {
  engaged: false,
  band: null,
  value: 0,
  source: null,
  hand: null,
};
const IDLE_XFADER: CrossfaderEngagement = { engaged: false, value: 0, source: null };

const DECK_A_MAX_DISPLAY_X = 0.45;
const DECK_B_MIN_DISPLAY_X = 0.55;
const XFADER_HALF_RANGE = 0.25;
const EQ_ROTATION_SENSITIVITY = 1 / Math.PI;

type EqAnchor = {
  angle: number;
  band: EqBand;
  startValue: number;
  hand: Handedness;
};

type Listener = (state: EngagementState) => void;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function computeWristAngle(landmarks: NormalizedLandmark[]): number {
  const wrist = landmarks[0];
  const mcp = landmarks[9];
  if (!wrist || !mcp) return 0;
  const dx = wrist.x - mcp.x;
  const dy = mcp.y - wrist.y;
  return Math.atan2(dy, dx);
}

function bandForY(y: number): EqBand {
  if (y < 0.33) return "high";
  if (y < 0.66) return "mid";
  return "low";
}

export class GestureMapper {
  private static _instance: GestureMapper | null = null;

  private state: EngagementState = {
    A: { ...IDLE_DECK },
    B: { ...IDLE_DECK },
    eqA: { ...IDLE_EQ },
    eqB: { ...IDLE_EQ },
    crossfader: { ...IDLE_XFADER },
  };
  private listeners = new Set<Listener>();
  private eqAnchors = new Map<DeckId, EqAnchor>();

  static instance(): GestureMapper {
    if (!GestureMapper._instance) GestureMapper._instance = new GestureMapper();
    return GestureMapper._instance;
  }

  private constructor() {}

  update(snapshot: TrackerSnapshot): void {
    const xfaderPair = this.findCrossfaderHands(snapshot.hands);
    const xfaderActive = xfaderPair !== null;

    const fistA = xfaderActive ? null : this.bestFistInRegion(snapshot.hands, "A");
    const fistB = xfaderActive ? null : this.bestFistInRegion(snapshot.hands, "B");

    const nextA = fistA
      ? this.engageVolume("A", fistA)
      : { ...this.state.A, engaged: false, source: null, hand: null };

    const nextB = fistB
      ? this.engageVolume("B", fistB)
      : { ...this.state.B, engaged: false, source: null, hand: null };

    const pinchA = xfaderActive ? null : this.bestPinchInRegion(snapshot.hands, "A");
    const pinchB = xfaderActive ? null : this.bestPinchInRegion(snapshot.hands, "B");

    const nextEqA = pinchA ? this.engageEq("A", pinchA) : this.releaseEq("A");
    const nextEqB = pinchB ? this.engageEq("B", pinchB) : this.releaseEq("B");

    let nextXFader: CrossfaderEngagement;
    if (xfaderPair) {
      const avg = (xfaderPair.left + xfaderPair.right) / 2;
      const value = clamp((avg - 0.5) / XFADER_HALF_RANGE, -1, 1);
      this.applyCrossfader(value);
      nextXFader = { engaged: true, value, source: "two-open-xfader" };
    } else {
      nextXFader = { ...this.state.crossfader, engaged: false, source: null };
    }

    const next: EngagementState = {
      A: nextA,
      B: nextB,
      eqA: nextEqA,
      eqB: nextEqB,
      crossfader: nextXFader,
    };
    if (this.changed(next)) {
      this.state = next;
      for (const l of this.listeners) l(this.state);
    }
  }

  reset(): void {
    this.state = {
      A: { ...IDLE_DECK },
      B: { ...IDLE_DECK },
      eqA: { ...IDLE_EQ },
      eqB: { ...IDLE_EQ },
      crossfader: { ...IDLE_XFADER },
    };
    this.eqAnchors.clear();
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

  private bestPinchInRegion(hands: HandObservation[], deck: DeckId): HandObservation | null {
    let best: HandObservation | null = null;
    for (const hand of hands) {
      if (hand.posture !== "PINCH") continue;
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

  private findCrossfaderHands(hands: HandObservation[]): { left: number; right: number } | null {
    const opens = hands.filter((h) => h.posture === "OPEN" && h.landmarks[0]);
    if (opens.length !== 2) return null;
    const xs = opens.map((h) => 1 - (h.landmarks[0]?.x ?? 0.5)).sort((a, b) => a - b);
    const [left, right] = xs;
    if (left >= 0.5 || right <= 0.5) return null;
    return { left, right };
  }

  private engageVolume(deck: DeckId, hand: HandObservation): DeckEngagement {
    const wrist = hand.landmarks[0];
    const value = clamp(1 - (wrist?.y ?? 0.5), 0, 1);
    this.applyVolume(deck, value);
    return { engaged: true, value, source: "fist-vol", hand: hand.handedness };
  }

  private engageEq(deck: DeckId, hand: HandObservation): EqEngagement {
    const wrist = hand.landmarks[0];
    const wristY = wrist?.y ?? 0.5;
    const angle = computeWristAngle(hand.landmarks);

    let anchor = this.eqAnchors.get(deck);
    if (!anchor) {
      const band = bandForY(wristY);
      const startValue = this.readEq(deck, band);
      anchor = { angle, band, startValue, hand: hand.handedness };
      this.eqAnchors.set(deck, anchor);
    }

    const delta = wrapAngle(angle - anchor.angle);
    const value = clamp(anchor.startValue + delta * EQ_ROTATION_SENSITIVITY, -1, 1);
    this.applyEq(deck, anchor.band, value);

    return {
      engaged: true,
      band: anchor.band,
      value,
      source: "pinch-rotate",
      hand: anchor.hand,
    };
  }

  private releaseEq(deck: DeckId): EqEngagement {
    this.eqAnchors.delete(deck);
    const prev = deck === "A" ? this.state.eqA : this.state.eqB;
    return { ...prev, engaged: false, source: null, hand: null, band: null };
  }

  private applyVolume(deck: DeckId, value: number): void {
    const engine = AudioEngine.instance();
    if (!engine.isReady()) return;
    try {
      engine.getDeck(deck).setVolume(value);
    } catch {
      /* engine torn down */
    }
  }

  private applyEq(deck: DeckId, band: EqBand, value: number): void {
    const engine = AudioEngine.instance();
    if (!engine.isReady()) return;
    try {
      engine.getDeck(deck).setEq(band, value);
    } catch {
      /* engine torn down */
    }
  }

  private readEq(deck: DeckId, band: EqBand): number {
    const engine = AudioEngine.instance();
    if (!engine.isReady()) return 0;
    try {
      return engine.getDeck(deck).getEq(band);
    } catch {
      return 0;
    }
  }

  private applyCrossfader(value: number): void {
    const engine = AudioEngine.instance();
    if (!engine.isReady()) return;
    try {
      engine.getMixer().setCrossfader(value);
    } catch {
      /* engine torn down */
    }
  }

  private changed(next: EngagementState): boolean {
    for (const id of ["A", "B"] as DeckId[]) {
      const a = this.state[id];
      const b = next[id];
      if (a.engaged !== b.engaged || a.source !== b.source || a.hand !== b.hand) return true;
      if (Math.abs(a.value - b.value) > 0.005) return true;
    }
    for (const key of ["eqA", "eqB"] as const) {
      const a = this.state[key];
      const b = next[key];
      if (
        a.engaged !== b.engaged ||
        a.source !== b.source ||
        a.hand !== b.hand ||
        a.band !== b.band
      ) {
        return true;
      }
      if (Math.abs(a.value - b.value) > 0.005) return true;
    }
    const a = this.state.crossfader;
    const b = next.crossfader;
    if (a.engaged !== b.engaged || a.source !== b.source) return true;
    if (Math.abs(a.value - b.value) > 0.005) return true;
    return false;
  }
}
