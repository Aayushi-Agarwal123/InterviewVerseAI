"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { Session, SessionPhase } from "@/lib/domain";
import {
  endEarly,
  markHint,
  submitAnswer,
  withDraft,
} from "@/lib/engine/session";
import { formatClock } from "@/lib/format";
import { getQuestion } from "@/lib/questions";
import { wordCount } from "@/lib/text";
import { RoomSkeleton } from "@/features/interview/room-skeleton";

export function InterviewRoom({ id }: { id: string }) {
  const store = useSessions();
  const router = useRouter();

  if (store.status === "loading") return <RoomSkeleton />;
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
  const question = getQuestion(session.questionIds[session.index]);
  const persona = personaFor(session.config.track);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const persistDraft = useCallback((draft: string, index: number, phase: SessionPhase) => {
    const current = sessionRef.current;
    if (current.status !== "active") return;
    if (current.index !== index || current.phase !== phase) return;
    if (current.draft === draft) return;
    store.replace(withDraft(current, draft));
  }, [store]);

  function finish(next: Session | null) {
    if (!next) {
      store.remove(session.id);
      onLeave();
      return;
    }
    store.replace(next);
    if (next.status === "completed") router.push(`/report/${next.id}`);
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
            finish(
              endEarly(
                sessionRef.current,
                liveDraft.current,
                new Date().toISOString(),
              ),
            )
          }
        >
          Score what you have
        </Button>
      </div>
    );
  }

  const hint = question.signals[0]?.hint;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-copper uppercase">
          {topicById(session.config.topic).label} · {difficultyLabel(session.config.difficulty)} ·{" "}
          {roleLabel(session.config.role)}
        </p>
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
            </li>
          ))}
        </ol>
      ) : null}

      <article className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
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

      <Composer
        key={`${session.index}-${session.phase}`}
        initial={session.draft}
        phase={session.phase}
        index={session.index}
        hint={session.phase === "answering" ? hint : undefined}
        hintUsed={session.active.hintUsed}
        onHint={() => store.replace(markHint(sessionRef.current))}
        onValue={(draft) => {
          liveDraft.current = draft;
        }}
        onDraft={persistDraft}
        onSubmit={(draft) => {
          liveDraft.current = "";
          finish(submitAnswer(sessionRef.current, draft, new Date().toISOString()));
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setConfirmEnd(true)}>
          Close the round
        </Button>
        <Link href="/practice" className="text-sm text-muted-foreground hover:text-foreground">
          New setup
        </Link>
      </div>

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this round?</DialogTitle>
            <DialogDescription>
              {session.turns.length === 0 && session.phase === "answering"
                ? "You have not sent an answer yet. Closing now discards the round."
                : "What you have already sent is scored. An unsent draft is included if you have typed one."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)}>
              Keep going
            </Button>
            <Button
              onClick={() => {
                finish(
                  endEarly(
                    sessionRef.current,
                    liveDraft.current,
                    new Date().toISOString(),
                  ),
                );
              }}
            >
              Score and close
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

function Composer({
  initial,
  phase,
  index,
  hint,
  hintUsed,
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
  onHint: () => void;
  onValue: (draft: string) => void;
  onDraft: (draft: string, index: number, phase: SessionPhase) => void;
  onSubmit: (draft: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const words = wordCount(draft);

  useEffect(() => {
    const timer = window.setTimeout(() => onDraft(draft, index, phase), 450);
    return () => window.clearTimeout(timer);
  }, [draft, index, phase, onDraft]);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
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
            <Button type="button" variant="outline" onClick={onHint}>
              Show a nudge
            </Button>
          ) : null}
          <Button type="submit" className="h-10 px-4">
            Send answer
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
