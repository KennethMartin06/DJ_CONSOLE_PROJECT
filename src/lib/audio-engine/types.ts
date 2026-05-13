export type DeckId = "A" | "B";

export type EqBand = "low" | "mid" | "high";

export interface EqState {
  low: number;
  mid: number;
  high: number;
}

export interface DeckSnapshot {
  id: DeckId;
  hasTrack: boolean;
  trackName: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  eq: EqState;
}

export interface MixerSnapshot {
  crossfader: number;
  master: number;
}
