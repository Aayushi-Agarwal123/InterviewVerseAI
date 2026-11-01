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
import { parseProfile, type CandidateProfile, type DurationMinutes, type InterviewType } from "@/lib/career/profile";
import type { InterviewPlan } from "@/lib/career/plan";
import type { Difficulty } from "@/lib/domain";

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

export function PersonalizedPage() {
  const store = useSessions();
  const career = useCareer();
  const coach = useCoachMode();
  const router = useRouter();
  const [draft, setDraft] = useState<CandidateProfile>(EMPTY);
  const [skillText, setSkillText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!career.ready || hydrated || !career.data.profile) return;
    setDraft(career.data.profile);
    setSkillText(career.data.profile.skills.join(", "));
    setHydrated(true);
  }, [career.ready, career.data.profile, hydrated]);

  if (store.status === "loading") return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  if (store.status === "error") return <StorageError message={store.message} onReset={store.clear} />;

  async function start() {
    const parsed = parseProfile({ ...draft, skills: skillText.split(",").map((item) => item.trim()) });
    if (!parsed.ok) {
      setError(parsed.error);
      setNotice("");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/career", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "personalize", profile: parsed.value }),
      });
      const body = (await response.json().catch(() => null)) as InterviewPlan & { error?: string; notice?: string };
      if (!response.ok || !body?.questionIds) {
        setError(body?.error ?? "The personalized round could not be prepared.");
        return;
      }
      career.saveProfile(parsed.value);
      const session = store.create(body.sessionConfig, {
        questionIds: body.questionIds,
        standbyIds: body.standbyIds,
        prompts: body.prompts ?? undefined,
        promptNotes: body.promptNotes,
        kind: "personalized",
        durationMinutes: body.durationMinutes,
        planSource: body.source,
        profileName: body.profileName,
      });
      if (!session) {
        setError("This browser could not store the round.");
        return;
      }
      setNotice(body.notice ?? (body.source === "gemini" ? "Gemini wrote this round." : "The question bank was matched to the profile."));
      router.push(`/interview/${session.id}`);
    } catch {
      setError("The career service could not be reached. Nothing was sent to a model.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        kicker="Personalized interview"
        title="A round built from the profile you type."
        lede="Gemini writes the questions when it is configured. Otherwise the question bank is filtered to the role, skills, and interview type. One prompt at a time, then the same scoring and debrief."
      />
      <p className="text-sm text-muted-foreground">
        {coach.ready ? coach.label : "Checking the coach."}{" "}
        {coach.provider === "gemini" && coach.mode === "ai"
          ? "A configured Gemini key can write this round."
          : "This server will stay on the local question bank."}
      </p>
      <form
        className="grid gap-4 rounded-2xl bg-card px-5 py-5 ring-1 ring-foreground/10 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <Field label="Name" id="name">
          <Input id="name" value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 h-10 bg-background" required />
        </Field>
        <Field label="Qualification" id="qualification">
          <Input id="qualification" value={draft.qualification} maxLength={80} onChange={(event) => setDraft({ ...draft, qualification: event.target.value })} className="mt-2 h-10 bg-background" required />
        </Field>
        <Field label="College or university, optional" id="college">
          <Input id="college" value={draft.college} maxLength={80} onChange={(event) => setDraft({ ...draft, college: event.target.value })} className="mt-2 h-10 bg-background" />
        </Field>
        <Field label="Target role" id="role">
          <Input id="role" value={draft.role} maxLength={80} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="mt-2 h-10 bg-background" required />
        </Field>
        <Field label="Target company, optional" id="company">
          <Input id="company" value={draft.company} maxLength={80} onChange={(event) => setDraft({ ...draft, company: event.target.value })} className="mt-2 h-10 bg-background" />
        </Field>
        <Field label="Skills, separated by commas" id="skills">
          <Input id="skills" value={skillText} onChange={(event) => setSkillText(event.target.value)} className="mt-2 h-10 bg-background" placeholder="React, Node.js, SQL" required />
        </Field>
        <Field label="Experience" id="experience">
          <select
            id="experience"
            className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={draft.experience}
            onChange={(event) => setDraft({ ...draft, experience: event.target.value === "experienced" ? "experienced" : "fresher", years: event.target.value === "fresher" ? 0 : draft.years })}
          >
            <option value="fresher">Fresher</option>
            <option value="experienced">Experienced</option>
          </select>
        </Field>
        <Field label="Years, if experienced" id="years">
          <Input id="years" type="number" min={0} max={40} value={draft.years} disabled={draft.experience === "fresher"} onChange={(event) => setDraft({ ...draft, years: Number(event.target.value) })} className="mt-2 h-10 bg-background" />
        </Field>
        <Field label="Interview type" id="type">
          <select id="type" className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={draft.interviewType} onChange={(event) => setDraft({ ...draft, interviewType: event.target.value as InterviewType })}>
            <option value="technical">Technical</option>
            <option value="hr">HR</option>
            <option value="mixed">Mixed</option>
          </select>
        </Field>
        <Field label="Difficulty" id="difficulty">
          <select id="difficulty" className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}>
            <option value="warmup">Warm-up</option>
            <option value="standard">Standard</option>
            <option value="pressure">Pressure</option>
          </select>
        </Field>
        <Field label="Duration" id="duration">
          <select id="duration" className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Number(event.target.value) as DurationMinutes })}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          {error ? <p className="mb-3 text-sm text-destructive" role="alert">{error}</p> : null}
          {notice ? <p className="mb-3 text-sm text-muted-foreground">{notice}</p> : null}
          <Button type="submit" className="h-10" disabled={pending}>
            {pending ? "Preparing the round…" : "Start personalized round"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
