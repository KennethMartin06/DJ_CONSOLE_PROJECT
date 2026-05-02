"use client";

import { useEffect, useState } from "react";
import { GestureMapper } from "@/lib/gesture/mapper";
import type { DeckEngagement } from "@/lib/gesture/mapper";
import type { DeckId } from "@/lib/audio-engine";

export function useGestureEngagement(deckId: DeckId): DeckEngagement {
  const [eng, setEng] = useState<DeckEngagement>(
    () => GestureMapper.instance().getState()[deckId],
  );

  useEffect(() => {
    return GestureMapper.instance().subscribe((state) => {
      setEng(state[deckId]);
    });
  }, [deckId]);

  return eng;
}
