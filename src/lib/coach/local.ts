import type { CoachVerdict, Question } from "@/lib/domain";
import { pickFollowUp, scoreAnswer } from "@/lib/engine/score";
import type { EvaluateInput } from "@/lib/coach/schema";

export function answerText(input: Pick<EvaluateInput, "phase" | "answer" | "priorAnswer">): string {
  if (input.phase === "followup") {
    return [input.priorAnswer, input.answer].filter(Boolean).join("\n");
  }
  return input.answer;
}

export function localVerdict(question: Question, input: EvaluateInput): CoachVerdict {
  const score = scoreAnswer({
    question,
    text: answerText(input),
    hintUsed: input.hintUsed,
    difficulty: input.difficulty,
  });
  const followUp =
    input.phase === "answering"
      ? pickFollowUp(question, score, input.difficulty)
      : undefined;
  return {
    source: "local",
    score,
    followUp,
    strengths: [],
    improvements: [],
    tips: [],
  };
}
