"use client";

import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { useCareer } from "@/components/shell/career-store";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { buildRoadmap } from "@/lib/career/roadmap";
import { useClientNow } from "@/lib/client-clock";

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
  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        kicker="Learning roadmap"
        title="What to practice from the rounds already saved."
        lede="Goals come from weak topics and dimensions on this device. Checking a task only marks your own list. A completed round can also finish today's topic goal."
      />
      {store.sessions.filter((session) => session.status === "completed").length === 0 ? (
        <div className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
          <p className="text-sm leading-6">No scored round yet, so the roadmap starts from a general backend or behavioral goal.</p>
          <Button className="mt-4 h-10" nativeButton={false} render={<Link href="/practice" />}>
            Start a question interview
          </Button>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">{done} of {tasks.length} tasks done.</p>
      <ul className="flex flex-col gap-3">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-2xl bg-card px-5 py-4 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.16em] text-copper uppercase">{task.horizon}</p>
                <h2 className="mt-1 text-xl tracking-tight">{task.title}</h2>
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
    </div>
  );
}
