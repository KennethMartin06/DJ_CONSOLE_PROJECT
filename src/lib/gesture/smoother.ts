import { OneEuroFilter, type OneEuroOptions } from "./filters";
import type { Handedness, NormalizedLandmark } from "./types";

const NUM_LANDMARKS = 21;
const STALE_RESET_MS = 300;

class HandFilters {
  readonly filters: OneEuroFilter[];
  lastSeenMs = 0;

  constructor(opts: OneEuroOptions) {
    this.filters = Array.from({ length: NUM_LANDMARKS * 3 }, () => new OneEuroFilter(opts));
  }

  smooth(landmarks: NormalizedLandmark[], timestampMs: number): NormalizedLandmark[] {
    if (this.lastSeenMs > 0 && timestampMs - this.lastSeenMs > STALE_RESET_MS) {
      for (const f of this.filters) f.reset();
    }
    this.lastSeenMs = timestampMs;

    const out: NormalizedLandmark[] = new Array(landmarks.length);
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (!lm) continue;
      const base = i * 3;
      out[i] = {
        x: this.filters[base].apply(lm.x, timestampMs),
        y: this.filters[base + 1].apply(lm.y, timestampMs),
        z: this.filters[base + 2].apply(lm.z, timestampMs),
        visibility: lm.visibility,
      };
    }
    return out;
  }
}

export class HandSmootherBank {
  private banks = new Map<Handedness, HandFilters>();
  private readonly opts: OneEuroOptions;

  constructor(opts: OneEuroOptions = { minCutoff: 1.0, beta: 0.05 }) {
    this.opts = opts;
  }

  smooth(
    handedness: Handedness,
    landmarks: NormalizedLandmark[],
    timestampMs: number,
  ): NormalizedLandmark[] {
    let bank = this.banks.get(handedness);
    if (!bank) {
      bank = new HandFilters(this.opts);
      this.banks.set(handedness, bank);
    }
    return bank.smooth(landmarks, timestampMs);
  }

  reset(): void {
    this.banks.clear();
  }
}
