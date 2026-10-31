"use client";

import { useSyncExternalStore } from "react";
import type { Session, SessionConfig } from "@/lib/domain";
import { buildSampleSession } from "@/lib/engine/sample";
import { createSession } from "@/lib/engine/session";
import { loadStore, saveStore } from "@/lib/storage";

const memory = new Map<string, Session>();

export function peekSession(id: string): Session | undefined {
  return memory.get(id);
}

function rememberAll(sessions: Session[]) {
  memory.clear();
  for (const session of sessions) memory.set(session.id, session);
}

type Status = "loading" | "ready" | "error";

type Snapshot = {
  status: Status;
  sessions: Session[];
  message?: string;
};

const SERVER_SNAPSHOT: Snapshot = { status: "loading", sessions: [] };

let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function readBrowser(): Snapshot {
  const loaded = loadStore();
  if (!loaded.ok) {
    return { status: "error", sessions: [], message: loaded.message };
  }
  rememberAll(loaded.sessions);
  return { status: "ready", sessions: loaded.sessions };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && snapshot.status === "loading") {
    queueMicrotask(() => {
      if (snapshot.status !== "loading") return;
      emit(readBrowser());
    });
  }
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function commit(next: Session[]): boolean {
  const saved = saveStore(next);
  if (!saved.ok) {
    emit({
      status: "error",
      sessions: snapshot.sessions,
      message: saved.message,
    });
    return false;
  }
  rememberAll(saved.sessions);
  emit({ status: "ready", sessions: saved.sessions });
  return true;
}

export function createRound(config: SessionConfig): Session | null {
  if (snapshot.status !== "ready") return null;
  const session = createSession(config, { now: new Date().toISOString() });
  memory.set(session.id, session);
  return commit([session, ...snapshot.sessions]) ? session : null;
}

export function replaceSession(session: Session) {
  memory.set(session.id, session);
  const exists = snapshot.sessions.some((item) => item.id === session.id);
  const next = exists
    ? snapshot.sessions.map((item) => (item.id === session.id ? session : item))
    : [session, ...snapshot.sessions];
  commit(next);
}

export function removeSession(id: string) {
  memory.delete(id);
  commit(snapshot.sessions.filter((item) => item.id !== id));
}

export function clearSessions() {
  memory.clear();
  commit([]);
}

export function addSampleRound(): Session | null {
  const sample = buildSampleSession(new Date().toISOString());
  memory.set(sample.id, sample);
  const rest = snapshot.sessions.filter((item) => item.id !== sample.id);
  return commit([sample, ...rest]) ? sample : null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return children;
}

export function useSessions() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    status: current.status,
    sessions: current.sessions,
    message: current.message,
    create: createRound,
    replace: replaceSession,
    remove: removeSession,
    clear: clearSessions,
    addSample: addSampleRound,
  };
}
