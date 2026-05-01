export type DeckId = "A" | "B";

export interface DeckSnapshot {
  id: DeckId;
  hasTrack: boolean;
  trackName: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
}

export interface MixerSnapshot {
  crossfader: number;
  master: number;
}
