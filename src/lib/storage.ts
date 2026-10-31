import type { Session } from "@/lib/domain";

export const STORAGE_KEY = "interviewverse.v1";
const MAX_COMPLETED = 40;

type Envelope = {
  version: 1;
  sessions: Session[];
};

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Session;
  return (
    typeof session.id === "string" &&
    typeof session.createdAt === "string" &&
    session.config !== undefined &&
    Array.isArray(session.questionIds) &&
    Array.isArray(session.turns) &&
    (session.status === "active" || session.status === "completed")
  );
}

export function trimSessions(sessions: Session[]): Session[] {
  const active = sessions.filter((session) => session.status === "active");
  const completed = sessions
    .filter((session) => session.status === "completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_COMPLETED);
  return [...active, ...completed].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function loadStore():
  | { ok: true; sessions: Session[] }
  | { ok: false; message: string } {
  if (typeof window === "undefined") {
    return { ok: true, sessions: [] };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ok: true, sessions: [] };
  try {
    const parsed = JSON.parse(raw) as Envelope;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sessions)) {
      return {
        ok: false,
        message:
          "Saved rounds on this browser are from an older layout and could not be read.",
      };
    }
    if (!parsed.sessions.every(isSession)) {
      return {
        ok: false,
        message: "Saved rounds on this browser are incomplete and could not be read.",
      };
    }
    return { ok: true, sessions: trimSessions(parsed.sessions) };
  } catch {
    return {
      ok: false,
      message: "Saved rounds on this browser could not be read.",
    };
  }
}

export function saveStore(
  sessions: Session[],
): { ok: true; sessions: Session[] } | { ok: false; message: string } {
  const next = trimSessions(sessions);
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, sessions: next } satisfies Envelope),
    );
    return { ok: true, sessions: next };
  } catch {
    return {
      ok: false,
      message: "This browser refused to store the round. The local history may be full.",
    };
  }
}
