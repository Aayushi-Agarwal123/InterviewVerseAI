export type CoachReason = "ready" | "no-api-key" | "forced-local" | "unknown-provider";

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

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function readApiKey(value: string | undefined): string {
  const key = clean(value);
  if (!key || /[\r\n]/.test(key)) return "";
  return key;
}

function readBaseUrl(value: string | undefined): { url: string; ok: boolean } {
  const raw = clean(value) || DEFAULT_BASE_URL;
  try {
    const url = new URL(raw);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return { url: DEFAULT_BASE_URL, ok: false };
    }
    return { url: url.toString().replace(/\/+$/, ""), ok: true };
  } catch {
    return { url: DEFAULT_BASE_URL, ok: false };
  }
}

export function readCoachConfig(env: Env): CoachRuntime {
  const provider = clean(env.INTERVIEWVERSE_COACH_PROVIDER).toLowerCase();
  const apiKey = readApiKey(env.INTERVIEWVERSE_COACH_API_KEY);
  const model = clean(env.INTERVIEWVERSE_COACH_MODEL) || DEFAULT_MODEL;
  const base = readBaseUrl(env.INTERVIEWVERSE_COACH_BASE_URL);

  if (provider === "local") {
    return {
      mode: "local",
      provider: null,
      reason: "forced-local",
      apiKey: apiKey || null,
      model,
      baseUrl: base.url,
    };
  }

  const selected = provider || (apiKey ? "openai" : "");
  if (!apiKey || !selected) {
    return {
      mode: "local",
      provider: null,
      reason: "no-api-key",
      apiKey: null,
      model,
      baseUrl: base.url,
    };
  }

  if (selected !== "openai" || !base.ok) {
    return {
      mode: "local",
      provider: null,
      reason: "unknown-provider",
      apiKey: null,
      model,
      baseUrl: base.url,
    };
  }

  return {
    mode: "ai",
    provider: "openai",
    reason: "ready",
    apiKey,
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
