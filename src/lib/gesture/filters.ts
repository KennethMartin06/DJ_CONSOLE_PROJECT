export interface OneEuroOptions {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

class LowPass {
  private y: number | null = null;

  apply(x: number, alpha: number): number {
    if (this.y === null) {
      this.y = x;
    } else {
      this.y = alpha * x + (1 - alpha) * this.y;
    }
    return this.y;
  }

  reset(): void {
    this.y = null;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xLP = new LowPass();
  private dxLP = new LowPass();
  private prevX: number | null = null;
  private prevTSec: number | null = null;

  constructor(opts: OneEuroOptions = {}) {
    this.minCutoff = opts.minCutoff ?? 1.0;
    this.beta = opts.beta ?? 0.05;
    this.dCutoff = opts.dCutoff ?? 1.0;
  }

  apply(x: number, timestampMs: number): number {
    const tSec = timestampMs / 1000;
    const dt = this.prevTSec === null ? 1 / 30 : Math.max(0.001, tSec - this.prevTSec);

    const dx = this.prevX === null ? 0 : (x - this.prevX) / dt;
    const eDx = this.dxLP.apply(dx, alphaFor(dt, this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(eDx);
    const y = this.xLP.apply(x, alphaFor(dt, cutoff));

    this.prevX = x;
    this.prevTSec = tSec;
    return y;
  }

  reset(): void {
    this.xLP.reset();
    this.dxLP.reset();
    this.prevX = null;
    this.prevTSec = null;
  }
}

function alphaFor(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}
