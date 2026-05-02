import type { Handedness, NormalizedLandmark, Posture } from "./types";

const FINGERS = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
} as const;

const PINCH_THRESHOLD = 0.06;
const EXTEND_RATIO = 1.7;
const THUMB_EXTEND_RATIO = 1.3;

function distance3(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isFingerExtended(
  landmarks: NormalizedLandmark[],
  joints: readonly number[],
): boolean {
  const mcp = landmarks[joints[0]];
  const pip = landmarks[joints[1]];
  const tip = landmarks[joints[3]];
  if (!mcp || !pip || !tip) return false;
  return distance3(mcp, tip) > distance3(mcp, pip) * EXTEND_RATIO;
}

function isThumbExtended(landmarks: NormalizedLandmark[]): boolean {
  const wrist = landmarks[0];
  const mcp = landmarks[2];
  const tip = landmarks[4];
  if (!wrist || !mcp || !tip) return false;
  return distance3(wrist, tip) > distance3(wrist, mcp) * THUMB_EXTEND_RATIO;
}

export function classifyPosture(landmarks: NormalizedLandmark[]): Posture {
  if (landmarks.length < 21) return "UNKNOWN";

  const thumb = isThumbExtended(landmarks);
  const index = isFingerExtended(landmarks, FINGERS.index);
  const middle = isFingerExtended(landmarks, FINGERS.middle);
  const ring = isFingerExtended(landmarks, FINGERS.ring);
  const pinky = isFingerExtended(landmarks, FINGERS.pinky);

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const pinchDist = thumbTip && indexTip ? distance3(thumbTip, indexTip) : 1;

  if (pinchDist < PINCH_THRESHOLD && !middle && !ring && !pinky) return "PINCH";

  const extended = (index ? 1 : 0) + (middle ? 1 : 0) + (ring ? 1 : 0) + (pinky ? 1 : 0);

  if (extended === 0 && !thumb) return "FIST";
  if (index && !middle && !ring && !pinky) return "POINT";
  if (index && middle && !ring && !pinky) return "PEACE";
  if (extended >= 4) return "OPEN";

  return "UNKNOWN";
}

const COMMIT_MS = 150;

class PostureFSM {
  private committed: Posture = "UNKNOWN";
  private candidate: Posture = "UNKNOWN";
  private candidateSinceMs = 0;

  update(observed: Posture, timestampMs: number): Posture {
    if (observed !== this.candidate) {
      this.candidate = observed;
      this.candidateSinceMs = timestampMs;
    }
    if (timestampMs - this.candidateSinceMs >= COMMIT_MS) {
      this.committed = this.candidate;
    }
    return this.committed;
  }

  reset(): void {
    this.committed = "UNKNOWN";
    this.candidate = "UNKNOWN";
    this.candidateSinceMs = 0;
  }
}

export class PostureFSMBank {
  private banks = new Map<Handedness, PostureFSM>();

  update(handedness: Handedness, observed: Posture, timestampMs: number): Posture {
    let fsm = this.banks.get(handedness);
    if (!fsm) {
      fsm = new PostureFSM();
      this.banks.set(handedness, fsm);
    }
    return fsm.update(observed, timestampMs);
  }

  reset(): void {
    this.banks.clear();
  }
}
