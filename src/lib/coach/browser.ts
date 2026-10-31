import type { CoachVerdict, ReportCoach, Session } from "@/lib/domain";
import { isCoachVerdict, isReportCoach, type DebriefInput, type EvaluateInput } from "@/lib/coach/schema";
import { knownLocalMode } from "@/lib/coach/status";

export const UNREACHABLE_NOTICE =
  "The AI coach could not be reached. This answer was scored by the local coach, and your text was kept.";

export type EvaluationResult = {
  verdict?: CoachVerdict;
  notice?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function shouldScoreLocally(): boolean {
  return knownLocalMode();
}

export async function requestEvaluation(input: EvaluateInput): Promise<EvaluationResult> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "evaluate", ...input }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = isRecord(body) && typeof body.error === "string" ? body.error : UNREACHABLE_NOTICE;
    throw new Error(error);
  }
  if (!isRecord(body) || !isCoachVerdict(body.verdict)) {
    throw new Error(UNREACHABLE_NOTICE);
  }
  const notice =
    body.fellBack === true && typeof body.notice === "string" ? body.notice : undefined;
  return { verdict: body.verdict, notice };
}

export function debriefInputFrom(session: Session): DebriefInput {
  return {
    track: session.config.track,
    topic: session.config.topic,
    difficulty: session.config.difficulty,
    role: session.config.role,
    focus: session.config.focus,
    turns: session.turns.map((turn) => ({
      prompt: turn.prompt,
      answer: turn.answer,
      followUpPrompt: turn.followUpPrompt,
      followUpAnswer: turn.followUpAnswer,
      overall: turn.score.overall,
      strengths: turn.coach?.strengths ?? [],
      improvements: turn.coach?.improvements ?? [],
    })),
  };
}

export async function requestDebrief(session: Session): Promise<ReportCoach | null> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "debrief", ...debriefInputFrom(session) }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(body)) throw new Error(UNREACHABLE_NOTICE);
  if (body.fellBack === true) throw new Error(typeof body.notice === "string" ? body.notice : UNREACHABLE_NOTICE);
  if (!body.coach) return null;
  if (!isReportCoach(body.coach)) throw new Error(UNREACHABLE_NOTICE);
  return body.coach;
}
