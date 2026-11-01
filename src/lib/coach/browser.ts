import type { CoachVerdict, ReportCoach, Session } from "@/lib/domain";
import { readCoachVerdict, readReportCoach, type DebriefInput, type EvaluateInput } from "@/lib/coach/schema";
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

function readNotice(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, 400);
  return text || undefined;
}

export function shouldScoreLocally(): boolean {
  return knownLocalMode();
}

export async function requestCustomEvaluation(
  input: EvaluateInput & { question: unknown },
): Promise<EvaluationResult> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "evaluate-custom", ...input }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = isRecord(body) ? readNotice(body.error) : undefined;
    throw new Error(error ?? UNREACHABLE_NOTICE);
  }
  const verdict = isRecord(body) ? readCoachVerdict(body.verdict) : null;
  if (!verdict) throw new Error(UNREACHABLE_NOTICE);
  const notice = isRecord(body) && body.fellBack === true ? readNotice(body.notice) : undefined;
  return { verdict, notice };
}

export async function requestEvaluation(input: EvaluateInput): Promise<EvaluationResult> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "evaluate", ...input }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = isRecord(body) ? readNotice(body.error) : undefined;
    throw new Error(error ?? UNREACHABLE_NOTICE);
  }
  const verdict = isRecord(body) ? readCoachVerdict(body.verdict) : null;
  if (!verdict) throw new Error(UNREACHABLE_NOTICE);
  const notice = isRecord(body) && body.fellBack === true ? readNotice(body.notice) : undefined;
  return { verdict, notice };
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
  if (body.fellBack === true) throw new Error(readNotice(body.notice) ?? UNREACHABLE_NOTICE);
  if (!body.coach) return null;
  const coach = readReportCoach(body.coach);
  if (!coach) throw new Error(UNREACHABLE_NOTICE);
  return coach;
}
