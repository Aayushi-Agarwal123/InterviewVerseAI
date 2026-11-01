"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  peekSession,
  useSessions,
} from "@/components/shell/session-provider";
import { MissingRound, StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import {
  difficultyLabel,
  personaFor,
  roleLabel,
  topicById,
} from "@/lib/catalog";
import type { CoachVerdict, Session, SessionPhase } from "@/lib/domain";
import {
  requestCustomEvaluation,
  requestDebrief,
  requestEvaluation,
  shouldScoreLocally,
  UNREACHABLE_NOTICE,
} from "@/lib/coach/browser";
import { VoiceBar } from "@/features/interview/voice-bar";
import { useCoachMode } from "@/components/shell/coach-mark";
import {
  endEarly,
  markHint,
  submitAnswer,
  withDraft,
} from "@/lib/engine/session";
import { formatClock } from "@/lib/format";
import { questionOn } from "@/lib/engine/session";
import { getQuestion } from "@/lib/questions";
import { wordCount } from "@/lib/text";
import { RoomSkeleton } from "@/features/interview/room-skeleton";

function subscribeToClient(): () => void {
  return () => {};
}

function clientIsReady(): boolean {
  return true;
}

function serverIsWaiting(): boolean {
  return false;
}

export function InterviewRoom({ id }: { id: string }) {
  const store = useSessions();
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToClient, clientIsReady, serverIsWaiting);

  if (!hydrated || store.status === "loading") return <RoomSkeleton />;
  if (store.status === "error") {
    return <StorageError message={store.message} onReset={store.clear} />;
  }

  const session =
    store.sessions.find((item) => item.id === id) ?? peekSession(id);
  if (!session) {
    return (
      <MissingRound
        title="This round is not on this device."
        body="Rounds stay in the browser that started them. Start a new one from Practice."
      />
    );
  }
  if (session.status === "completed") {
    return <SendToReport id={session.id} />;
  }
  if (session.questionIds.length === 0) {
    return (
      <MissingRound
        title="This round has no prompts."
        body="The topic and pressure you picked did not match the bank. Choose again."
      />
    );
  }

  return <LiveRound key={session.id} session={session} onLeave={() => router.push("/")} />;
}

function SendToReport({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/report/${id}`);
  }, [id, router]);
  return <RoomSkeleton />;
}

function LiveRound({
  session,
  onLeave,
}: {
  session: Session;
  onLeave: () => void;
}) {
  const store = useSessions();
  const router = useRouter();
  const sessionRef = useRef(session);
  const liveDraft = useRef(session.draft);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    liveDraft.current = sessionRef.current.draft;
  }, [session.id, session.index, session.phase]);
  const question = questionOn(session, session.questionIds[session.index]);
  const persona = personaFor(session.config.track);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string; nonce: number } | null>(null);
  useEffect(() => {
    setTranscript(null);
  }, [session.index, session.phase]);
  const [closingDraft, setClosingDraft] = useState("");
  const [scoringLabel, setScoringLabel] = useState("");
  const scoringRef = useRef(false);
  const coach = useCoachMode();

  const persistDraft = useCallback((draft: string, index: number, phase: SessionPhase) => {
    const current = sessionRef.current;
    if (current.status !== "active") return;
    if (current.index !== index || current.phase !== phase) return;
    if (current.draft === draft) return;
    store.replace(withDraft(current, draft));
  }, [store]);

  async function commit(next: Session | null, notice?: string) {
    if (!next) {
      store.remove(session.id);
      onLeave();
      return;
    }
    let saved = applyNotice(next, notice);
    store.replace(saved);
    if (
      saved.status === "completed" &&
      saved.report &&
      saved.turns.some((turn) => turn.coach?.source === "ai") &&
      !saved.report.coach
    ) {
      setScoringLabel("Writing the debrief.");
      try {
        const written = await requestDebrief(saved);
        if (written) {
          saved = { ...saved, report: { ...saved.report, coach: written } };
          store.replace(saved);
        }
      } catch (error) {
        saved = applyNotice(
          saved,
          error instanceof Error
            ? error.message
            : "The model did not write a round summary. The scores and answers are saved.",
        );
        store.replace(saved);
      }
    }
    if (saved.status === "completed") router.push(`/report/${saved.id}`);
  }

  async function scoreText(draft: string, closing: boolean) {
    if (scoringRef.current) return;
    const current = sessionRef.current;
    const pending = draft.trim();
    if (!closing && !pending) return;
    scoringRef.current = true;
    let verdict: CoachVerdict | undefined;
    let notice: string | undefined;
    const askModel = !shouldScoreLocally() && Boolean(pending);
    if (askModel) setScoringLabel(`${persona.name.split(" ")[0]} is reading this answer.`);
    try {
      if (askModel) {
        try {
          const questionId = current.questionIds[current.index] ?? "";
          const custom = current.prompts?.[questionId];
          const payload = {
            questionId,
            phase: current.phase === "followup" ? ("followup" as const) : ("answering" as const),
            difficulty: current.config.difficulty,
            role: current.config.role,
            focus: current.config.focus,
            hintUsed: current.active.hintUsed,
            answer: pending,
            priorAnswer: current.phase === "followup" ? current.active.answer : undefined,
            followUpPrompt: current.active.followUpPrompt,
            asked: current.turns.flatMap((turn) =>
              [turn.prompt, turn.followUpPrompt].filter((item): item is string => Boolean(item)),
            ),
          };
          const result = custom && !getQuestion(questionId)
            ? await requestCustomEvaluation({ ...payload, question: custom })
            : await requestEvaluation(payload);
          verdict = result.verdict;
          notice = result.notice;
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          notice = message && !/fetch|network|abort|failed/i.test(message) ? message : UNREACHABLE_NOTICE;
        }
      }
      const now = new Date().toISOString();
      const score = (nextVerdict?: CoachVerdict) =>
        closing
          ? endEarly(current, draft, now, nextVerdict)
          : submitAnswer(current, draft, now, nextVerdict);
      let next: Session | null = null;
      try {
        next = score(verdict);
      } catch {
        notice = UNREACHABLE_NOTICE;
        try {
          next = score();
        } catch {
          return;
        }
      }
      try {
        await commit(next, notice);
      } catch {
        return;
      }
      if (next) liveDraft.current = "";
    } finally {
      scoringRef.current = false;
      setScoringLabel("");
    }
  }

  if (!question) {
    return (
      <div className="max-w-xl">
        <MissingRound
          title="This prompt left the bank."
          body="Close the round to score the answers you already gave."
        />
        <Button
          className="mt-6 h-10"
          onClick={() =>
            void scoreText(liveDraft.current, true)
          }
        >
          Score what you have
        </Button>
      </div>
    );
  }

  const hint = question.signals[0]?.hint;
  const willDiscard =
    session.turns.length === 0 &&
    session.phase === "answering" &&
    closingDraft.trim() === "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-copper uppercase">
          {topicById(session.config.topic).label} · {difficultyLabel(session.config.difficulty)} ·{" "}
          {roleLabel(session.config.role)}
          {session.kind === "personalized" ? " · Personalized" : ""}
          {session.voice ? " · Voice" : ""}
          {coach.ready ? ` · ${coach.label}` : ""}
        </p>
        {session.planSource ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {session.planSource === "gemini"
              ? "These questions were written by Gemini for the saved profile. Standby prompts from the bank can replace the next question when an answer is thin or strong."
              : "These questions were chosen from the bank for the saved profile. Gemini did not write them."}
          </p>
        ) : null}
        {session.durationMinutes ? <RoundClock startedAt={session.createdAt} minutes={session.durationMinutes} /> : null}
        <div className="mt-3">
          <Progress
            value={((session.index + 1) / session.questionIds.length) * 100}
          >
            <ProgressLabel>
              Question {session.index + 1} of {session.questionIds.length}
            </ProgressLabel>
          </Progress>
        </div>
      </header>

      {scoringLabel ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {scoringLabel}
        </p>
      ) : null}

      {session.coachNotice ? (
        <p className="rounded-xl bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
          {session.coachNotice}
          <button
            type="button"
            className="ml-3 underline underline-offset-4"
            onClick={() => store.replace(applyNotice(session, undefined))}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      {session.config.focus ? (
        <p className="text-sm text-muted-foreground">
          You asked to lean into <span className="text-foreground">{session.config.focus}</span>.
        </p>
      ) : null}

      {session.turns.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {session.turns.map((turn, index) => (
            <li key={turn.questionId} className="rounded-xl bg-card/70 px-4 py-3 text-sm ring-1 ring-foreground/5">
              <span className="text-muted-foreground">Answer {index + 1}</span>
              <span className="ml-2 font-medium tabular-nums">{turn.score.overall}</span>
              <span className="ml-2 text-muted-foreground">
                {turn.coach?.source === "ai" ? "Model coach" : "Local Coach"} · communication{" "}
                {turn.score.dimensions.communication}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <article className="panel px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
              {persona.initials}
            </span>
            <div>
              <p className="font-medium">{persona.name}</p>
              <p className="text-xs text-muted-foreground">{persona.role}</p>
            </div>
          </div>
          <Clock
            startedAt={session.questionStartedAt}
            minutes={question.minutes}
            difficulty={session.config.difficulty}
          />
        </div>
        {session.promptNotes?.[question.id] ? (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">{session.promptNotes[question.id]}</p>
        ) : null}
        <p className="mt-5 text-xs text-muted-foreground">{question.setup}</p>
        <h1 className="mt-3 text-3xl leading-snug tracking-tight text-balance">
          {question.prompt}
        </h1>
        {session.phase === "followup" ? (
          <div className="mt-5 border-t border-border pt-4" aria-live="polite">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Your answer
            </p>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{session.active.answer}</p>
            <p className="mt-4 font-medium">{persona.name.split(" ")[0]} follows up</p>
            <p className="mt-1 text-lg leading-7">{session.active.followUpPrompt}</p>
          </div>
        ) : null}
      </article>

      {session.voice ? (
        <VoiceBar
          prompt={session.phase === "followup" ? session.active.followUpPrompt ?? question.prompt : question.prompt}
          onTranscript={(text) => {
            const next = liveDraft.current ? `${liveDraft.current.trim()} ${text}` : text;
            liveDraft.current = next;
            persistDraft(next, session.index, session.phase);
            setTranscript({ text: next, nonce: Date.now() });
          }}
        />
      ) : null}

      <Composer
        key={`${session.index}-${session.phase}`}
        inject={transcript}
        initial={session.draft}
        phase={session.phase}
        index={session.index}
        hint={session.phase === "answering" ? hint : undefined}
        hintUsed={session.active.hintUsed}
        busy={Boolean(scoringLabel)}
        onHint={() => store.replace(markHint(sessionRef.current))}
        onValue={(draft) => {
          liveDraft.current = draft;
        }}
        onDraft={persistDraft}
        onSubmit={(draft) => {
          void scoreText(draft, false);
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={Boolean(scoringLabel)}
          onClick={() => {
            setClosingDraft(liveDraft.current);
            setConfirmEnd(true);
          }}
        >
          Close the round
        </Button>
        <Link href="/practice" className="text-sm text-muted-foreground hover:text-foreground">
          New setup
        </Link>
      </div>

      <Dialog
        open={confirmEnd}
        onOpenChange={(open) => {
          if (!scoringLabel) setConfirmEnd(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this round?</DialogTitle>
            <DialogDescription>
              {willDiscard
                ? "Nothing has been sent, and the answer box is empty. Closing now discards the round."
                : "What you have already sent is scored. An unsent draft is included if you have typed one."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)}>
              Keep going
            </Button>
            <Button
              disabled={Boolean(scoringLabel)}
              onClick={() => {
                if (willDiscard) {
                  void commit(endEarly(sessionRef.current, "", new Date().toISOString()));
                  return;
                }
                void scoreText(closingDraft, true);
              }}
            >
              {scoringLabel ? "Scoring…" : willDiscard ? "Discard round" : "Score and close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Clock({
  startedAt,
  minutes,
  difficulty,
}: {
  startedAt: string;
  minutes: number;
  difficulty: Session["config"]["difficulty"];
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  const elapsed = now === null ? null : Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const budget = minutes * 60;
  const remaining = elapsed === null ? null : budget - elapsed;
  const label = difficulty === "pressure" ? "Timebox" : "Elapsed";
  const value =
    elapsed === null
      ? "–:––"
      : difficulty === "pressure"
        ? remaining !== null && remaining >= 0
          ? formatClock(remaining)
          : "Over"
        : formatClock(elapsed);
  return (
    <div className="text-right">
      <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={`font-heading text-2xl tabular-nums ${
          difficulty === "pressure" && remaining !== null && remaining < 0
            ? "text-copper"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function applyNotice(session: Session, notice?: string): Session {
  const text = notice?.trim().slice(0, 400) ?? "";
  if (!text) {
    if (!session.coachNotice) return session;
    const next = { ...session };
    delete next.coachNotice;
    return next;
  }
  return { ...session, coachNotice: text };
}

function RoundClock({ startedAt, minutes }: { startedAt: string; minutes: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  const elapsed = now === null ? 0 : Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const remaining = minutes * 60 - elapsed;
  return (
    <p className="mt-2 text-sm text-muted-foreground tabular-nums">
      Round budget {minutes} min · {remaining >= 0 ? `${formatClock(remaining)} left` : "over the planned duration"}
    </p>
  );
}

function Composer({
  initial,
  phase,
  index,
  hint,
  hintUsed,
  busy,
  inject,
  onHint,
  onValue,
  onDraft,
  onSubmit,
}: {
  initial: string;
  phase: SessionPhase;
  index: number;
  hint?: string;
  hintUsed: boolean;
  busy: boolean;
  inject?: { text: string; nonce: number } | null;
  onHint: () => void;
  onValue: (draft: string) => void;
  onDraft: (draft: string, index: number, phase: SessionPhase) => void;
  onSubmit: (draft: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const words = wordCount(draft);
  useEffect(() => {
    if (!inject) return;
    setDraft(inject.text);
    onValue(inject.text);
    // The transcript nonce is the only signal that new speech arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inject?.nonce]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDraft(draft, index, phase), 450);
    return () => window.clearTimeout(timer);
  }, [draft, index, phase, onDraft]);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        if (!draft.trim()) {
          setError("Write the answer before you send it.");
          return;
        }
        onSubmit(draft);
      }}
    >
      <label htmlFor="answer" className="text-sm font-medium">
        {phase === "followup" ? "Follow-up" : "Your answer"}
      </label>
      <Textarea
        id="answer"
        value={draft}
        disabled={busy}
        onChange={(event) => {
          setDraft(event.target.value);
          onValue(event.target.value);
          if (error) setError("");
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={
          phase === "followup"
            ? "Answer the probe. Do not repeat the whole story."
            : "Speak it the way you would in the room. Specific beats polished."
        }
        className="min-h-40 bg-card text-base leading-7 md:text-base"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {words} {words === 1 ? "word" : "words"}
          {error ? <span className="ml-3 text-destructive">{error}</span> : null}
        </p>
        <div className="flex gap-2">
          {hint && !hintUsed ? (
            <Button type="button" variant="outline" disabled={busy} onClick={onHint}>
              Show a nudge
            </Button>
          ) : null}
          <Button type="submit" className="h-10 px-4" disabled={busy}>
            {busy ? "Scoring…" : "Send answer"}
          </Button>
        </div>
      </div>
      {hintUsed && hint ? (
        <p className="rounded-xl bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
          Nudge: {hint} Depth on this prompt is capped a little.
        </p>
      ) : null}
    </form>
  );
}
