export type CoachModeSnapshot = {
  ready: boolean;
  mode: "ai" | "local";
  provider: "gemini" | "openai" | null;
  reason: "ready" | "no-api-key" | "forced-local" | "unknown-provider" | "missing-model";
  label: string;
  detail: string;
};

const PENDING: CoachModeSnapshot = {
  ready: false,
  mode: "local",
  provider: null,
  reason: "no-api-key",
  label: "Local Coach",
  detail: "",
};

const COPY: Record<CoachModeSnapshot["reason"], Pick<CoachModeSnapshot, "label" | "detail">> = {
  ready: {
    label: "AI Coach",
    detail: "Answers are sent to the model on the server. History stays in this browser.",
  },
  "no-api-key": {
    label: "Local Coach",
    detail: "No model key on the server, or the value is still a placeholder. Scoring uses the rubric on this device.",
  },
  "forced-local": {
    label: "Local Coach",
    detail: "The server is set to the local rubric. History stays in this browser.",
  },
  "unknown-provider": {
    label: "Local Coach",
    detail: "The configured model provider is not available. Scoring uses the rubric.",
  },
  "missing-model": {
    label: "Local Coach",
    detail:
      "Set INTERVIEWVERSE_COACH_MODEL to a model ID from Google AI Studio, not a placeholder. Scoring uses the rubric on this device.",
  },
};

export function coachCopy(
  mode: CoachModeSnapshot["mode"],
  reason: CoachModeSnapshot["reason"],
  provider: CoachModeSnapshot["provider"],
): Pick<CoachModeSnapshot, "label" | "detail"> {
  if (mode === "ai" && provider === "gemini") {
    return {
      label: "Gemini AI Coach",
      detail: "Answers are sent to Google's Gemini API. History stays in this browser.",
    };
  }
  if (mode === "ai") return COPY.ready;
  return COPY[reason];
}

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
      provider?: unknown;
    };
    const reason =
      body.reason === "ready" ||
      body.reason === "no-api-key" ||
      body.reason === "forced-local" ||
      body.reason === "unknown-provider" ||
      body.reason === "missing-model"
        ? body.reason
        : "no-api-key";
    const mode = body.mode === "ai" ? "ai" : "local";
    const provider = body.provider === "gemini" || body.provider === "openai" ? body.provider : null;
    const copy = coachCopy(mode, reason, provider);
    emit({ ready: true, mode, provider, reason, label: copy.label, detail: copy.detail });
  } catch {
    const copy = COPY["no-api-key"];
    emit({
      ready: true,
      mode: "local",
      provider: null,
      reason: "no-api-key",
      label: copy.label,
      detail: copy.detail,
    });
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
