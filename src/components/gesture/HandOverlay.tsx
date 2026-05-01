"use client";

import { useEffect, useRef } from "react";
import { HAND_CONNECTIONS, FINGERTIP_INDICES } from "@/lib/gesture/skeleton";
import type { Handedness, TrackerSnapshot } from "@/lib/gesture/types";

interface HandOverlayProps {
  snapshot: TrackerSnapshot;
}

const HAND_COLORS: Record<Handedness, { line: string; dot: string; tip: string }> = {
  Left: { line: "#22d3ee", dot: "#67e8f9", tip: "#ffffff" },
  Right: { line: "#fb923c", dot: "#fdba74", tip: "#ffffff" },
};

export function HandOverlay({ snapshot }: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.max(1, Math.floor(rect.width * dpr));
    const targetH = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const hand of snapshot.hands) {
      const color = HAND_COLORS[hand.handedness];

      ctx.strokeStyle = color.line;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (const [a, b] of HAND_CONNECTIONS) {
        const p0 = hand.landmarks[a];
        const p1 = hand.landmarks[b];
        if (!p0 || !p1) continue;
        ctx.beginPath();
        ctx.moveTo(p0.x * rect.width, p0.y * rect.height);
        ctx.lineTo(p1.x * rect.width, p1.y * rect.height);
        ctx.stroke();
      }

      ctx.fillStyle = color.dot;
      for (const lm of hand.landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * rect.width, lm.y * rect.height, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = color.tip;
      for (const idx of FINGERTIP_INDICES) {
        const lm = hand.landmarks[idx];
        if (!lm) continue;
        ctx.beginPath();
        ctx.arc(lm.x * rect.width, lm.y * rect.height, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [snapshot]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ transform: "scaleX(-1)" }}
      aria-hidden
    />
  );
}
