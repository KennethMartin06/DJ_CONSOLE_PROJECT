import { EMPTY_SNAPSHOT } from "./types";
import type { TrackerSnapshot } from "./types";

export type DelegatePreference = "CPU" | "GPU";

export interface HandTrackerOptions {
  delegate?: DelegatePreference;
  numHands?: number;
}

type WorkerInbound =
  | { type: "ready" }
  | { type: "snapshot"; snapshot: TrackerSnapshot }
  | { type: "error"; message: string };

export class HandTracker {
  private worker: Worker;
  private inFlight = false;
  private latest: TrackerSnapshot = EMPTY_SNAPSHOT;
  private snapshotCb: ((s: TrackerSnapshot) => void) | null = null;
  private errorCb: ((msg: string) => void) | null = null;
  private readyResolve: (() => void) | null = null;
  private readonly readyPromise: Promise<void>;

  constructor(opts: HandTrackerOptions = {}) {
    this.worker = new Worker(new URL("./tracker.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (e: MessageEvent<WorkerInbound>) => this.handle(e.data);
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
    this.worker.postMessage({
      type: "init",
      delegate: opts.delegate ?? "CPU",
      numHands: opts.numHands ?? 2,
    });
  }

  load(): Promise<void> {
    return this.readyPromise;
  }

  onSnapshot(cb: (s: TrackerSnapshot) => void): void {
    this.snapshotCb = cb;
  }

  onError(cb: (msg: string) => void): void {
    this.errorCb = cb;
  }

  async submit(video: HTMLVideoElement, timestampMs: number): Promise<void> {
    if (this.inFlight) return;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    this.inFlight = true;
    try {
      const bitmap = await createImageBitmap(video);
      this.worker.postMessage({ type: "frame", bitmap, timestampMs }, [bitmap]);
    } catch {
      this.inFlight = false;
    }
  }

  snapshot(): TrackerSnapshot {
    return this.latest;
  }

  dispose(): void {
    try {
      this.worker.postMessage({ type: "dispose" });
    } catch {
      /* worker already gone */
    }
    this.worker.terminate();
    this.inFlight = false;
  }

  private handle(msg: WorkerInbound): void {
    if (msg.type === "ready") {
      this.readyResolve?.();
      this.readyResolve = null;
      return;
    }
    if (msg.type === "snapshot") {
      this.inFlight = false;
      this.latest = msg.snapshot;
      this.snapshotCb?.(msg.snapshot);
      return;
    }
    if (msg.type === "error") {
      this.inFlight = false;
      this.errorCb?.(msg.message);
    }
  }
}
