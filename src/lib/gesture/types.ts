export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type Handedness = "Left" | "Right";

export type Posture = "OPEN" | "FIST" | "PINCH" | "POINT" | "PEACE" | "UNKNOWN";

export interface HandObservation {
  landmarks: NormalizedLandmark[];
  handedness: Handedness;
  score: number;
  posture: Posture;
}

export interface TrackerSnapshot {
  hands: HandObservation[];
  inferenceMs: number;
  fps: number;
  timestampMs: number;
}

export const EMPTY_SNAPSHOT: TrackerSnapshot = {
  hands: [],
  inferenceMs: 0,
  fps: 0,
  timestampMs: 0,
};
