"use client";

import { useSyncExternalStore } from "react";
import {
  getCoachSnapshot,
  getServerCoachSnapshot,
  subscribeCoachMode,
} from "@/lib/coach/status";

export function useCoachMode() {
  return useSyncExternalStore(subscribeCoachMode, getCoachSnapshot, getServerCoachSnapshot);
}

export function CoachMark({ compact = false }: { compact?: boolean }) {
  const coach = useCoachMode();
  if (!coach.ready) return null;
  if (compact) {
    return (
      <p className="text-[10px] font-medium tracking-[0.16em] text-copper uppercase">
        {coach.label}
      </p>
    );
  }
  return (
    <div>
      <p className="text-[10px] font-medium tracking-[0.16em] text-copper uppercase">
        {coach.label}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{coach.detail}</p>
    </div>
  );
}
