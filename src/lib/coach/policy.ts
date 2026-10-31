import type { AnswerScore, Difficulty, Question, SessionPhase } from "@/lib/domain";
import { pickFollowUp } from "@/lib/engine/score";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function repeats(candidate: string, asked: string[]): boolean {
  const norm = normalize(candidate);
  if (!norm) return true;
  return asked.some((item) => {
    const other = normalize(item);
    if (!other) return false;
    if (other === norm) return true;
    if (other.length > 40 && (norm.includes(other) || other.includes(norm))) return true;
    return false;
  });
}

export function cleanFollowUp(value: string | undefined, asked: string[]): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 12 || text.length > 400) return undefined;
  const probing = /[?]/.test(text) || /^(what|why|how|which|where|when|walk|tell|describe)\b/i.test(text);
  if (!probing) return undefined;
  if (repeats(text, asked)) return undefined;
  return text;
}

export function chooseFollowUp(input: {
  phase: SessionPhase;
  difficulty: Difficulty;
  question: Question;
  localScore: AnswerScore;
  modelFollowUp?: string;
  modelDepth: number;
  asked: string[];
}): string | undefined {
  if (input.phase !== "answering" || input.difficulty === "warmup") return undefined;
  const bank = pickFollowUp(input.question, input.localScore, input.difficulty);
  const model = cleanFollowUp(input.modelFollowUp, [input.question.prompt, ...input.asked]);
  const modelWants = Boolean(model) && input.modelDepth < 72;
  if (!bank && !modelWants) return undefined;
  return model ?? bank;
}
