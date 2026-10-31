export type BuilderSnapshot = {
  ready: boolean;
  mode: "gemini" | "local";
  reason: "ready" | "no-api-key" | "not-gemini" | "missing-model" | "forced-local";
  label: string;
  detail: string;
};

const COPY: Record<BuilderSnapshot["reason"], Pick<BuilderSnapshot, "label" | "detail">> = {
  ready: {
    label: "Gemini Project Builder",
    detail: "The brief is sent to Google's Gemini API for a requirements summary. The files are still a local starter template. The key stays on the server.",
  },
  "no-api-key": {
    label: "Local Template Builder",
    detail: "No Gemini key on the server. Starters come from local templates and are not AI-generated.",
  },
  "not-gemini": {
    label: "Local Template Builder",
    detail: "Project scaffolding uses Gemini. This server is not set to that provider, so starters come from local templates.",
  },
  "missing-model": {
    label: "Local Template Builder",
    detail: "Set INTERVIEWVERSE_COACH_MODEL to a Gemini model ID. Until then, starters come from local templates.",
  },
  "forced-local": {
    label: "Local Template Builder",
    detail: "The server is set to local templates. These starters are not AI-generated.",
  },
};

const PENDING: BuilderSnapshot = {
  ready: false,
  mode: "local",
  reason: "no-api-key",
  label: "Local Template Builder",
  detail: "",
};

let snapshot: BuilderSnapshot = PENDING;
const listeners = new Set<() => void>();
let started = false;

function emit(next: BuilderSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function load() {
  try {
    const response = await fetch("/api/builder", { cache: "no-store" });
    if (!response.ok) throw new Error("status");
    const body = (await response.json()) as { mode?: unknown; reason?: unknown };
    const reason =
      body.reason === "ready" ||
      body.reason === "no-api-key" ||
      body.reason === "not-gemini" ||
      body.reason === "missing-model" ||
      body.reason === "forced-local"
        ? body.reason
        : "no-api-key";
    const mode = body.mode === "gemini" ? "gemini" : "local";
    const copy = COPY[reason];
    emit({ ready: true, mode, reason, label: copy.label, detail: copy.detail });
  } catch {
    const copy = COPY["no-api-key"];
    emit({ ready: true, mode: "local", reason: "no-api-key", label: copy.label, detail: copy.detail });
  }
}

export function subscribeBuilderMode(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && !started) {
    started = true;
    queueMicrotask(() => {
      void load();
    });
  }
  return () => listeners.delete(listener);
}

export function getBuilderSnapshot(): BuilderSnapshot {
  return snapshot;
}

export function getServerBuilderSnapshot(): BuilderSnapshot {
  return PENDING;
}
