export type CoachModeSnapshot = {
  ready: boolean;
  mode: "ai" | "local";
  reason: "ready" | "no-api-key" | "forced-local" | "unknown-provider";
  label: string;
  detail: string;
};

const PENDING: CoachModeSnapshot = {
  ready: false,
  mode: "local",
  reason: "no-api-key",
  label: "Local Coach",
  detail: "",
};

const COPY: Record<CoachModeSnapshot["reason"] | "ai", Pick<CoachModeSnapshot, "label" | "detail">> = {
  ai: {
    label: "AI Coach",
    detail: "Answers are sent to the model on the server. History stays in this browser.",
  },
  ready: {
    label: "AI Coach",
    detail: "Answers are sent to the model on the server. History stays in this browser.",
  },
  "no-api-key": {
    label: "Local Coach",
    detail: "No model key on the server. Scoring uses the rubric on this device.",
  },
  "forced-local": {
    label: "Local Coach",
    detail: "The server is set to the local rubric. History stays in this browser.",
  },
  "unknown-provider": {
    label: "Local Coach",
    detail: "The configured model provider is not available. Scoring uses the rubric.",
  },
};

let snapshot: CoachModeSnapshot = PENDING;
const listeners = new Set<() => void>();
let started = false;

function emit(next: CoachModeSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function load() {
  try {
    const response = await fetch("/api/coach", { cache: "no-store" });
    if (!response.ok) throw new Error("status");
    const body = (await response.json()) as {
      mode?: unknown;
      reason?: unknown;
    };
    const reason =
      body.reason === "ready" ||
      body.reason === "no-api-key" ||
      body.reason === "forced-local" ||
      body.reason === "unknown-provider"
        ? body.reason
        : "no-api-key";
    const mode = body.mode === "ai" ? "ai" : "local";
    const copy = mode === "ai" ? COPY.ai : COPY[reason];
    emit({ ready: true, mode, reason, label: copy.label, detail: copy.detail });
  } catch {
    const copy = COPY["no-api-key"];
    emit({ ready: true, mode: "local", reason: "no-api-key", label: copy.label, detail: copy.detail });
  }
}

export function subscribeCoachMode(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && !started) {
    started = true;
    queueMicrotask(() => {
      void load();
    });
  }
  return () => listeners.delete(listener);
}

export function getCoachSnapshot(): CoachModeSnapshot {
  return snapshot;
}

export function getServerCoachSnapshot(): CoachModeSnapshot {
  return PENDING;
}

export function knownLocalMode(): boolean {
  return snapshot.ready && snapshot.mode === "local";
}
