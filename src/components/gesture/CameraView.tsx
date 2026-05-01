"use client";

import { useCamera } from "@/hooks/useCamera";

interface CameraViewProps {
  enabled: boolean;
}

export function CameraView({ enabled }: CameraViewProps) {
  const { videoRef, error, ready, resolution } = useCamera(enabled);

  if (!enabled) return null;

  return (
    <div className="fixed right-4 top-20 z-50 w-64 overflow-hidden rounded-xl border border-zinc-700 bg-black/85 shadow-2xl backdrop-blur">
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
        {ready && (
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-rose-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
            Live
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-3 text-center font-mono text-[11px] leading-snug text-red-300">
            {error}
          </div>
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 font-mono text-xs text-zinc-400">
            Requesting camera…
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-zinc-500">Camera</span>
        <span className={ready ? "text-emerald-400" : "text-zinc-600"}>
          {ready
            ? `${resolution?.w ?? "?"}×${resolution?.h ?? "?"}`
            : error
              ? "error"
              : "idle"}
        </span>
      </div>
    </div>
  );
}
