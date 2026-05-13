"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioEngine } from "@/lib/audio-engine";
import type { MixerSnapshot } from "@/lib/audio-engine";
import { useGestureCrossfader } from "@/hooks/useGestureCrossfader";

interface MixerPanelProps {
  ready: boolean;
}

export function MixerPanel({ ready }: MixerPanelProps) {
  const [snap, setSnap] = useState<MixerSnapshot | null>(null);
  const xfaderEngagement = useGestureCrossfader();

  useEffect(() => {
    if (!ready) return;
    return AudioEngine.instance().getMixer().subscribe(setSnap);
  }, [ready]);

  const handleCrossfader = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!ready) return;
      AudioEngine.instance().getMixer().setCrossfader(Number(e.target.value) / 100);
    },
    [ready],
  );

  const handleMaster = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!ready) return;
      AudioEngine.instance().getMixer().setMaster(Number(e.target.value) / 100);
    },
    [ready],
  );

  const xfader = snap?.crossfader ?? 0;
  const master = snap?.master ?? 0.85;
  const engaged = xfaderEngagement.engaged;

  return (
    <section
      className={`flex flex-col items-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-shadow duration-150 ${
        engaged ? "ring-2 ring-fuchsia-400 shadow-[0_0_28px_rgba(232,121,249,0.45)]" : ""
      }`}
      aria-label="Mixer"
    >
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Mixer</p>

      <div className="flex flex-1 flex-col items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">Master</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(master * 100)}
          onChange={handleMaster}
          disabled={!ready}
          className="vertical-range h-40 w-2 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-zinc-200 disabled:opacity-30"
          aria-label="Master volume"
          style={{ writingMode: "vertical-lr", direction: "rtl" } as React.CSSProperties}
        />
        <span className="w-10 text-center font-mono text-xs text-zinc-400">
          {Math.round(master * 100)}
        </span>
      </div>

      <div className="w-full">
        <div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest">
          <span className="text-cyan-400">A</span>
          <span
            className={
              engaged ? "text-fuchsia-300 animate-pulse" : "text-zinc-500"
            }
          >
            {engaged ? "✋✋ Crossfade" : "Crossfade"}
          </span>
          <span className="text-orange-400">B</span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={Math.round(xfader * 100)}
          onChange={handleCrossfader}
          disabled={!ready}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-cyan-500/30 via-zinc-800 to-orange-500/30 accent-zinc-100 disabled:opacity-30"
          aria-label="Crossfader"
        />
      </div>
    </section>
  );
}
