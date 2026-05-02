/// <reference lib="webworker" />

import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { HandSmootherBank } from "./smoother";
import { classifyPosture, PostureFSMBank } from "./posture";
import type { HandObservation, Handedness, TrackerSnapshot } from "./types";

const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

type InitMsg = { type: "init"; delegate?: "CPU" | "GPU"; numHands?: number };
type FrameMsg = { type: "frame"; bitmap: ImageBitmap; timestampMs: number };
type DisposeMsg = { type: "dispose" };
type InboundMsg = InitMsg | FrameMsg | DisposeMsg;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let landmarker: HandLandmarker | null = null;
const smoother = new HandSmootherBank({ minCutoff: 1.0, beta: 0.05 });
const postureBank = new PostureFSMBank();
let inferenceEma = 0;
let lastTimestamp = 0;
let fpsEma = 0;

ctx.onmessage = async (e: MessageEvent<InboundMsg>) => {
  const msg = e.data;

  if (msg.type === "init") {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: msg.delegate ?? "CPU",
        },
        runningMode: "VIDEO",
        numHands: msg.numHands ?? 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      ctx.postMessage({ type: "ready" });
    } catch (err) {
      ctx.postMessage({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (msg.type === "frame") {
    if (!landmarker) {
      msg.bitmap.close();
      return;
    }
    let ts = msg.timestampMs;
    if (ts <= lastTimestamp) ts = lastTimestamp + 1;

    const t0 = performance.now();
    let result;
    try {
      result = landmarker.detectForVideo(msg.bitmap, ts);
    } finally {
      msg.bitmap.close();
    }
    const inferenceMs = performance.now() - t0;
    inferenceEma =
      inferenceEma === 0 ? inferenceMs : inferenceEma * 0.85 + inferenceMs * 0.15;

    const hands: HandObservation[] = [];
    for (let i = 0; i < result.landmarks.length; i++) {
      const lm = result.landmarks[i];
      const hd = result.handednesses[i]?.[0];
      if (!lm) continue;
      const handedness: Handedness = (hd?.categoryName as Handedness) ?? "Left";
      const smoothed = smoother.smooth(handedness, lm, ts);
      const observed = classifyPosture(smoothed);
      const posture = postureBank.update(handedness, observed, ts);
      hands.push({
        landmarks: smoothed,
        handedness,
        score: hd?.score ?? 0,
        posture,
      });
    }

    if (lastTimestamp > 0) {
      const dt = (ts - lastTimestamp) / 1000;
      const instant = dt > 0 ? 1 / dt : 0;
      fpsEma = fpsEma === 0 ? instant : fpsEma * 0.85 + instant * 0.15;
    }
    lastTimestamp = ts;

    const snapshot: TrackerSnapshot = {
      hands,
      inferenceMs: inferenceEma,
      fps: fpsEma,
      timestampMs: ts,
    };
    ctx.postMessage({ type: "snapshot", snapshot });
    return;
  }

  if (msg.type === "dispose") {
    if (landmarker) {
      landmarker.close();
      landmarker = null;
    }
    smoother.reset();
    postureBank.reset();
    inferenceEma = 0;
    lastTimestamp = 0;
    fpsEma = 0;
  }
};
