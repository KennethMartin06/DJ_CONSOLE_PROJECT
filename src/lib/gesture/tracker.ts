import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandObservation, Handedness, TrackerSnapshot } from "./types";
import { EMPTY_SNAPSHOT } from "./types";
import { HandSmootherBank } from "./smoother";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type DelegatePreference = "CPU" | "GPU";

export interface HandTrackerOptions {
  delegate?: DelegatePreference;
  numHands?: number;
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private smoother = new HandSmootherBank({ minCutoff: 1.0, beta: 0.05 });
  private inferenceEma = 0;
  private lastTimestamp = 0;
  private fpsEma = 0;
  private readonly delegate: DelegatePreference;
  private readonly numHands: number;

  constructor(opts: HandTrackerOptions = {}) {
    this.delegate = opts.delegate ?? "CPU";
    this.numHands = opts.numHands ?? 2;
  }

  async load(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: this.delegate,
      },
      runningMode: "VIDEO",
      numHands: this.numHands,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  detect(video: HTMLVideoElement, timestampMs: number): TrackerSnapshot {
    if (!this.landmarker || video.readyState < 2) return EMPTY_SNAPSHOT;
    if (timestampMs <= this.lastTimestamp) {
      timestampMs = this.lastTimestamp + 1;
    }

    const t0 = performance.now();
    const result = this.landmarker.detectForVideo(video, timestampMs);
    const inferenceMs = performance.now() - t0;
    this.inferenceEma =
      this.inferenceEma === 0 ? inferenceMs : this.inferenceEma * 0.85 + inferenceMs * 0.15;

    const hands: HandObservation[] = [];
    const total = result.landmarks.length;
    for (let i = 0; i < total; i++) {
      const lm = result.landmarks[i];
      const hd = result.handednesses[i]?.[0];
      if (!lm) continue;
      const handedness: Handedness = (hd?.categoryName as Handedness) ?? "Left";
      const smoothed = this.smoother.smooth(handedness, lm, timestampMs);
      hands.push({
        landmarks: smoothed,
        handedness,
        score: hd?.score ?? 0,
      });
    }

    if (this.lastTimestamp > 0) {
      const dt = (timestampMs - this.lastTimestamp) / 1000;
      const instant = dt > 0 ? 1 / dt : 0;
      this.fpsEma = this.fpsEma === 0 ? instant : this.fpsEma * 0.85 + instant * 0.15;
    }
    this.lastTimestamp = timestampMs;

    return { hands, inferenceMs: this.inferenceEma, fps: this.fpsEma, timestampMs };
  }

  dispose(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.smoother.reset();
    this.inferenceEma = 0;
    this.lastTimestamp = 0;
    this.fpsEma = 0;
  }
}
