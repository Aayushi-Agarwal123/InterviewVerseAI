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

export function readCoachConfig(env: Env): CoachRuntime {
  const provider = clean(env.INTERVIEWVERSE_COACH_PROVIDER).toLowerCase();
  const apiKey = clean(env.INTERVIEWVERSE_COACH_API_KEY);
  const model = clean(env.INTERVIEWVERSE_COACH_MODEL) || DEFAULT_MODEL;
  const baseUrl = (clean(env.INTERVIEWVERSE_COACH_BASE_URL) || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (provider === "local") {
    return {
      mode: "local",
      provider: null,
      reason: "forced-local",
      apiKey: apiKey || null,
      model,
      baseUrl,
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
      baseUrl,
    };
  }

  if (selected !== "openai") {
    return {
      mode: "local",
      provider: null,
      reason: "unknown-provider",
      apiKey: null,
      model,
      baseUrl,
    };
  }

  return {
    mode: "ai",
    provider: "openai",
    reason: "ready",
    apiKey,
    model,
    baseUrl,
  };
}

export function publicCoachStatus(config: CoachRuntime): CoachPublicStatus {
  return {
    mode: config.mode,
    provider: config.provider,
    reason: config.reason,
  };
}
