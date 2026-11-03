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
};

export function sanitizeProviderDetail(value: string): string | null {
  const text = value
    .replace(/AIza[0-9A-Za-z\-_]{8,}/g, "[redacted]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/(?:api[_-]?key|token|secret|authorization)=([^&\s]+)/gi, "[redacted]")
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
    this.detail = diagnostic?.detail ? sanitizeProviderDetail(diagnostic.detail) : null;
  }
}
