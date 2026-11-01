import type { CoachVerdict, Question, Session } from "@/lib/domain";
import { freshActive } from "@/lib/domain";
import { questionOn } from "@/lib/engine/session";
import { buildReport, pickFollowUp, scoreAnswer } from "@/lib/engine/score";

function makeTurn(
  question: Question,
  answer: string,
  followUpPrompt: string | undefined,
  followUpAnswer: string | undefined,
  difficulty: Session["config"]["difficulty"],
  verdict?: CoachVerdict,
): Session["turns"][number] {
  const text = [answer, followUpAnswer].filter(Boolean).join("\n");
  const coach =
    verdict?.source === "ai" && verdict.sampleAnswer
      ? {
          source: "ai" as const,
          strengths: verdict.strengths,
          improvements: verdict.improvements,
          tips: verdict.tips,
          sampleAnswer: verdict.sampleAnswer,
        }
      : undefined;
  return {
    questionId: question.id,
    prompt: question.prompt,
    answer,
    hintUsed: false,
    followUpPrompt,
    followUpAnswer,
    score: verdict?.score ?? scoreAnswer({ question, text, hintUsed: false, difficulty }),
    coach,
  };
}

export function answerAvatar(
  session: Session,
  draft: string,
  now: string,
  verdict: CoachVerdict | undefined,
  next: Question | null,
  budget: number,
  finish = false,
): Session {
  if (session.status !== "active") return session;
  const question = questionOn(session, session.questionIds[session.index]);
  if (!question) return session;
  const text = draft.trim();
  if (finish && session.phase === "followup" && !text && session.active.answer.trim()) {
    const turn = makeTurn(
      question,
      session.active.answer,
      undefined,
      undefined,
      session.config.difficulty,
      verdict,
    );
    const turns = [...session.turns, turn];
    const closed: Session = {
      ...session,
      turns,
      phase: "done",
      status: "completed",
      draft: "",
      active: freshActive(),
      updatedAt: now,
      config: { ...session.config, questionCount: turns.length },
    };
    return { ...closed, report: buildReport(closed) };
  }
  if (!text) return session;

  if (session.phase === "answering") {
    const preview =
      verdict?.score ??
      scoreAnswer({ question, text, hintUsed: false, difficulty: session.config.difficulty });
    const followUp = finish
      ? undefined
      : verdict
        ? verdict.followUp?.trim() || undefined
        : pickFollowUp(question, preview, session.config.difficulty);
    if (followUp) {
      return {
        ...session,
        phase: "followup",
        draft: "",
        updatedAt: now,
        active: { answer: text, hintUsed: false, followUpPrompt: followUp },
      };
    }
  }

  const turn =
    session.phase === "followup"
      ? makeTurn(question, session.active.answer, session.active.followUpPrompt, text, session.config.difficulty, verdict)
      : makeTurn(question, text, undefined, undefined, session.config.difficulty, verdict);
  const turns = [...session.turns, turn];
  if (turns.length >= budget || !next) {
    const closed: Session = {
      ...session,
      turns,
      phase: "done",
      status: "completed",
      draft: "",
      active: freshActive(),
      updatedAt: now,
      config: { ...session.config, questionCount: turns.length },
    };
    return { ...closed, report: buildReport(closed) };
  }
  return {
    ...session,
    turns,
    prompts: { ...session.prompts, [next.id]: next },
    promptNotes: { ...session.promptNotes, [next.id]: session.promptNotes?.[next.id] ?? "" },
    questionIds: [...session.questionIds, next.id],
    index: session.questionIds.length,
    phase: "answering",
    draft: "",
    active: freshActive(),
    updatedAt: now,
    questionStartedAt: now,
    config: {
      ...session.config,
      track: next.track,
      topic: next.topic,
      questionCount: budget,
    },
  };
}

export function closeAvatar(session: Session, now: string): Session | null {
  if (session.status !== "active") return session;
  if (session.turns.length === 0) return null;
  const closed: Session = {
    ...session,
    phase: "done",
    status: "completed",
    draft: "",
    active: freshActive(),
    updatedAt: now,
    config: { ...session.config, questionCount: session.turns.length },
  };
  return { ...closed, report: buildReport(closed) };
}
