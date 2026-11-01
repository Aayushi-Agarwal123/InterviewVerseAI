"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Mic, MessagesSquare, Sparkles, Video } from "lucide-react";
import { ScoreMeter } from "@/components/score-meter";
import { SessionRow } from "@/components/session-row";
import { useCareer } from "@/components/shell/career-store";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { DIMENSION_COPY, personaFor } from "@/lib/catalog";
import type { CandidateProfile } from "@/lib/career/profile";
import type { Dimension, Session } from "@/lib/domain";
import { emptyDimensions } from "@/lib/domain";
import { currentStreak } from "@/lib/format";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function profileCompletion(profile: CandidateProfile | null): { percent: number; missing: string[] } {
  const checks: [string, boolean][] = profile
    ? [
        ["Name", profile.name.trim().length >= 2],
        ["Qualification", profile.qualification.trim().length >= 2],
        ["Role", profile.role.trim().length >= 2],
        ["Skills", profile.skills.length > 0],
        ["College", profile.college.trim().length > 0],
        ["Company", profile.company.trim().length > 0],
      ]
    : [
        ["Name", false],
        ["Role", false],
        ["Skills", false],
      ];
  const filled = checks.filter(([, ok]) => ok).length;
  return {
    percent: Math.round((filled / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}

export function StudioPage() {
  const store = useSessions();
  const career = useCareer();
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
  const profile = career.data.profile;
  const completion = profileCompletion(profile);
  const modelAnswers = completed.reduce(
    (sum, session) => sum + session.turns.filter((turn) => turn.coach?.source === "ai").length,
    0,
  );
  const localAnswers = completed.reduce(
    (sum, session) => sum + session.turns.filter((turn) => turn.coach?.source !== "ai").length,
    0,
  );
  const arun = personaFor("technical");
  const leela = personaFor("hr");

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground shadow-card md:px-8 md:py-8">
          <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10" />
          <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-foreground/70 uppercase">Studio</p>
          <h1 className="mt-3 max-w-xl font-heading text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl">
            {profile?.name ? `${profile.name.split(" ")[0]}, practice the round before the real one.` : "Practice the round before the real one."}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-primary-foreground/80">
            Technical depth and HR judgment, scored on the same five dimensions. History stays in this browser.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="h-10 bg-primary-foreground text-primary hover:bg-primary-foreground/90" nativeButton={false} render={<Link href="/avatar" />}>
              AI avatar interview
            </Button>
            <Button className="h-10 border-white/30 bg-transparent text-primary-foreground hover:bg-white/10" variant="outline" nativeButton={false} render={<Link href="/practice" />}>
              Question interview
            </Button>
            <Button className="h-10 border-white/30 bg-transparent text-primary-foreground hover:bg-white/10" variant="outline" nativeButton={false} render={<Link href="/personalized" />}>
              Personalized
            </Button>
          </div>
        </div>
        <div className="panel flex flex-col justify-between p-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-sage uppercase">Profile</p>
            <p className="mt-3 font-heading text-4xl tabular-nums">{completion.percent}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile ? `${profile.role || "Role not set"} · ${profile.skills.length} skills` : "No profile saved yet."}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
              <div className="h-full rounded-full bg-primary" style={{ width: `${completion.percent}%` }} />
            </div>
            {completion.missing.length > 0 ? (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Still open: {completion.missing.join(", ")}.</p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">The saved profile has the fields this studio asks for.</p>
            )}
          </div>
          <Button className="mt-5 h-10" variant="outline" nativeButton={false} render={<Link href="/personalized" />}>
            {profile ? "Edit profile" : "Build a profile"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]" aria-label="Start an interview">
        <Link href="/avatar" className="group flex flex-col justify-between rounded-3xl bg-primary px-6 py-6 text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5">
          <span>
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-foreground/15">
              <Video className="size-5" aria-hidden />
            </span>
            <p className="mt-5 text-[10px] font-semibold tracking-[0.16em] text-primary-foreground/70 uppercase">Person to person</p>
            <h2 className="mt-1 font-heading text-3xl tracking-tight">AI avatar interview</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-primary-foreground/80">
              Arun Mehta or Leela Kapoor speaks the question. You answer on the microphone. The next question follows what you just said.
            </p>
          </span>
          <span className="mt-6 text-sm font-medium">Open the interview room</span>
        </Link>
        <div className="grid gap-3">
          <QuickAction href="/practice" icon={MessagesSquare} kicker="Question bank" title="Question interview" body="One prompt at a time, with the timer, follow-up rule, and debrief." />
          <QuickAction href="/personalized" icon={Sparkles} kicker="From your profile" title="Personalized interview" body="Gemini writes the round when configured. Otherwise the bank is matched to your skills." />
          <QuickAction href="/voice" icon={Mic} kicker="Browser speech" title="Voice interview" body="Speak the question and transcribe the microphone when the browser allows it." />
        </div>
      </section>

      {active ? <ActiveBanner session={active} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="More studio tools">
        <ToolLink href="/roadmap" title="Roadmap" body="Daily and weekly goals from weak topics already saved here." />
        <ToolLink href="/arena" title="Coding arena" body="JavaScript runs locally. Other languages are saved and not executed." />
        <ToolLink href="/jobs" title="Job match" body="Paste a description, type your skills, and see the gap. No resume." />
        <ToolLink href="/mentor" title="Mentor" body="One next action from the profile and the rounds on this device." />
        <ToolLink href="/builder" title="Project builder" body="Four starter stacks, Gemini source when configured, and a ZIP." />
        <ToolLink href="/progress" title="Progress" body="Local Coach and model-coach scores stay in separate counts." />
      </section>

      <section aria-label="Interviewers">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-heading text-3xl tracking-tight">The interviewers</h2>
          <p className="hidden text-sm text-muted-foreground sm:block">Same people, same rubric, every round.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InterviewerCard href="/practice?track=technical" initials={arun.initials} name={arun.name} role={arun.role} line={arun.line} />
          <InterviewerCard href="/practice?track=hr" initials={leela.initials} name={leela.name} role={leela.role} line={leela.line} />
        </div>
      </section>

      {completed.length === 0 ? (
        <EmptyActivity
          onSample={() => {
            const sample = store.addSample();
            if (sample) router.push(`/report/${sample.id}`);
          }}
        />
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Completed rounds" value={String(completed.length)} />
            <Stat label="Average" value={String(average(scores))} />
            <Stat label="Best" value={String(Math.max(...scores))} />
            <Stat label="Streak" value={streak === 1 ? "1 day" : `${streak} days`} />
          </dl>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="panel px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-2xl tracking-tight">Performance</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Model coach answers {modelAnswers}. Local Coach answers {localAnswers}.
                  </p>
                </div>
                <Code2 className="size-4 text-sage" aria-hidden />
              </div>
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
            <div className="panel px-3 py-5">
              <div className="mb-2 flex items-baseline justify-between px-2">
                <h2 className="font-heading text-2xl tracking-tight">Recent rounds</h2>
                <Link href="/progress" className="text-sm text-sage hover:text-foreground">
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

function QuickAction({
  href,
  icon: Icon,
  kicker,
  title,
  body,
}: {
  href: string;
  icon: typeof Mic;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="panel group px-5 py-5 transition-transform hover:-translate-y-0.5">
      <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="mt-4 text-[10px] font-semibold tracking-[0.16em] text-sage uppercase">{kicker}</p>
      <h2 className="mt-1 font-heading text-2xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </Link>
  );
}

function ToolLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-card/70 px-4 py-4 ring-1 ring-foreground/8 transition-colors hover:bg-card">
      <h2 className="font-heading text-xl tracking-tight">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-4">
      <dt className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-2 font-heading text-3xl tabular-nums">{value}</dd>
    </div>
  );
}

function InterviewerCard({
  href,
  initials,
  name,
  role,
  line,
}: {
  href: string;
  initials: string;
  name: string;
  role: string;
  line: string;
}) {
  return (
    <Link href={href} className="panel flex gap-4 px-5 py-5 transition-colors hover:bg-secondary/40">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary font-heading text-lg text-primary-foreground">
        {initials}
      </span>
      <span>
        <span className="block font-heading text-2xl tracking-tight">{name}</span>
        <span className="mt-0.5 block text-sm text-sage">{role}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{line}</span>
      </span>
    </Link>
  );
}

function ActiveBanner({ session }: { session: Session }) {
  return (
    <div className="panel flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6">
        <span className="font-medium">A round is still open.</span>{" "}
        <span className="text-muted-foreground">
          {session.config.topic.replace("-", " ")} · question {session.index + 1} of {session.questionIds.length}
        </span>
      </p>
      <Button variant="outline" className="h-9" nativeButton={false} render={<Link href={session.kind === "avatar" ? `/avatar/${session.id}` : `/interview/${session.id}`} />}>
        Resume
      </Button>
    </div>
  );
}

function EmptyActivity({ onSample }: { onSample: () => void }) {
  return (
    <div className="panel px-5 py-6">
      <h2 className="font-heading text-3xl tracking-tight">No scored rounds yet</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Activity, averages, and recent rounds appear after a debrief is saved in this browser. Nothing here is a sample number.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button className="h-10" nativeButton={false} render={<Link href="/practice" />}>
          Start a question interview
        </Button>
        <button
          type="button"
          onClick={onSample}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Read a sample debrief
        </button>
      </div>
    </div>
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
