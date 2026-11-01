"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { useCareer } from "@/components/shell/career-store";
import { useCoachMode } from "@/components/shell/coach-mark";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { avatarBudget, type AvatarTurnResult } from "@/lib/avatar/engine";
import type { AvatarInterviewer } from "@/lib/avatar/provider";
import { ILLUSTRATED_AVATAR } from "@/lib/avatar/provider";
import { planFromBank } from "@/lib/career/plan";
import { parseProfile, type CandidateProfile, type DurationMinutes, type InterviewType } from "@/lib/career/profile";
import type { Difficulty } from "@/lib/domain";
import { InterviewerAvatar } from "@/features/avatar/interviewer-avatar";

const EMPTY: CandidateProfile = {
  name: "",
  qualification: "",
  college: "",
  skills: [],
  experience: "fresher",
  years: 0,
  role: "",
  company: "",
  interviewType: "technical",
  difficulty: "standard",
  durationMinutes: 30,
};

export function AvatarLobby() {
  const store = useSessions();
  const career = useCareer();
  const coach = useCoachMode();
  const router = useRouter();
  const [draft, setDraft] = useState<CandidateProfile>(EMPTY);
  const [skillText, setSkillText] = useState("");
  const [interviewer, setInterviewer] = useState<AvatarInterviewer>("arun");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!career.ready || hydrated || !career.data.profile) return;
    setDraft(career.data.profile);
    setSkillText(career.data.profile.skills.join(", "));
    setInterviewer(career.data.profile.interviewType === "hr" ? "leela" : career.data.profile.interviewType === "mixed" ? "mixed" : "arun");
    setHydrated(true);
  }, [career.ready, career.data.profile, hydrated]);

  if (store.status === "loading" || !career.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  }
  if (store.status === "error") return <StorageError message={store.message} onReset={store.clear} />;

  const type: InterviewType = interviewer === "leela" ? "hr" : interviewer === "mixed" ? "mixed" : "technical";
  const preview = interviewer === "leela" ? "leela" : "arun";

  async function start() {
    const parsed = parseProfile({ ...draft, interviewType: type, skills: skillText.split(",").map((item) => item.trim()) });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/career", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "avatar-next", profile: parsed.value, interviewer, askedIds: [], history: [] }),
      });
      const body = (await response.json().catch(() => null)) as AvatarTurnResult & { error?: string };
      if (!response.ok || !body?.question?.id) {
        setError(body?.error ?? "The interviewer could not open the round.");
        return;
      }
      career.saveProfile(parsed.value);
      const base = planFromBank(parsed.value).sessionConfig;
      const session = store.create(
        {
          ...base,
          track: body.question.track,
          topic: body.question.topic,
          difficulty: parsed.value.difficulty,
          questionCount: avatarBudget(parsed.value),
          focus: parsed.value.skills.slice(0, 4).join(", "),
        },
        {
          questionIds: [body.question.id],
          prompts: { [body.question.id]: body.question },
          promptNotes: { [body.question.id]: body.notice, "avatar-interviewer": interviewer },
          kind: "avatar",
          durationMinutes: parsed.value.durationMinutes,
          planSource: body.source === "gemini" ? "gemini" : "bank",
          profileName: parsed.value.name,
        },
      );
      if (!session) {
        setError("This browser could not store the round.");
        return;
      }
      router.push(`/avatar/${session.id}`);
    } catch {
      setError("The career service could not be reached. Nothing was sent to a model.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-6">
        <PageIntro
          kicker="AI avatar interview"
          title="Sit across from the interviewer."
          lede="Arun or Leela speaks the question. You answer on the microphone. The next question follows what you just said. This is separate from the typed round and the browser-speech question bank."
        />
        <p className="text-sm text-muted-foreground">
          {coach.ready ? coach.label : "Checking the coach."}{" "}
          {coach.provider === "gemini" && coach.mode === "ai"
            ? "A configured Gemini key can write the questions and score the answers."
            : "Questions and scores stay on the local interviewer until Gemini is configured."}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <Choice pressed={interviewer === "arun"} title="Arun Mehta" body="Technical round" onClick={() => setInterviewer("arun")} />
          <Choice pressed={interviewer === "leela"} title="Leela Kapoor" body="HR round" onClick={() => setInterviewer("leela")} />
          <Choice pressed={interviewer === "mixed"} title="Both" body="Mixed round, they alternate" onClick={() => setInterviewer("mixed")} />
        </div>
        <form
          className="panel grid gap-4 px-5 py-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void start();
          }}
        >
          <Field label="Name" id="avatar-name">
            <Input id="avatar-name" value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2" required />
          </Field>
          <Field label="Qualification" id="avatar-qualification">
            <Input id="avatar-qualification" value={draft.qualification} maxLength={80} onChange={(event) => setDraft({ ...draft, qualification: event.target.value })} className="mt-2" required />
          </Field>
          <Field label="Target role" id="avatar-role">
            <Input id="avatar-role" value={draft.role} maxLength={80} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="mt-2" required />
          </Field>
          <Field label="Target company, optional" id="avatar-company">
            <Input id="avatar-company" value={draft.company} maxLength={80} onChange={(event) => setDraft({ ...draft, company: event.target.value })} className="mt-2" />
          </Field>
          <Field label="Skills, separated by commas" id="avatar-skills" className="md:col-span-2">
            <Input id="avatar-skills" value={skillText} onChange={(event) => setSkillText(event.target.value)} className="mt-2" placeholder="React, Node.js, SQL" required />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium">Experience</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["fresher", "experienced"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={draft.experience === value}
                  className={`rounded-xl px-3 py-3 text-sm ring-1 ${draft.experience === value ? "bg-primary text-primary-foreground ring-primary" : "bg-background ring-foreground/10"}`}
                  onClick={() => setDraft({ ...draft, experience: value, years: value === "fresher" ? 0 : draft.years })}
                >
                  {value === "fresher" ? "Fresher" : "Experienced"}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Years, if experienced" id="avatar-years">
            <Input id="avatar-years" type="number" min={0} max={40} value={draft.years} disabled={draft.experience === "fresher"} onChange={(event) => setDraft({ ...draft, years: Number(event.target.value) })} className="mt-2" />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium">Difficulty</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["warmup", "standard", "pressure"] as Difficulty[]).map((value) => (
                <button key={value} type="button" aria-pressed={draft.difficulty === value} className={`rounded-full px-3 py-1.5 text-sm capitalize ring-1 ${draft.difficulty === value ? "bg-primary text-primary-foreground ring-primary" : "bg-background ring-foreground/10"}`} onClick={() => setDraft({ ...draft, difficulty: value })}>
                  {value === "warmup" ? "Warm-up" : value}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Duration</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {([15, 30, 45] as DurationMinutes[]).map((value) => (
                <button key={value} type="button" aria-pressed={draft.durationMinutes === value} className={`rounded-full px-3 py-1.5 text-sm ring-1 ${draft.durationMinutes === value ? "bg-primary text-primary-foreground ring-primary" : "bg-background ring-foreground/10"}`} onClick={() => setDraft({ ...draft, durationMinutes: value })}>
                  {value} min
                </button>
              ))}
            </div>
          </fieldset>
          {error ? <p className="text-sm text-destructive md:col-span-2" role="alert">{error}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" className="h-10" disabled={pending}>
              {pending ? "Opening the round…" : "Start avatar interview"}
            </Button>
          </div>
        </form>
      </div>
      <aside className="panel h-fit overflow-hidden bg-primary p-3 text-primary-foreground">
        <InterviewerAvatar who={preview} state="idle" />
        <p className="px-2 pt-3 text-sm leading-6 text-primary-foreground/80">{ILLUSTRATED_AVATAR.limitation}</p>
      </aside>
    </div>
  );
}

function Choice({ pressed, title, body, onClick }: { pressed: boolean; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={`rounded-2xl px-4 py-4 text-left ring-1 ${pressed ? "bg-primary text-primary-foreground ring-primary shadow-card" : "bg-card ring-foreground/10"}`}>
      <span className="block font-heading text-2xl tracking-tight">{title}</span>
      <span className="mt-1 block text-sm opacity-80">{body}</span>
    </button>
  );
}

function Field({ label, id, children, className }: { label: string; id: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
