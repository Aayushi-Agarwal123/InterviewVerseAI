"use client";

import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { useCareer } from "@/components/shell/career-store";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { buildRoadmap, type RoadmapTask } from "@/lib/career/roadmap";
import { useClientNow } from "@/lib/client-clock";

const HORIZONS: { id: RoadmapTask["horizon"]; title: string; copy: string }[] = [
  { id: "today", title: "Today", copy: "One focused task from the weakest saved topic." },
  { id: "week", title: "This week", copy: "Rounds and coding work for the current week." },
  { id: "skill", title: "Skill development", copy: "Longer work on dimensions and the skills in your profile." },
];

export function RoadmapPage() {
  const store = useSessions();
  const career = useCareer();
  const now = useClientNow();
  if (store.status === "loading" || !career.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  }
  if (store.status === "error") return <StorageError message={store.message} onReset={store.clear} />;
  const tasks = buildRoadmap(store.sessions, career.data.profile, career.data.manualTasks, now);
  const done = tasks.filter((task) => task.done).length;
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        kicker="Learning roadmap"
        title="What to practice from the rounds already saved."
        lede="Goals come from weak topics and dimensions on this device. Checking a task only marks your own list. A completed round can also finish today's topic goal."
      />
      <section className="panel px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-sage uppercase">Progress</p>
            <p className="mt-2 font-heading text-4xl tabular-nums">{done} of {tasks.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Tasks done from the saved rounds and your own checks.</p>
          </div>
          <p className="font-heading text-3xl text-primary tabular-nums">{percent}%</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Roadmap progress">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </section>
      {store.sessions.filter((session) => session.status === "completed").length === 0 ? (
        <div className="panel px-5 py-5">
          <p className="text-sm leading-6">No scored round yet, so the roadmap starts from a general backend or behavioral goal.</p>
          <Button className="mt-4 h-10" nativeButton={false} render={<Link href="/practice" />}>
            Start a question interview
          </Button>
        </div>
      ) : null}
      {HORIZONS.map((horizon) => {
        const items = tasks.filter((task) => task.horizon === horizon.id);
        if (items.length === 0) return null;
        return (
          <section key={horizon.id}>
            <h2 className="font-heading text-3xl tracking-tight">{horizon.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{horizon.copy}</p>
            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
              {items.map((task) => (
                <li key={task.id} className="panel px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-sage uppercase">{task.horizon}</p>
                      <h3 className="mt-1 font-heading text-2xl tracking-tight">{task.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.detail}</p>
                      {task.auto ? <p className="mt-2 text-xs text-muted-foreground">Marked from saved rounds.</p> : null}
                    </div>
                    <Button
                      variant={task.done ? "secondary" : "outline"}
                      aria-pressed={task.done}
                      onClick={() => career.toggleTask(task.id)}
                    >
                      {task.done ? "Done" : "Mark done"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
