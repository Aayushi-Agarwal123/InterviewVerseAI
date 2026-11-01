import type {
  CoachVerdict,
  Question,
  Session,
  SessionConfig,
  Turn,
} from "@/lib/domain";
import { freshActive } from "@/lib/domain";
import { QUESTIONS, getQuestion } from "@/lib/questions";
import { buildReport, pickFollowUp, scoreAnswer } from "@/lib/engine/score";

export function questionsFor(
  config: Pick<SessionConfig, "track" | "topic" | "difficulty">,
): Question[] {
  return QUESTIONS.filter(
    (question) =>
      question.track === config.track &&
      question.topic === config.topic &&
      question.difficulties.includes(config.difficulty),
  );
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `iv_${Date.now().toString(36)}`;
}

export function questionOn(session: Session, id: string | undefined): Question | undefined {
  if (!id) return undefined;
  return session.prompts?.[id] ?? getQuestion(id);
}

export function createSession(
  config: SessionConfig,
  options?: {
    id?: string;
    now?: string;
    questionIds?: string[];
    sample?: boolean;
    random?: () => number;
    prompts?: Record<string, Question>;
    standbyIds?: string[];
    promptNotes?: Record<string, string>;
    kind?: Session["kind"];
    voice?: boolean;
    durationMinutes?: number;
    planSource?: Session["planSource"];
    profileName?: string;
  },
): Session {
  const now = options?.now ?? new Date().toISOString();
  const pool = questionsFor(config);
  const allowed = (id: string) => Boolean(getQuestion(id) || options?.prompts?.[id]);
  const picked =
    options?.questionIds?.filter(allowed) ??
    shuffle(pool, options?.random ?? Math.random)
      .slice(0, Math.max(1, Math.min(config.questionCount, pool.length)))
      .map((question) => question.id);
  const standbyIds = options?.standbyIds?.filter(allowed);

  return {
    id: options?.id ?? createId(),
    createdAt: now,
    updatedAt: now,
    questionStartedAt: now,
    config: {
      ...config,
      focus: config.focus.trim(),
      questionCount: picked.length,
    },
    questionIds: picked,
    index: 0,
    phase: "answering",
    active: freshActive(),
    draft: "",
    turns: [],
    status: "active",
    sample: options?.sample,
    kind: options?.kind,
    voice: options?.voice,
    prompts: options?.prompts,
    standbyIds,
    promptNotes: options?.promptNotes,
    durationMinutes: options?.durationMinutes,
    planSource: options?.planSource,
    profileName: options?.profileName,
  };
}

function turnFrom(
  question: Question,
  answer: string,
  hintUsed: boolean,
  difficulty: SessionConfig["difficulty"],
  followUpPrompt?: string,
  followUpAnswer?: string,
  verdict?: CoachVerdict,
): Turn {
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
    hintUsed,
    followUpPrompt,
    followUpAnswer,
    score: verdict?.score ?? scoreAnswer({ question, text, hintUsed, difficulty }),
    coach,
  };
}

function complete(session: Session, turns: Turn[], now: string): Session {
  const closed: Session = {
    ...session,
    turns,
    phase: "done",
    status: "completed",
    draft: "",
    active: freshActive(),
    updatedAt: now,
  };
  return { ...closed, report: buildReport(closed) };
}

function advance(session: Session, turn: Turn, now: string): Session {
  const turns = [...session.turns, turn];
  const nextIndex = session.index + 1;
  if (nextIndex >= session.questionIds.length) {
    return complete(session, turns, now);
  }
  return adaptNext({
    ...session,
    turns,
    index: nextIndex,
    phase: "answering",
    draft: "",
    active: freshActive(),
    updatedAt: now,
    questionStartedAt: now,
  });
}

function adaptNext(session: Session): Session {
  if (session.kind !== "personalized") return session;
  const last = session.turns.at(-1);
  if (!last) return session;
  const want: Session["config"]["difficulty"] =
    last.score.overall < 45 ? "warmup" : last.score.overall > 82 ? "pressure" : session.config.difficulty;
  const current = questionOn(session, session.questionIds[session.index]);
  if (!current || current.difficulties.includes(want)) return session;
  const standby = session.standbyIds ?? [];
  const swapAt = standby.findIndex((id) => questionOn(session, id)?.difficulties.includes(want));
  if (swapAt < 0) return session;
  const questionIds = [...session.questionIds];
  const displaced = questionIds[session.index];
  questionIds[session.index] = standby[swapAt];
  const standbyIds = [...standby];
  standbyIds[swapAt] = displaced;
  return { ...session, questionIds, standbyIds };
}

export function submitAnswer(
  session: Session,
  draft: string,
  now: string,
  verdict?: CoachVerdict,
): Session {
  if (session.status !== "active") return session;
  const text = draft.trim();
  if (!text) return session;
  const question = questionOn(session, session.questionIds[session.index]);
  if (!question) return session;

  if (session.phase === "followup") {
    const turn = turnFrom(
      question,
      session.active.answer,
      session.active.hintUsed,
      session.config.difficulty,
      session.active.followUpPrompt,
      text,
      verdict,
    );
    return advance(session, turn, now);
  }

  const preview =
    verdict?.score ??
    scoreAnswer({
      question,
      text,
      hintUsed: session.active.hintUsed,
      difficulty: session.config.difficulty,
    });
  const followUp = verdict
    ? verdict.followUp?.trim() || undefined
    : pickFollowUp(question, preview, session.config.difficulty);
  if (followUp) {
    return {
      ...session,
      phase: "followup",
      draft: "",
      updatedAt: now,
      active: {
        answer: text,
        hintUsed: session.active.hintUsed,
        followUpPrompt: followUp,
      },
    };
  }

  return advance(
    session,
    turnFrom(
      question,
      text,
      session.active.hintUsed,
      session.config.difficulty,
      undefined,
      undefined,
      verdict,
    ),
    now,
  );
}

export function markHint(session: Session): Session {
  if (session.status !== "active" || session.phase !== "answering") {
    return session;
  }
  if (session.active.hintUsed) return session;
  return {
    ...session,
    active: { ...session.active, hintUsed: true },
  };
}

export function withDraft(session: Session, draft: string): Session {
  if (session.status !== "active") return session;
  return { ...session, draft };
}

export function endEarly(
  session: Session,
  draft: string,
  now: string,
  verdict?: CoachVerdict,
): Session | null {
  if (session.status !== "active") return session;
  const question = questionOn(session, session.questionIds[session.index]);
  let turns = session.turns;
  const pending = draft.trim();
  const closing = verdict ? { ...verdict, followUp: undefined } : undefined;

  if (question && session.phase === "followup") {
    turns = [
      ...turns,
      turnFrom(
        question,
        session.active.answer,
        session.active.hintUsed,
        session.config.difficulty,
        session.active.followUpPrompt,
        pending || undefined,
        closing,
      ),
    ];
  } else if (question && session.phase === "answering" && pending) {
    turns = [
      ...turns,
      turnFrom(
        question,
        pending,
        session.active.hintUsed,
        session.config.difficulty,
        undefined,
        undefined,
        closing,
      ),
    ];
  }

  if (turns.length === 0) return null;
  return complete(session, turns, now);
}
