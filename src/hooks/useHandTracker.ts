"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { HandTracker } from "@/lib/gesture/tracker";
import { EMPTY_SNAPSHOT } from "@/lib/gesture/types";
import type { TrackerSnapshot } from "@/lib/gesture/types";

export function useHandTracker(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [snapshot, setSnapshot] = useState<TrackerSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let rafId: number | null = null;
    const tracker = new HandTracker();
    trackerRef.current = tracker;
    setLoading(true);
    setError(null);

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
          if (video && video.readyState >= 2 && !video.paused) {
            const next = tracker.detect(video, performance.now());
            setSnapshot(next);
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
      trackerRef.current = null;
      setSnapshot(EMPTY_SNAPSHOT);
    };
  }, [enabled, videoRef]);

  return { snapshot, loading, error };
}
