"use client";

import { useEffect, useState } from "react";
import { GestureMapper } from "@/lib/gesture/mapper";
import type { EqEngagement } from "@/lib/gesture/mapper";
import type { DeckId } from "@/lib/audio-engine";

export function useGestureEq(deckId: DeckId): EqEngagement {
  const [eng, setEng] = useState<EqEngagement>(() => {
    const s = GestureMapper.instance().getState();
    return deckId === "A" ? s.eqA : s.eqB;
  });

  useEffect(() => {
    return GestureMapper.instance().subscribe((state) => {
      setEng(deckId === "A" ? state.eqA : state.eqB);
    });
  }, [deckId]);

  return eng;
}
