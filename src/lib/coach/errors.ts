export type ModelFailure = "rate-limit" | "quota" | "invalid-key" | "unavailable";

export class ModelCallError extends Error {
  readonly failure: ModelFailure;
  readonly provider: "gemini" | "openai";

  constructor(failure: ModelFailure, provider: "gemini" | "openai") {
    super(failure);
    this.name = "ModelCallError";
    this.failure = failure;
    this.provider = provider;
  }
}
