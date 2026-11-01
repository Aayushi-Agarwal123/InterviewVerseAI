"use client";

import { useState } from "react";
import { PageIntro } from "@/components/page-intro";
import { useCareer } from "@/components/shell/career-store";
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
import { performanceSnapshot } from "@/lib/career/analytics";
import { buildRoadmap } from "@/lib/career/roadmap";
import { useClientNow } from "@/lib/client-clock";

export function MemoryPage() {
  const store = useSessions();
  const career = useCareer();
  const now = useClientNow();
  const [confirm, setConfirm] = useState<"rounds" | "learning" | "roadmap" | null>(null);
  if (store.status === "loading" || !career.ready) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  if (store.status === "error") return <StorageError message={store.message} onReset={store.clear} />;
  const snapshot = performanceSnapshot(store.sessions);
  const tasks = buildRoadmap(store.sessions, career.data.profile, career.data.manualTasks, now);
  const profile = career.data.profile;
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageIntro
        kicker="Interview memory"
        title="Only what this browser saved."
        lede="Scores, topics, roadmap checks, coding submissions, and mentor notes stay in local storage. Nothing here is a hidden profile on a server."
      />
      <section className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-2xl tracking-tight">Profile</h2>
        {profile ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Item label="Name" value={profile.name} />
            <Item label="Role" value={profile.role} />
            <Item label="Qualification" value={profile.qualification} />
            <Item label="College" value={profile.college || "Not provided"} />
            <Item label="Experience" value={profile.experience === "fresher" ? "Fresher" : `${profile.years} years`} />
            <Item label="Skills" value={profile.skills.join(", ")} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No profile yet. The personalized interview saves one when you start a round.</p>
        )}
      </section>
      <section className="rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10">
        <h2 className="text-2xl tracking-tight">What the rounds show</h2>
        <p className="mt-3 text-sm leading-6">
          {snapshot.rounds} completed rounds. Overall {snapshot.overall ?? "—"}. Strongest recent movement is listed on Progress.
          Weak topics: {snapshot.topics.slice().sort((a, b) => a.average - b.average).slice(0, 3).map((item) => `${item.label} ${item.average}`).join(", ") || "none yet"}.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Model coach answers: {snapshot.model.count}. Local Coach answers: {snapshot.local.count}. Roadmap tasks done: {tasks.filter((task) => task.done).length} of {tasks.length}.
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setConfirm("roadmap")}>Reset roadmap checks</Button>
        <Button variant="outline" onClick={() => setConfirm("learning")}>Clear learning data</Button>
        <Button variant="destructive" onClick={() => setConfirm("rounds")}>Clear interview history</Button>
      </div>
      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "rounds" ? "Clear interview history?" : confirm === "learning" ? "Clear learning data?" : "Reset roadmap checks?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "rounds"
                ? "Completed and active rounds in this browser are removed. The profile, roadmap, and coding history stay."
                : confirm === "learning"
                  ? "Profile, roadmap checks, mentor notes, job comparisons, and coding submissions are removed. Interview rounds stay."
                  : "Manual roadmap checks are cleared. Tasks that are already satisfied by saved rounds stay done."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (confirm === "rounds") store.clear();
                if (confirm === "learning") career.clearLearning();
                if (confirm === "roadmap") career.clearRoadmap();
                setConfirm(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
