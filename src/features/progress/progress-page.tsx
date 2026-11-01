"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { SessionRow } from "@/components/session-row";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { performanceSnapshot } from "@/lib/career/analytics";
import { scoreBand } from "@/lib/catalog";
import type { Session, Track } from "@/lib/domain";
import { formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | Track;

export function ProgressPage() {
  const store = useSessions();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const active = store.sessions.filter(
    (session) =>
      session.status === "active" &&
      (filter === "all" || session.config.track === filter),
  );
  const completed = useMemo(
    () =>
      store.sessions.filter(
        (session) =>
          session.status === "completed" &&
          session.report &&
          (filter === "all" || session.config.track === filter),
      ),
    [store.sessions, filter],
  );
  const chart = [...completed]
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(-12);

  if (store.status === "loading") {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  }
  if (store.status === "error") {
    return <StorageError message={store.message} onReset={store.clear} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <PageIntro
          kicker="Progress"
          title="The pattern across rounds."
          lede="Scores are comparable because every round uses the same five dimensions. A higher number means the signals were actually in the answer."
        />
        <Button
          variant="outline"
          disabled={store.sessions.length === 0}
          onClick={() => setConfirmClear(true)}
        >
          Clear history
        </Button>
      </div>

      <Analytics sessions={store.sessions} />

      <Tabs
        value={filter}
        onValueChange={(value) => {
          if (value === "all" || value === "technical" || value === "hr") {
            setFilter(value);
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="hr">HR</TabsTrigger>
        </TabsList>
      </Tabs>

      {active.length > 0 ? (
        <section>
          <h2 className="text-2xl tracking-tight">Still open</h2>
          <div className="mt-2">
            {active.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length === 0 ? (
        <div className="rounded-2xl bg-card px-5 py-8 ring-1 ring-foreground/10">
          <h2 className="text-3xl tracking-tight">No finished rounds in this view.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            An open round does not land here until you close it. Start one, or read the sample debrief from the studio.
          </p>
          <Button className="mt-5 h-10" nativeButton={false} render={<Link href="/practice" />}>
            Start a round
          </Button>
        </div>
      ) : (
        <>
          <section className="rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/10">
            <h2 className="px-1 text-2xl tracking-tight">Last {chart.length}</h2>
            <div className="mt-5 flex h-40 items-end gap-2">
              {chart.map((session) => (
                <ChartBar key={session.id} session={session} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-2xl tracking-tight">History</h2>
            <div className="mt-2">
              {completed.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          </section>
        </>
      )}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear every round on this browser?</DialogTitle>
            <DialogDescription>
              This deletes active rounds and debriefs stored here. It cannot be undone, and it does not affect any other device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Keep them
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                store.clear();
                setConfirmClear(false);
              }}
            >
              Clear history
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Analytics({ sessions }: { sessions: Session[] }) {
  const snapshot = performanceSnapshot(sessions);
  if (snapshot.rounds === 0) return null;
  const delta =
    snapshot.recentAverage !== null && snapshot.previousAverage !== null
      ? snapshot.recentAverage - snapshot.previousAverage
      : null;
  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-px overflow-hidden rounded-2xl bg-border/80 ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="All rounds, mixed sources" value={snapshot.overall} detail={`${snapshot.rounds} completed`} />
        <Metric label={snapshot.technical.label} value={snapshot.technical.average} detail={`${snapshot.technical.count} rounds`} />
        <Metric label={snapshot.hr.label} value={snapshot.hr.average} detail={`${snapshot.hr.count} rounds`} />
        <Metric
          label="Recent vs earlier"
          value={delta}
          detail={
            snapshot.previousAverage === null
              ? "Need more than five rounds to compare."
              : `Last five ${snapshot.recentAverage} · previous five ${snapshot.previousAverage}`
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
          <h2 className="text-2xl tracking-tight">Evaluation source</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Model coach and Local Coach are counted separately. A round can contain both. The mixed overall above is not a single exam.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-muted-foreground">Model coach answers</dt>
              <dd className="font-heading text-3xl tabular-nums">{snapshot.model.average ?? "—"}</dd>
              <dd className="text-xs text-muted-foreground">{snapshot.model.count} answers</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Local Coach answers</dt>
              <dd className="font-heading text-3xl tabular-nums">{snapshot.local.average ?? "—"}</dd>
              <dd className="text-xs text-muted-foreground">{snapshot.local.count} answers</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
          <h2 className="text-2xl tracking-tight">Skill progress</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {snapshot.topics.length === 0 ? <li className="text-sm text-muted-foreground">No topic averages yet.</li> : snapshot.topics.map((topic) => (
              <li key={topic.topic} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{topic.label}</span>
                <span className="tabular-nums text-muted-foreground">{topic.average} · {topic.count}</span>
              </li>
            ))}
          </ul>
          {snapshot.recommendations[0] ? <p className="mt-4 text-sm leading-6">{snapshot.recommendations[0]}</p> : null}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | null; detail: string }) {
  return (
    <div className="bg-card px-4 py-4">
      <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-heading text-3xl tabular-nums">{value === null ? "—" : value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function ChartBar({ session }: { session: Session }) {
  const score = session.report?.overall ?? 0;
  const band = scoreBand(score);
  return (
    <Link
      href={`/report/${session.id}`}
      className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
      title={`${score} · ${formatWhen(session.updatedAt)}`}
    >
      <span className="text-center text-[10px] text-muted-foreground tabular-nums">
        {score}
      </span>
      <span className="relative block h-28 w-full">
        <span
          className={cn("absolute inset-x-0 bottom-0 rounded-t-md", {
            "bg-score-strong": band === "strong",
            "bg-score-solid": band === "solid",
            "bg-score-developing": band === "developing",
            "bg-score-thin": band === "thin",
          })}
          style={{ height: `${Math.max(8, score)}%` }}
        />
      </span>
    </Link>
  );
}
