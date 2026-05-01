"use client";

import { useAudioEngine } from "@/hooks/useAudioEngine";
import { DeckPanel } from "@/components/deck/DeckPanel";
import { MixerPanel } from "@/components/mixer/MixerPanel";

export function Console() {
  const { ready, error, start, engine } = useAudioEngine();

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-900 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <h1 className="font-mono text-sm tracking-[0.3em] text-zinc-300">DJ · CONSOLE</h1>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-zinc-500">
          <span>SR: {ready ? engine.sampleRate().toLocaleString() : "—"} Hz</span>
          <span>Lat: {ready ? engine.outputLatencyMs().toFixed(1) : "—"} ms</span>
          <span className={ready ? "text-emerald-400" : "text-zinc-600"}>
            {ready ? "ENGINE READY" : "ENGINE IDLE"}
          </span>
        </div>
      </header>

      {!ready && (
        <div className="flex flex-1 items-center justify-center px-6">
          <button
            type="button"
            onClick={() => void start()}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-8 py-4 font-mono text-sm tracking-widest text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            ▶  START AUDIO ENGINE
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-900 bg-red-950/40 px-6 py-2 font-mono text-xs text-red-300">
          {error}
        </div>
      )}

      {ready && (
        <main className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_280px_1fr]">
          <DeckPanel id="A" ready={ready} onLoadStart={start} />
          <MixerPanel ready={ready} />
          <DeckPanel id="B" ready={ready} onLoadStart={start} />
        </main>
      )}

      <footer className="border-t border-zinc-900 px-6 py-2 text-center font-mono text-[10px] tracking-widest text-zinc-600">
        PHASE A · TRANSPORT ONLINE · LOAD A LOCAL AUDIO FILE TO BEGIN
      </footer>
    </div>
  );
}
