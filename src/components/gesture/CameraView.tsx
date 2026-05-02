"use client";

import { useCamera } from "@/hooks/useCamera";
import { useHandTracker } from "@/hooks/useHandTracker";
import { HandOverlay } from "./HandOverlay";

interface CameraViewProps {
  enabled: boolean;
}

export function CameraView({ enabled }: CameraViewProps) {
  const { videoRef, error: cameraError, ready, resolution } = useCamera(enabled);
  const trackingEnabled = enabled && ready && !cameraError;
  const {
    snapshot,
    loading: trackerLoading,
    error: trackerError,
  } = useHandTracker(videoRef, trackingEnabled);

  if (!enabled) return null;

  const handCount = snapshot.hands.length;
  const fpsLabel = snapshot.fps > 0 ? `${snapshot.fps.toFixed(0)} fps` : "—";
  const inferLabel =
    snapshot.inferenceMs > 0 ? `${snapshot.inferenceMs.toFixed(0)} ms` : "—";
  const fpsClass =
    snapshot.fps >= 25
      ? "text-emerald-400"
      : snapshot.fps >= 12
        ? "text-amber-300"
        : snapshot.fps > 0
          ? "text-red-400"
          : "text-zinc-200";
  const inferClass =
    snapshot.inferenceMs === 0
      ? "text-zinc-200"
      : snapshot.inferenceMs <= 40
        ? "text-emerald-400"
        : snapshot.inferenceMs <= 100
          ? "text-amber-300"
          : "text-red-400";

  return (
    <div className="fixed right-4 top-20 z-50 w-72 overflow-hidden rounded-xl border border-zinc-700 bg-black/85 shadow-2xl backdrop-blur">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full bg-zinc-900 object-cover"
          style={{ transform: "scaleX(-1)" }}
          aria-label="Camera preview"
        />
        <HandOverlay snapshot={snapshot} />

        {ready && !cameraError && (
          <>
            <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-rose-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
              Live
            </div>
            <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-300">
              {handCount} hand{handCount === 1 ? "" : "s"}
            </div>
            {snapshot.hands.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-wrap items-center justify-center gap-1.5 px-2">
                {snapshot.hands.map((hand) => (
                  <span
                    key={hand.handedness}
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur ${
                      hand.handedness === "Left"
                        ? "bg-cyan-500/30 text-cyan-100"
                        : "bg-orange-500/30 text-orange-100"
                    }`}
                  >
                    {hand.handedness[0]} · {hand.posture}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {trackerLoading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-black/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-300">
            Loading hand model…
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-3 text-center font-mono text-[11px] leading-snug text-red-300">
            {cameraError}
          </div>
        )}

        {trackerError && !cameraError && (
          <div className="absolute inset-x-0 bottom-2 mx-2 rounded bg-red-950/80 px-2 py-1 text-center font-mono text-[10px] text-red-300">
            Tracker: {trackerError}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
        <div className="flex flex-col">
          <span className="text-zinc-500">Cam</span>
          <span className={ready ? "text-emerald-400" : "text-zinc-600"}>
            {resolution ? `${resolution.w}×${resolution.h}` : "idle"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-zinc-500">FPS</span>
          <span className={fpsClass}>{fpsLabel}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-zinc-500">Infer</span>
          <span className={inferClass}>{inferLabel}</span>
        </div>
      </div>
    </div>
  );
}
