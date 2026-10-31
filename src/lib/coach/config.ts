export type CoachReason = "ready" | "no-api-key" | "forced-local" | "unknown-provider" | "missing-model";

export type CoachProviderId = "openai" | "gemini";

export type CoachPublicStatus = {
  mode: "ai" | "local";
  provider: string | null;
  reason: CoachReason;
};

export type CoachRuntime = CoachPublicStatus & {
  apiKey: string | null;
  model: string;
  baseUrl: string;
};

type Env = Record<string, string | undefined>;

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const PROVIDER_DEFAULTS: Record<CoachProviderId, { model: string; baseUrl: string }> = {
  openai: { model: OPENAI_MODEL, baseUrl: OPENAI_BASE_URL },
  gemini: { model: "", baseUrl: GEMINI_BASE_URL },
};

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function readApiKey(value: string | undefined): string {
  const key = clean(value);
  if (!key || /[\r\n]/.test(key)) return "";
  return key;
}

function readBaseUrl(value: string | undefined, fallback: string): { url: string; ok: boolean } {
  const raw = clean(value) || fallback;
  try {
    const url = new URL(raw);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return { url: fallback, ok: false };
    }
    return { url: url.toString().replace(/\/+$/, ""), ok: true };
  } catch {
    return { url: fallback, ok: false };
  }
}

function isPlaceholder(value: string): boolean {
  return /your[_-]|placeholder|changeme|example[_-]?key|paste|insert[_-]|replace[_-]?me/i.test(value);
}

function readModelId(value: string): string | null {
  if (isPlaceholder(value) || !/^[A-Za-z0-9._-]{1,80}$/.test(value)) return null;
  return value;
}

function localRuntime(
  reason: Exclude<CoachReason, "ready">,
  model: string,
  baseUrl: string,
  apiKey: string | null = null,
): CoachRuntime {
  return {
    mode: "local",
    provider: null,
    reason,
    apiKey,
    model,
    baseUrl,
  };
}

export function readCoachConfig(env: Env): CoachRuntime {
  const provider = clean(env.INTERVIEWVERSE_COACH_PROVIDER).toLowerCase();
  const apiKey = readApiKey(env.INTERVIEWVERSE_COACH_API_KEY);
  const usableKey = isPlaceholder(apiKey) ? "" : apiKey;
  const selected: CoachProviderId | "" =
    provider === "gemini" || provider === "openai" ? provider : provider ? "" : apiKey ? "openai" : "";
  const defaults = PROVIDER_DEFAULTS[selected || "openai"];
  const base = readBaseUrl(env.INTERVIEWVERSE_COACH_BASE_URL, defaults.baseUrl);
  const modelText = clean(env.INTERVIEWVERSE_COACH_MODEL) || defaults.model;
  const model = readModelId(modelText);

  if (provider === "local") {
    return localRuntime("forced-local", model ?? defaults.model, base.url, usableKey || null);
  }

  if (provider === "gemini" && isPlaceholder(modelText)) {
    return localRuntime("missing-model", "", base.url);
  }

  if (!usableKey || !selected) {
    return localRuntime(selected ? "no-api-key" : provider ? "unknown-provider" : "no-api-key", model ?? "", base.url);
  }

  if (!base.ok) return localRuntime("unknown-provider", model ?? "", defaults.baseUrl);
  if (!model) return localRuntime("missing-model", "", base.url);

  return {
    mode: "ai",
    provider: selected,
    reason: "ready",
    apiKey: usableKey,
    model,
    baseUrl: base.url,
  };
}

export function publicCoachStatus(config: CoachRuntime): CoachPublicStatus {
  return {
    mode: config.mode,
    provider: config.provider,
    reason: config.reason,
  };
}
