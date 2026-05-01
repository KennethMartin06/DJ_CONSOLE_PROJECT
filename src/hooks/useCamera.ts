"use client";

import { useEffect, useRef, useState } from "react";

interface CameraOptions {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
}

export function useCamera(enabled: boolean, options: CameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [resolution, setResolution] = useState<{ w: number; h: number } | null>(null);

  const { width = 1280, height = 720, facingMode = "user" } = options;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera API unavailable — requires https:// and a modern browser");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width, height, facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        if (settings?.width && settings?.height) {
          setResolution({ w: settings.width, h: settings.height });
        }
        setReady(true);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? humanizeError(e) : String(e);
        setError(msg);
        setReady(false);
      }
    }

    function stop() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setReady(false);
      setResolution(null);
    }

    if (enabled) {
      void start();
    } else {
      stop();
      setError(null);
    }

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, width, height, facingMode]);

  return { videoRef, error, ready, resolution };
}

function humanizeError(e: Error): string {
  switch (e.name) {
    case "NotAllowedError":
      return "Camera permission denied — enable it in your browser settings";
    case "NotFoundError":
      return "No camera detected on this device";
    case "NotReadableError":
      return "Camera is in use by another application";
    case "OverconstrainedError":
      return "Requested camera settings are not supported";
    default:
      return e.message || e.name;
  }
}
