import { redactSensitiveText } from "@/lib/security/redact";

export type ModelFailure =
  | "rate-limit"
  | "quota"
  | "invalid-key"
  | "restricted-key"
  | "api-disabled"
  | "unsupported-model"
  | "malformed-request"
  | "unavailable";

export type ModelDiagnostic = {
  httpStatus?: number | null;
  detail?: string | null;
  apiKey?: string | null;
};

export function sanitizeProviderDetail(value: string, apiKey?: string | null): string | null {
  const text = redactSensitiveText(value, apiKey)
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return text || null;
}

export class ModelCallError extends Error {
  readonly failure: ModelFailure;
  readonly provider: "gemini" | "openai";
  readonly httpStatus: number | null;
  readonly detail: string | null;

  constructor(failure: ModelFailure, provider: "gemini" | "openai", diagnostic?: ModelDiagnostic) {
    super(failure);
    this.name = "ModelCallError";
    this.failure = failure;
    this.provider = provider;
    this.httpStatus = diagnostic?.httpStatus ?? null;
    this.detail = diagnostic?.detail ? sanitizeProviderDetail(diagnostic.detail, diagnostic.apiKey) : null;
  }
}
