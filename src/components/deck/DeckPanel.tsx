"use client";

import { useCallback, useRef } from "react";
import { AudioEngine } from "@/lib/audio-engine";
import type { DeckId } from "@/lib/audio-engine";
import { useDeck } from "@/hooks/useDeck";
import { useGestureEngagement } from "@/hooks/useGestureEngagement";

interface DeckPanelProps {
  id: DeckId;
  ready: boolean;
  onLoadStart: () => Promise<void>;
}

const ACCENT: Record<
  DeckId,
  { ring: string; bar: string; label: string; glow: string; glowText: string }
> = {
  A: {
    ring: "ring-cyan-400/60",
    bar: "bg-cyan-400",
    label: "text-cyan-300",
    glow: "ring-2 ring-cyan-400 shadow-[0_0_28px_rgba(34,211,238,0.45)]",
    glowText: "text-cyan-300",
  },
  B: {
    ring: "ring-orange-400/60",
    bar: "bg-orange-400",
    label: "text-orange-300",
    glow: "ring-2 ring-orange-400 shadow-[0_0_28px_rgba(251,146,60,0.45)]",
    glowText: "text-orange-300",
  },
};

export function DeckPanel({ id, ready, onLoadStart }: DeckPanelProps) {
  const snap = useDeck(id, ready);
  const engagement = useGestureEngagement(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accent = ACCENT[id];

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await onLoadStart();
      const deck = AudioEngine.instance().getDeck(id);
      try {
        await deck.load(file);
      } catch (err) {
        console.error("Failed to load track:", err);
      }
    },
    [id, onLoadStart],
  );

  const handlePlayPause = useCallback(async () => {
    await onLoadStart();
    AudioEngine.instance().getDeck(id).toggle();
  }, [id, onLoadStart]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!ready) return;
      const ms = Number(e.target.value);
      AudioEngine.instance().getDeck(id).seekMs(ms);
    },
    [id, ready],
  );

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!ready) return;
      AudioEngine.instance().getDeck(id).setVolume(Number(e.target.value) / 100);
    },
    [id, ready],
  );

  const positionMs = snap?.positionMs ?? 0;
  const durationMs = snap?.durationMs ?? 0;
  const volume = Math.round((snap?.volume ?? 1) * 100);
  const isPlaying = snap?.isPlaying ?? false;
  const trackName = snap?.trackName ?? "— No Track Loaded —";

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 ring-1 transition-shadow duration-150 ${accent.ring} ${
        engagement.engaged ? accent.glow : ""
      }`}
      aria-label={`Deck ${id}`}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 font-mono text-2xl font-bold ${accent.label}`}
          >
            {id}
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Deck {id}</p>
            <p className="max-w-[260px] truncate font-mono text-sm text-zinc-200">{trackName}</p>
          </div>
        </div>
        <label className="cursor-pointer rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900">
          Load Track
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      </header>

      <div
        className={`flex aspect-square w-full items-center justify-center rounded-full border-2 border-zinc-800 bg-gradient-to-br from-zinc-900 to-black shadow-inner transition ${
          isPlaying ? "animate-spin-slow" : ""
        }`}
        aria-hidden
      >
        <div className="flex h-1/3 w-1/3 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950">
          <div className={`h-2 w-2 rounded-full ${isPlaying ? accent.bar : "bg-zinc-700"}`} />
        </div>
      </div>

      <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
        <span>{formatTime(positionMs)}</span>
        <span className="text-zinc-600">/ {formatTime(durationMs)}</span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(durationMs, 1)}
        step={10}
        value={positionMs}
        onChange={handleSeek}
        disabled={!snap?.hasTrack}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-zinc-200 disabled:opacity-30"
        aria-label="Track position"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!snap?.hasTrack && ready}
          className={`flex-1 rounded-md border px-4 py-2 text-sm font-semibold transition disabled:opacity-30 ${
            isPlaying
              ? `${accent.bar} border-transparent text-black`
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
          }`}
        >
          {isPlaying ? "PAUSE" : "PLAY"}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <span
            className={`text-[10px] uppercase tracking-widest ${
              engagement.engaged ? `${accent.glowText} animate-pulse` : "text-zinc-500"
            }`}
          >
            {engagement.engaged ? `✋${engagement.hand?.[0] ?? ""}` : "Vol"}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={handleVolume}
            disabled={!ready}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-zinc-200 disabled:opacity-30"
            aria-label="Deck volume"
          />
          <span className="w-8 text-right font-mono text-xs text-zinc-400">{volume}</span>
        </div>
      </div>
    </section>
  );
}

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00.00";
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${min}:${sec.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}
