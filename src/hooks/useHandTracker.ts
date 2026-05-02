"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { HandTracker } from "@/lib/gesture/tracker";
import { EMPTY_SNAPSHOT } from "@/lib/gesture/types";
import type { TrackerSnapshot } from "@/lib/gesture/types";

const FRAME_INTERVAL_MS = 33;

export function useHandTracker(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [snapshot, setSnapshot] = useState<TrackerSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let rafId: number | null = null;
    let lastSubmit = 0;
    setLoading(true);
    setError(null);

    const tracker = new HandTracker();
    tracker.onSnapshot((s) => {
      if (!cancelled) setSnapshot(s);
    });
    tracker.onError((msg) => {
      if (!cancelled) setError(msg);
    });

    tracker
      .load()
      .then(() => {
        if (cancelled) {
          tracker.dispose();
          return;
        }
        setLoading(false);

        const loop = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const now = performance.now();
          if (
            video &&
            video.readyState >= 2 &&
            !video.paused &&
            now - lastSubmit >= FRAME_INTERVAL_MS
          ) {
            lastSubmit = now;
            void tracker.submit(video, now);
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      tracker.dispose();
      setSnapshot(EMPTY_SNAPSHOT);
    };
  }, [enabled, videoRef]);

  return { snapshot, loading, error };
}
