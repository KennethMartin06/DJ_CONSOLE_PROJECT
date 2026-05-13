"use client";

import { useEffect, useState } from "react";
import { GestureMapper } from "@/lib/gesture/mapper";
import type { CrossfaderEngagement } from "@/lib/gesture/mapper";

export function useGestureCrossfader(): CrossfaderEngagement {
  const [eng, setEng] = useState<CrossfaderEngagement>(
    () => GestureMapper.instance().getState().crossfader,
  );

  useEffect(() => {
    return GestureMapper.instance().subscribe((state) => {
      setEng(state.crossfader);
    });
  }, []);

  return eng;
}
