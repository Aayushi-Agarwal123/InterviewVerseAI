import type { CoachVerdict, Question, ReportCoach } from "@/lib/domain";
import { weightedOverall } from "@/lib/engine/score";
import { clampScore } from "@/lib/text";
import type { CoachRuntime } from "@/lib/coach/config";
import { ModelCallError, sanitizeProviderDetail } from "@/lib/coach/errors";
import { localVerdict } from "@/lib/coach/local";
import { chooseFollowUp } from "@/lib/coach/policy";
import { debriefMessages, evaluationMessages, type ChatMessage } from "@/lib/coach/prompt";
import { getModelProvider } from "@/lib/coach/providers";
import {
  extractJson,
  readCoachVerdict,
  readDimensions,
  readReportCoach,
  readStringList,
  type DebriefInput,
  type EvaluateInput,
} from "@/lib/coach/schema";

export const LOCAL_FALLBACK_NOTICE =
  "The AI coach did not answer. This answer was scored by the local coach, and your text was kept.";

export const UNREADABLE_NOTICE =
  "The model reply could not be read. This answer was scored by the local coach, and your text was kept.";

export const DEBRIEF_FALLBACK_NOTICE =
  "The model did not write a round summary. The scores and answers are saved.";

const NUDGE_NOTE = "A nudge was used here, so depth is capped a little.";

const GEMINI_NOTICES = {
  answer: {
    quota: "Gemini's free quota is exhausted. This answer was scored by the local coach, and your text was kept.",
    "rate-limit": "Gemini rate-limited this request. This answer was scored by the local coach, and your text was kept.",
    "invalid-key":
      "The Gemini API key was rejected. Create a key in Google AI Studio and set INTERVIEWVERSE_COACH_API_KEY to the value that starts with AIza. This answer was scored by the local coach, and your text was kept.",
    "restricted-key":
      "This Gemini API key blocks server calls. In Google AI Studio, set application restrictions to None. This answer was scored by the local coach, and your text was kept.",
    "api-disabled":
      "The Generative Language API is not enabled for this key. Create a Gemini API key in Google AI Studio. This answer was scored by the local coach, and your text was kept.",
    "unsupported-model":
      "Gemini does not recognize INTERVIEWVERSE_COACH_MODEL. Use a model ID from Google AI Studio. This answer was scored by the local coach, and your text was kept.",
    "malformed-request":
      "Gemini rejected the request body. This answer was scored by the local coach, and your text was kept.",
  },
  debrief: {
    quota: "Gemini's free quota is exhausted. The scores and answers are saved.",
    "rate-limit": "Gemini rate-limited this request. The scores and answers are saved.",
    "invalid-key":
      "The Gemini API key was rejected. Create a key in Google AI Studio and set INTERVIEWVERSE_COACH_API_KEY to the value that starts with AIza. The scores and answers are saved.",
    "restricted-key":
      "This Gemini API key blocks server calls. In Google AI Studio, set application restrictions to None. The scores and answers are saved.",
    "api-disabled":
      "The Generative Language API is not enabled for this key. Create a Gemini API key in Google AI Studio. The scores and answers are saved.",
    "unsupported-model":
      "Gemini does not recognize INTERVIEWVERSE_COACH_MODEL. Use a model ID from Google AI Studio. The scores and answers are saved.",
    "malformed-request": "Gemini rejected the request body. The scores and answers are saved.",
  },
} as const;

function noticeForModelError(error: unknown, kind: "answer" | "debrief"): string {
  if (error instanceof ModelCallError && error.provider === "gemini" && error.failure in GEMINI_NOTICES[kind]) {
    return GEMINI_NOTICES[kind][error.failure as keyof (typeof GEMINI_NOTICES)["answer"]];
  }
  return kind === "answer" ? LOCAL_FALLBACK_NOTICE : DEBRIEF_FALLBACK_NOTICE;
}

function logProviderFallback(error: unknown) {
  if (error instanceof ModelCallError) {
    console.error(
      JSON.stringify({
        scope: "coach",
        provider: error.provider,
        failure: error.failure,
        httpStatus: error.httpStatus,
        detail: error.detail,
      }),
    );
    return;
  }
  const name = error instanceof Error ? error.name : "Error";
  const timedOut = name === "TimeoutError" || name === "AbortError";
  console.error(
    JSON.stringify({
      scope: "coach",
      provider: null,
      failure: "unexpected",
      httpStatus: null,
      detail: timedOut ? "timeout" : sanitizeProviderDetail(error instanceof Error ? `${name}: ${error.message}` : name),
    }),
  );
}

export type EvaluationResponse = {
  mode: "ai" | "local";
  fellBack: boolean;
  notice?: string;
  verdict: CoachVerdict;
};

export type DebriefResponse = {
  mode: "ai" | "local";
  fellBack: boolean;
  notice?: string;
  coach?: ReportCoach;
};

type Complete = (messages: ChatMessage[], temperature: number) => Promise<string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function materialize(question: Question, input: EvaluateInput, raw: Record<string, unknown>): CoachVerdict | null {
  const dimensions = readDimensions(raw.dimensions);
  const strengths = readStringList(raw.strengths, 1, 4, 280);
  const improvements = readStringList(raw.improvements, 1, 4, 280);
  const tips = readStringList(raw.tips, 1, 4, 280);
  const sampleAnswer = typeof raw.sampleAnswer === "string" ? raw.sampleAnswer.trim() : "";
  if (
    !dimensions ||
    !strengths ||
    !improvements ||
    !tips ||
    sampleAnswer.length < 40 ||
    sampleAnswer.length > 1200
  ) {
    return null;
  }

  const modelDepth = dimensions.depth;
  if (input.hintUsed) dimensions.depth = clampScore(dimensions.depth - 12);
  const local = localVerdict(question, input);
  const notes = improvements.slice(0, 3);
  if (input.hintUsed && !notes.includes(NUDGE_NOTE)) notes.push(NUDGE_NOTE);
  const modelFollowUp = typeof raw.followUp === "string" ? raw.followUp : undefined;
  const verdict: CoachVerdict = {
    source: "ai",
    score: {
      dimensions,
      overall: weightedOverall(dimensions),
      hitSignalIds: local.score.hitSignalIds,
      missedSignalIds: local.score.missedSignalIds,
      notes,
    },
    followUp: chooseFollowUp({
      phase: input.phase,
      difficulty: input.difficulty,
      question,
      localScore: local.score,
      modelFollowUp,
      modelDepth,
      asked: input.asked,
    }),
    strengths,
    improvements,
    tips,
    sampleAnswer,
  };
  return readCoachVerdict(verdict);
}

async function completeWithConfig(
  config: CoachRuntime,
  messages: ChatMessage[],
  temperature: number,
  override?: Complete,
): Promise<string> {
  if (override) return override(messages, temperature);
  const provider = getModelProvider(config.provider);
  if (!provider || !config.apiKey) throw new Error("Coach provider is not configured.");
  return provider.complete({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    temperature,
    messages,
    signal: AbortSignal.timeout(25_000),
  });
}

export async function evaluateAnswer(
  question: Question,
  input: EvaluateInput,
  config: CoachRuntime,
  complete?: Complete,
): Promise<EvaluationResponse> {
  const local = localVerdict(question, input);
  const provider = getModelProvider(config.provider);
  if (config.mode !== "ai" || !config.apiKey || (!provider && !complete)) {
    return { mode: "local", fellBack: false, verdict: local };
  }

  try {
    const text = await completeWithConfig(
      config,
      evaluationMessages(question, input),
      0.3,
      complete,
    );
    const parsed = extractJson(text);
    if (!isRecord(parsed)) {
      return { mode: "local", fellBack: true, notice: UNREADABLE_NOTICE, verdict: local };
    }
    const verdict = materialize(question, input, parsed);
    if (!verdict) {
      return { mode: "local", fellBack: true, notice: UNREADABLE_NOTICE, verdict: local };
    }
    return { mode: "ai", fellBack: false, verdict };
  } catch (error) {
    logProviderFallback(error);
    return { mode: "local", fellBack: true, notice: noticeForModelError(error, "answer"), verdict: local };
  }
}

function materializeDebrief(raw: Record<string, unknown>): ReportCoach | null {
  const narrative = typeof raw.narrative === "string" ? raw.narrative.trim() : "";
  const recommendations = readStringList(raw.recommendations, 1, 4, 280);
  if (!recommendations || narrative.length < 40 || narrative.length > 800) return null;
  return readReportCoach({ source: "ai", narrative, recommendations });
}

export async function writeDebrief(
  input: DebriefInput,
  config: CoachRuntime,
  complete?: Complete,
): Promise<DebriefResponse> {
  const provider = getModelProvider(config.provider);
  if (config.mode !== "ai" || !config.apiKey || (!provider && !complete)) {
    return { mode: "local", fellBack: false };
  }
  try {
    const text = await completeWithConfig(config, debriefMessages(input), 0.4, complete);
    const parsed = extractJson(text);
    if (!isRecord(parsed)) {
      return { mode: "local", fellBack: true, notice: DEBRIEF_FALLBACK_NOTICE };
    }
    const coach = materializeDebrief(parsed);
    if (!coach) return { mode: "local", fellBack: true, notice: DEBRIEF_FALLBACK_NOTICE };
    return { mode: "ai", fellBack: false, coach };
  } catch (error) {
    logProviderFallback(error);
    return { mode: "local", fellBack: true, notice: noticeForModelError(error, "debrief") };
  }
}
