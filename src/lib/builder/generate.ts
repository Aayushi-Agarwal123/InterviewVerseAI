import type { CoachRuntime } from "@/lib/coach/config";
import { ModelCallError } from "@/lib/coach/errors";
import { completeGemini } from "@/lib/coach/gemini";
import type { ChatMessage } from "@/lib/coach/prompt";
import {
  ANALYSIS_TIMEOUT_MS,
  applyCodeGeneration,
  budgetSignal,
  GENERATION_BUDGET_MS,
} from "@/lib/builder/codegen";
import { assembleManifest, localAnalysis, type ProjectAnalysis } from "@/lib/builder/manifest";
import { STACK_LABELS, type BuildRequest, type ProjectManifest, type ProjectModule } from "@/lib/builder/types";

export const BUILDER_UNREADABLE_NOTICE =
  "The Gemini reply could not be read. This starter was built from the local template.";

export const CODE_UNUSABLE_NOTICE =
  "Gemini did not return usable source files. This starter was built from the local template.";

const GEMINI_NOTICES = {
  quota: "Gemini's free quota is exhausted. This starter was built from the local template.",
  "rate-limit": "Gemini rate-limited this request. This starter was built from the local template.",
  "invalid-key":
    "The Gemini API key was rejected. Create a key in Google AI Studio and set INTERVIEWVERSE_COACH_API_KEY to the value that starts with AIza. This starter was built from the local template.",
  "restricted-key":
    "This Gemini API key blocks server calls. In Google AI Studio, set application restrictions to None. This starter was built from the local template.",
  "api-disabled":
    "The Generative Language API is not enabled for this key. Create a Gemini API key in Google AI Studio. This starter was built from the local template.",
  "unsupported-model":
    "Gemini does not recognize INTERVIEWVERSE_COACH_MODEL. Use a model ID from Google AI Studio. This starter was built from the local template.",
  "malformed-request": "Gemini rejected the request body. This starter was built from the local template.",
} as const;

export type GenerateResult = {
  mode: "gemini" | "local";
  notice?: string;
  manifest: ProjectManifest;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? text;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function readList(value: unknown, min: number, max: number, length: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 4 && item.length <= length)
    .slice(0, max);
  if (items.length < min) return null;
  return items;
}

export function parseAnalysis(text: string): ProjectAnalysis | null {
  const parsed = extractJson(text);
  if (!isRecord(parsed)) return null;
  const objective = typeof parsed.objective === "string" ? parsed.objective.replace(/\s+/g, " ").trim() : "";
  if (objective.length < 12 || objective.length > 400) return null;
  const functionalRequirements = readList(parsed.functionalRequirements, 1, 8, 240);
  const nonFunctionalRequirements = readList(parsed.nonFunctionalRequirements, 1, 6, 240);
  if (!functionalRequirements || !nonFunctionalRequirements || !Array.isArray(parsed.modules)) return null;
  const modules: ProjectModule[] = [];
  for (const entry of parsed.modules) {
    if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.purpose !== "string") return null;
    const name = entry.name.trim();
    const purpose = entry.purpose.trim();
    if (name.length < 2 || name.length > 40 || purpose.length < 4 || purpose.length > 200) return null;
    modules.push({ name, purpose });
    if (modules.length === 8) break;
  }
  if (modules.length === 0) return null;
  return { objective, functionalRequirements, nonFunctionalRequirements, modules };
}

function builderMessages(request: BuildRequest): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You analyze a software brief and return JSON only.",
        "Do not write source code, file trees, secrets, or package manifests.",
        "Do not claim a feature is already implemented.",
        'JSON shape: {"objective":"","functionalRequirements":[""],"nonFunctionalRequirements":[""],"modules":[{"name":"","purpose":""}]}',
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Project name: ${request.name}`,
        `Selected stack: ${STACK_LABELS[request.stack]}`,
        `Brief: ${request.description}`,
        request.extras ? `Additional requirements: ${request.extras}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}

function noticeFor(error: unknown): string {
  if (error instanceof ModelCallError && error.provider === "gemini") {
    if (error.failure in GEMINI_NOTICES) return GEMINI_NOTICES[error.failure as keyof typeof GEMINI_NOTICES];
  }
  return "Gemini did not answer. This starter was built from the local template.";
}

export function geminiBuilderReady(config: CoachRuntime): boolean {
  return config.mode === "ai" && config.provider === "gemini" && Boolean(config.apiKey) && Boolean(config.model);
}

export async function generateProject(
  request: BuildRequest,
  config: CoachRuntime,
  fetchImpl?: typeof fetch,
): Promise<GenerateResult> {
  const local = localAnalysis(request);
  const fallback = (notice?: string): GenerateResult => ({
    mode: "local",
    notice,
    manifest: assembleManifest(request, local, "local"),
  });
  if (!geminiBuilderReady(config) || !config.apiKey) return fallback();
  const deadline = Date.now() + GENERATION_BUDGET_MS;
  try {
    const signal = budgetSignal(deadline, ANALYSIS_TIMEOUT_MS);
    if (!signal) return fallback("Gemini did not answer. This starter was built from the local template.");
    const text = await completeGemini(
      {
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        temperature: 0.2,
        messages: builderMessages(request),
        signal,
      },
      fetchImpl,
    );
    const analysis = parseAnalysis(text);
    if (!analysis) return fallback(BUILDER_UNREADABLE_NOTICE);
    const written = await applyCodeGeneration(request, analysis, config, fetchImpl, deadline);
    if (!written) return fallback(CODE_UNUSABLE_NOTICE);
    return { mode: "gemini", notice: written.notice, manifest: written.manifest };
  } catch (error) {
    return fallback(noticeFor(error));
  }
}
