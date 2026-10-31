import { HR } from "@/lib/questions/hr";
import { TECHNICAL } from "@/lib/questions/technical";
import type { Question } from "@/lib/domain";

export const QUESTIONS: Question[] = [...TECHNICAL, ...HR];

const byId = new Map(QUESTIONS.map((question) => [question.id, question]));

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}
