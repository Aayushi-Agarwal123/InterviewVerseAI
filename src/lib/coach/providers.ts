import { completeGemini } from "@/lib/coach/gemini";
import { completeOpenAi, type ModelRequest } from "@/lib/coach/openai";

export type ModelProvider = {
  id: string;
  complete(request: ModelRequest): Promise<string>;
};

// Register another provider here. The route selects one by INTERVIEWVERSE_COACH_PROVIDER.
export const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  openai: { id: "openai", complete: completeOpenAi },
  gemini: { id: "gemini", complete: (request) => completeGemini(request) },
};

export function getModelProvider(id: string | null): ModelProvider | null {
  if (!id) return null;
  return MODEL_PROVIDERS[id] ?? null;
}
