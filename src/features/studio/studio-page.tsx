"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { ScoreMeter } from "@/components/score-meter";
import { SessionRow } from "@/components/session-row";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { DIMENSION_COPY } from "@/lib/catalog";
import type { Dimension, Session } from "@/lib/domain";
import { emptyDimensions } from "@/lib/domain";
import { currentStreak } from "@/lib/format";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function StudioPage() {
  const store = useSessions();
  const router = useRouter();

  if (store.status === "loading") return <StudioSkeleton />;
  if (store.status === "error") {
    return <StorageError message={store.message} onReset={store.clear} />;
  }

  const completed = store.sessions.filter(
    (session) => session.status === "completed" && session.report,
  );
  const active = store.sessions.find((session) => session.status === "active");
  const scores = completed.map((session) => session.report?.overall ?? 0);
  const dimensions = emptyDimensions();
  for (const dimension of Object.keys(dimensions) as Dimension[]) {
    dimensions[dimension] = average(
      completed.map((session) => session.report?.dimensions[dimension] ?? 0),
    );
  }
  const streak = currentStreak(completed.map((session) => session.updatedAt));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <PageIntro
          kicker="Studio"
          title="Practice the round before the real one."
          lede="Technical depth and HR judgment, scored on the same five dimensions every time you answer. The coach lives in this browser."
        />
        <Button
          className="h-10 px-4"
          nativeButton={false}
          render={<Link href="/practice" />}
        >
          Start a round
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Studio modes">
        <ModeCard href="/practice" kicker="Question bank" title="Technical or HR" body="One prompt at a time, with the existing timer, follow-up rule, and debrief." />
        <ModeCard href="/personalized" kicker="Profile" title="Personalized" body="Gemini writes the round when configured. Otherwise the bank is matched to your skills." />
        <ModeCard href="/voice" kicker="Browser speech" title="Voice" body="Speak the question and transcribe the microphone when the browser allows it." />
        <ModeCard href="/roadmap" kicker="From your scores" title="Roadmap" body="Daily and weekly goals from the weak topics already saved here." />
        <ModeCard href="/arena" kicker="In the browser" title="Coding arena" body="Sample cases for original problems. JavaScript runs locally. The server does not." />
        <ModeCard href="/jobs" kicker="No resume" title="Job match" body="Paste a description, type your skills, and see the gap." />
        <ModeCard href="/mentor" kicker="Saved history" title="Mentor" body="One next action from the profile and the rounds on this device." />
        <ModeCard href="/builder" kicker="Separate download" title="Project builder" body="The four starter stacks, Gemini source when configured, and a ZIP." />
      </section>

      {active ? <ActiveBanner session={active} /> : null}

      {completed.length === 0 ? (
        <EmptyFloor
          onSample={() => {
            const sample = store.addSample();
            if (sample) router.push(`/report/${sample.id}`);
          }}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border/80 ring-1 ring-foreground/10 md:grid-cols-4">
            <Stat label="Rounds" value={String(completed.length)} />
            <Stat label="Average" value={String(average(scores))} />
            <Stat label="Best" value={String(Math.max(...scores))} />
            <Stat label="Streak" value={streak === 1 ? "1 day" : `${streak} days`} />
          </dl>
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
              <h2 className="text-2xl tracking-tight">Where the rounds land</h2>
              <div className="mt-5 flex flex-col gap-4">
                {DIMENSION_COPY.map((dimension) => (
                  <ScoreMeter
                    key={dimension.id}
                    label={dimension.label}
                    score={dimensions[dimension.id]}
                    detail={dimension.description}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-2xl tracking-tight">Recent</h2>
                <Link href="/progress" className="text-sm text-muted-foreground hover:text-foreground">
                  All rounds
                </Link>
              </div>
              <div className="flex flex-col">
                {store.sessions.slice(0, 5).map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ModeCard({ href, kicker, title, body }: { href: string; kicker: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10 transition-colors hover:bg-card/80">
      <p className="text-[10px] font-medium tracking-[0.16em] text-copper uppercase">{kicker}</p>
      <h2 className="mt-2 text-xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-4">
      <dt className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-2 font-heading text-3xl tabular-nums">{value}</dd>
    </div>
  );
}

function ActiveBanner({ session }: { session: Session }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6">
        <span className="font-medium">A round is still open.</span>{" "}
        <span className="text-muted-foreground">
          {session.config.topic.replace("-", " ")} · question {session.index + 1} of{" "}
          {session.questionIds.length}
        </span>
      </p>
      <Button
        variant="outline"
        className="h-9"
        nativeButton={false}
        render={<Link href={`/interview/${session.id}`} />}
      >
        Resume
      </Button>
    </div>
  );
}

function EmptyFloor({ onSample }: { onSample: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FloorCard
          href="/practice?track=technical"
          kicker="Technical"
          title="Arun Mehta is free."
          body="Data structures, systems, frontend, or backend. He follows up when a signal is missing."
        />
        <FloorCard
          href="/practice?track=hr"
          kicker="HR"
          title="Leela Kapoor is listening."
          body="Behavioral, leadership, conflict, and the career story. She wants a result, not a mood."
        />
      </div>
      <button
        type="button"
        onClick={onSample}
        className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Read a sample debrief
      </button>
    </div>
  );
}

function FloorCard({
  href,
  kicker,
  title,
  body,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10 transition-colors hover:ring-foreground/20"
    >
      <p className="text-xs font-medium tracking-[0.16em] text-copper uppercase">
        {kicker}
      </p>
      <h2 className="mt-2 text-3xl tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </Link>
  );
}

function StudioSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-12 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
