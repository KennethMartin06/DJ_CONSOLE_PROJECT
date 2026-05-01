"use client";

import { useEffect, useRef, useState } from "react";
import { AudioEngine } from "@/lib/audio-engine";
import type { DeckId, DeckSnapshot } from "@/lib/audio-engine";

const POSITION_TICK_MS = 33;

export function useDeck(id: DeckId, ready: boolean) {
  const [snap, setSnap] = useState<DeckSnapshot | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    const deck = AudioEngine.instance().getDeck(id);
    const unsub = deck.subscribe((s) => setSnap(s));
    return () => unsub();
  }, [id, ready]);

  useEffect(() => {
    if (!ready || !snap?.isPlaying) {
      if (rafRef.current !== null) {
        clearInterval(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const deck = AudioEngine.instance().getDeck(id);
    const tick = () => setSnap(deck.snapshot());
    rafRef.current = window.setInterval(tick, POSITION_TICK_MS);
    return () => {
      if (rafRef.current !== null) {
        clearInterval(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [id, ready, snap?.isPlaying]);

  return snap;
}
