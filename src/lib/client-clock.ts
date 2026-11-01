"use client";

import { useSyncExternalStore } from "react";

/** Stable during prerender. The client reads the clock once after hydration. */
const SERVER_CLOCK = "1970-01-01T00:00:00.000Z";

let clientClock = SERVER_CLOCK;
let read = false;
const listeners = new Set<() => void>();

function readClient(): string {
  if (read || typeof window === "undefined") return clientClock;
  read = true;
  clientClock = new Date().toISOString();
  return clientClock;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string {
  return readClient();
}

function getServerSnapshot(): string {
  return SERVER_CLOCK;
}

export function useClientNow(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
