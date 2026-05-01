"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioEngine } from "@/lib/audio-engine";

export function useAudioEngine() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (AudioEngine.instance().isReady()) setReady(true);
  }, []);

  const start = useCallback(async () => {
    try {
      await AudioEngine.instance().ensure();
      setReady(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return { ready, error, start, engine: AudioEngine.instance() };
}
