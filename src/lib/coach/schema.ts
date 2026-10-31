import { TOPICS } from "@/lib/catalog";
import type {
  AnswerScore,
  CoachVerdict,
  Difficulty,
  Dimension,
  ReportCoach,
  RoleTarget,
  Topic,
} from "@/lib/domain";
import { DIMENSIONS } from "@/lib/domain";
import { clampScore } from "@/lib/text";

const DIFFICULTIES = new Set<Difficulty>(["warmup", "standard", "pressure"]);
const ROLES = new Set<RoleTarget>([
  "new-grad",
  "frontend",
  "backend",
  "fullstack",
  "senior",
]);
const TOPIC_IDS = new Set<Topic>(TOPICS.map((topic) => topic.id));

export type EvaluateInput = {
  questionId: string;
  phase: "answering" | "followup";
  difficulty: Difficulty;
  role: RoleTarget;
  focus: string;
  hintUsed: boolean;
  answer: string;
  priorAnswer?: string;
  followUpPrompt?: string;
  asked: string[];
};

export type DebriefTurnInput = {
  prompt: string;
  answer: string;
  followUpPrompt?: string;
  followUpAnswer?: string;
  overall: number;
  strengths: string[];
  improvements: string[];
};

export type DebriefInput = {
  track: "technical" | "hr";
  topic: Topic;
  difficulty: Difficulty;
  role: RoleTarget;
  focus: string;
  turns: DebriefTurnInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max) return null;
  return text;
}

export function readStringList(
  value: unknown,
  min: number,
  maxItems: number,
  maxLength: number,
): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= maxLength)
    .slice(0, maxItems);
  if (items.length < min) return null;
  return items;
}

function readScoreValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number)) return null;
  return clampScore(number);
}

export function isAnswerScore(value: unknown): value is AnswerScore {
  if (!isRecord(value)) return false;
  if (!isRecord(value.dimensions)) return false;
  for (const dimension of DIMENSIONS) {
    if (readScoreValue(value.dimensions[dimension]) === null) return false;
    if (value.dimensions[dimension] !== readScoreValue(value.dimensions[dimension])) return false;
  }
  if (typeof value.overall !== "number" || !Number.isFinite(value.overall)) return false;
  if (!Array.isArray(value.hitSignalIds) || !value.hitSignalIds.every((id) => typeof id === "string")) {
    return false;
  }
  if (
    !Array.isArray(value.missedSignalIds) ||
    !value.missedSignalIds.every((id) => typeof id === "string")
  ) {
    return false;
  }
  if (!Array.isArray(value.notes) || !value.notes.every((note) => typeof note === "string")) {
    return false;
  }
  return true;
}

export function isCoachVerdict(value: unknown): value is CoachVerdict {
  if (!isRecord(value)) return false;
  if (value.source !== "ai" && value.source !== "local") return false;
  if (!isAnswerScore(value.score)) return false;
  if (value.followUp !== undefined && typeof value.followUp !== "string") return false;
  const minimum = value.source === "ai" ? 1 : 0;
  if (!readStringList(value.strengths, minimum, 4, 280)) return false;
  if (!readStringList(value.improvements, minimum, 4, 280)) return false;
  if (!readStringList(value.tips, minimum, 4, 280)) return false;
  if (value.source === "ai") {
    const sample = readString(value.sampleAnswer, 1200);
    if (!sample || sample.length < 40) return false;
  }
  return true;
}

export function isReportCoach(value: unknown): value is ReportCoach {
  if (!isRecord(value) || value.source !== "ai") return false;
  const narrative = readString(value.narrative, 800);
  if (!narrative || narrative.length < 40) return false;
  return Boolean(readStringList(value.recommendations, 1, 4, 280));
}

export function parseEvaluateInput(
  value: unknown,
): { ok: true; value: EvaluateInput } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: "The coach expected an object." };
  const questionId = readString(value.questionId, 80);
  if (!questionId) return { ok: false, error: "Missing question." };
  if (value.phase !== "answering" && value.phase !== "followup") {
    return { ok: false, error: "Missing phase." };
  }
  if (!DIFFICULTIES.has(value.difficulty as Difficulty)) {
    return { ok: false, error: "Missing pressure." };
  }
  if (!ROLES.has(value.role as RoleTarget)) {
    return { ok: false, error: "Missing role." };
  }
  if (typeof value.hintUsed !== "boolean") {
    return { ok: false, error: "Missing nudge flag." };
  }
  const answer = readString(value.answer, 8000);
  if (!answer) return { ok: false, error: "Write an answer before scoring it." };
  const focus = typeof value.focus === "string" ? value.focus.trim().slice(0, 120) : "";
  const prior = value.priorAnswer === undefined ? undefined : readString(value.priorAnswer, 8000);
  if (value.phase === "followup" && !prior) {
    return { ok: false, error: "The follow-up is missing the first answer." };
  }
  if (!Array.isArray(value.asked) || value.asked.length > 24) {
    return { ok: false, error: "The asked list is unreadable." };
  }
  const asked = value.asked
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 500));
  const followUpPrompt =
    value.followUpPrompt === undefined ? undefined : readString(value.followUpPrompt, 500) ?? undefined;
  return {
    ok: true,
    value: {
      questionId,
      phase: value.phase,
      difficulty: value.difficulty as Difficulty,
      role: value.role as RoleTarget,
      focus,
      hintUsed: value.hintUsed,
      answer,
      priorAnswer: prior ?? undefined,
      followUpPrompt,
      asked,
    },
  };
}

export function parseDebriefInput(
  value: unknown,
): { ok: true; value: DebriefInput } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: "The debrief expected an object." };
  if (value.track !== "technical" && value.track !== "hr") {
    return { ok: false, error: "Missing track." };
  }
  if (!DIFFICULTIES.has(value.difficulty as Difficulty)) {
    return { ok: false, error: "Missing pressure." };
  }
  if (!ROLES.has(value.role as RoleTarget)) {
    return { ok: false, error: "Missing role." };
  }
  const topic = readString(value.topic, 40);
  if (!topic || !TOPIC_IDS.has(topic as Topic)) return { ok: false, error: "Missing topic." };
  if (!Array.isArray(value.turns) || value.turns.length === 0 || value.turns.length > 12) {
    return { ok: false, error: "The debrief needs the answers from this round." };
  }
  const turns: DebriefTurnInput[] = [];
  for (const turn of value.turns) {
    if (!isRecord(turn)) return { ok: false, error: "An answer in the debrief is unreadable." };
    const prompt = readString(turn.prompt, 500);
    const answer = readString(turn.answer, 8000);
    if (!prompt || !answer) return { ok: false, error: "An answer in the debrief is incomplete." };
    const overall = readScoreValue(turn.overall);
    if (overall === null) return { ok: false, error: "An answer is missing its score." };
    turns.push({
      prompt,
      answer,
      followUpPrompt: readString(turn.followUpPrompt, 500) ?? undefined,
      followUpAnswer: readString(turn.followUpAnswer, 8000) ?? undefined,
      overall,
      strengths: readStringList(turn.strengths, 0, 4, 280) ?? [],
      improvements: readStringList(turn.improvements, 0, 4, 280) ?? [],
    });
  }
  const focus = typeof value.focus === "string" ? value.focus.trim().slice(0, 120) : "";
  return {
    ok: true,
    value: {
      track: value.track,
      topic: topic as Topic,
      difficulty: value.difficulty as Difficulty,
      role: value.role as RoleTarget,
      focus,
      turns,
    },
  };
}

export function extractJson(text: string): unknown {
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

export function readDimensions(
  value: unknown,
): Record<Dimension, number> | null {
  if (!isRecord(value)) return null;
  const dimensions = {} as Record<Dimension, number>;
  for (const dimension of DIMENSIONS) {
    const score = readScoreValue(value[dimension]);
    if (score === null) return null;
    dimensions[dimension] = score;
  }
  return dimensions;
}

