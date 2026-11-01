"use client";

import { useState } from "react";
import Link from "next/link";
import { ScoreFigure, ScoreMeter } from "@/components/score-meter";
import { useCoachMode } from "@/components/shell/coach-mark";
import { requestDebrief } from "@/lib/coach/browser";
import {
  peekSession,
  useSessions,
} from "@/components/shell/session-provider";
import { MissingRound, StorageError } from "@/components/storage-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DIMENSION_COPY,
  difficultyLabel,
  personaFor,
  roleLabel,
  topicById,
} from "@/lib/catalog";
import type { Session } from "@/lib/domain";
import { buildReport } from "@/lib/engine/score";
import { getQuestion } from "@/lib/questions";
import { RoomSkeleton } from "@/features/interview/room-skeleton";

export function ReportPage({ id }: { id: string }) {
  const store = useSessions();
  if (store.status === "loading") return <RoomSkeleton />;
  if (store.status === "error") {
    return <StorageError message={store.message} onReset={store.clear} />;
  }
  const session =
    store.sessions.find((item) => item.id === id) ?? peekSession(id);
  if (!session) {
    return (
      <MissingRound
        title="This debrief is not on this device."
        body="Debriefs stay in the browser that ran the round."
      />
    );
  }
  if (session.status !== "completed" || session.turns.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-4xl tracking-tight">This round is still open.</h1>
        <p className="mt-3 text-muted-foreground">
          Finish it, or close it, before there is a debrief.
        </p>
        <Button
          className="mt-6 h-10"
          nativeButton={false}
          render={<Link href={`/interview/${session.id}`} />}
        >
          Return to the round
        </Button>
      </div>
    );
  }

  const report = session.report ?? buildReport(session);
  const persona = personaFor(session.config.track);
  const topic = topicById(session.config.topic);
  const hasAi = session.turns.some((turn) => turn.coach?.source === "ai");

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-copper uppercase">
          Debrief · {persona.name}
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="max-w-xl text-4xl leading-tight tracking-tight text-balance md:text-5xl">
              {report.headline}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              {report.summary}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {session.turns.filter((turn) => turn.coach?.source === "ai").length} answers scored by a model coach.{" "}
              {session.turns.filter((turn) => turn.coach?.source !== "ai").length} scored by the Local Coach.
              {session.planSource === "gemini" ? " Gemini wrote the questions." : ""}
              {session.planSource === "bank" ? " Questions were chosen from the bank." : ""}
            </p>
          </div>
          <div className="text-right">
            <ScoreFigure score={report.overall} />
            <p className="mt-2 text-xs tracking-[0.14em] text-muted-foreground uppercase">
              out of 100
            </p>
          </div>
        </div>
        {session.coachNotice ? (
          <p className="mt-4 rounded-xl bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
            {session.coachNotice}
            <button
              type="button"
              className="ml-3 underline underline-offset-4"
              onClick={() => {
                const next = { ...session };
                delete next.coachNotice;
                store.replace(next);
              }}
            >
              Dismiss
            </button>
          </p>
        ) : null}
        {report.coach ? (
          <div className="mt-6 max-w-xl">
            <h2 className="text-2xl tracking-tight">From the coach</h2>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{report.coach.narrative}</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-6">
              {report.coach.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasAi && !report.coach ? (
          <DebriefRetry session={session} />
        ) : null}
        <p className="mt-4 text-sm text-muted-foreground">
          {topic.label} · {difficultyLabel(session.config.difficulty)} ·{" "}
          {roleLabel(session.config.role)} · {session.turns.length}{" "}
          {session.turns.length === 1 ? "answer" : "answers"}
          {session.sample ? " · Sample" : ""}
        </p>
      </header>

      <section className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-2xl tracking-tight">Five dimensions</h2>
        <div className="mt-5 flex flex-col gap-4">
          {DIMENSION_COPY.map((dimension) => (
            <ScoreMeter
              key={dimension.id}
              label={dimension.label}
              score={report.dimensions[dimension.id]}
              detail={dimension.description}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-2xl tracking-tight">What held</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-6">
            {report.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl tracking-tight">What to change</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-6">
            {report.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl bg-primary px-5 py-5 text-primary-foreground">
        <h2 className="text-2xl tracking-tight">Next round</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/80">
          {report.nextPractice}
        </p>
        <Button
          variant="secondary"
          className="mt-4 h-10"
          nativeButton={false}
          render={
            <Link
              href={`/practice?track=${session.config.track}&topic=${session.config.topic}`}
            />
          }
        >
          Practice this gap
        </Button>
      </section>

      <section className="flex flex-col">
        <h2 className="text-2xl tracking-tight">Question by question</h2>
        <div className="mt-4 divide-y divide-border">
          {session.turns.map((turn, index) => (
            <QuestionDebrief
              key={`${turn.questionId}-${index}`}
              index={index}
              turn={turn}
              prompts={session.prompts}
            />
          ))}
        </div>
      </section>
    </article>
  );
}

function DebriefRetry({ session }: { session: Session }) {
  const store = useSessions();
  const coach = useCoachMode();
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");

  if (!coach.ready || coach.mode !== "ai") {
    return (
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        The round summary was not written. The scores and the per-answer notes are saved.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        className="h-10"
        disabled={writing}
        onClick={() => {
          setWriting(true);
          setMessage("");
          void requestDebrief(session)
            .then((written) => {
              if (!written || !session.report) {
                setMessage("The model did not write a round summary. The scores and answers are saved.");
                return;
              }
              const next = {
                ...session,
                report: { ...session.report, coach: written },
              };
              delete next.coachNotice;
              store.replace(next);
            })
            .catch((error: unknown) => {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "The model did not write a round summary. The scores and answers are saved.",
              );
            })
            .finally(() => setWriting(false));
        }}
      >
        {writing ? "Writing the debrief…" : "Write the round summary"}
      </Button>
      {message ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function FeedbackList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function QuestionDebrief({
  index,
  turn,
  prompts,
}: {
  index: number;
  turn: Session["turns"][number];
  prompts?: Session["prompts"];
}) {
  const question = prompts?.[turn.questionId] ?? getQuestion(turn.questionId);
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span className="text-left">
          <span className="text-xs text-muted-foreground">Prompt {index + 1}</span>
          <span className="mt-1 block font-medium leading-6">{turn.prompt}</span>
        </span>
        <span className="text-right">
          <span className="block font-heading text-3xl tabular-nums">{turn.score.overall}</span>
          <span className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {turn.coach?.source === "ai" ? "Model coach" : "Local Coach"}
          </span>
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-4 text-sm leading-6">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            What you said
          </p>
          <p className="mt-2 whitespace-pre-wrap">{turn.answer}</p>
          {turn.followUpPrompt ? (
            <>
              <p className="mt-4 font-medium">{turn.followUpPrompt}</p>
              <p className="mt-2 whitespace-pre-wrap">
                {turn.followUpAnswer || "No follow-up answer."}
              </p>
            </>
          ) : null}
        </div>
        {turn.coach ? (
          <div className="grid gap-4">
            <FeedbackList label="What held" items={turn.coach.strengths} />
            <FeedbackList label="What to change" items={turn.coach.improvements} />
            <FeedbackList label="Try next" items={turn.coach.tips} />
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                A stronger answer
              </p>
              <p className="mt-2 whitespace-pre-wrap">{turn.coach.sampleAnswer}</p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {turn.score.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {question ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {question.signals.map((signal) => {
                const hit = turn.score.hitSignalIds.includes(signal.id);
                return (
                  <Badge key={signal.id} variant={hit ? "secondary" : "outline"}>
                    {hit ? "Hit" : "Missed"} · {signal.label}
                  </Badge>
                );
              })}
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                A stronger shape
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {question.outline.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}
