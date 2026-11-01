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
  const [step, setStep] = useState(0);

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

  const steps = ["About you", "Target role", "The round"];

  function nextStep() {
    if (step === 0 && (draft.name.trim().length < 2 || draft.qualification.trim().length < 2)) {
      setError("Enter your name and qualification before continuing.");
      return;
    }
    if (step === 1 && (draft.role.trim().length < 2 || skillText.trim().length < 2)) {
      setError("Enter a target role and at least one skill.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, 2));
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageIntro
        kicker="Personalized interview"
        title="A round built from the profile you type."
        lede="Gemini writes the questions when it is configured. Otherwise the question bank is filtered to the role, skills, and interview type."
      />
      <p className="text-sm text-muted-foreground">
        {coach.ready ? coach.label : "Checking the coach."}{" "}
        {coach.provider === "gemini" && coach.mode === "ai"
          ? "A configured Gemini key can write this round."
          : "This server will stay on the local question bank."}
      </p>
      <ol className="grid grid-cols-3 gap-2" aria-label="Profile steps">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              className={`w-full rounded-2xl px-3 py-3 text-left ring-1 ${index === step ? "bg-primary text-primary-foreground ring-primary" : index < step ? "bg-secondary text-secondary-foreground ring-transparent" : "bg-card text-muted-foreground ring-foreground/10"}`}
              onClick={() => setStep(index)}
            >
              <span className="block text-[10px] font-semibold tracking-[0.14em] uppercase">Step {index + 1}</span>
              <span className="mt-1 block text-sm font-medium">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <form
        className="panel grid gap-4 px-5 py-5 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 2) nextStep();
          else void start();
        }}
      >
        {step === 0 ? (
          <>
            <Field label="Name" id="name">
              <Input id="name" value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2" required />
            </Field>
            <Field label="Qualification" id="qualification">
              <Input id="qualification" value={draft.qualification} maxLength={80} onChange={(event) => setDraft({ ...draft, qualification: event.target.value })} className="mt-2" required />
            </Field>
            <Field label="College or university, optional" id="college" className="md:col-span-2">
              <Input id="college" value={draft.college} maxLength={80} onChange={(event) => setDraft({ ...draft, college: event.target.value })} className="mt-2" />
            </Field>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Field label="Target role" id="role">
              <Input id="role" value={draft.role} maxLength={80} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="mt-2" required />
            </Field>
            <Field label="Target company, optional" id="company">
              <Input id="company" value={draft.company} maxLength={80} onChange={(event) => setDraft({ ...draft, company: event.target.value })} className="mt-2" />
            </Field>
            <Field label="Skills, separated by commas" id="skills">
              <Input id="skills" value={skillText} onChange={(event) => setSkillText(event.target.value)} className="mt-2 md:col-span-2" placeholder="React, Node.js, SQL" required />
            </Field>
            <Field label="Experience" id="experience">
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
            </Field>
            <Field label="Years, if experienced" id="years">
              <Input id="years" type="number" min={0} max={40} value={draft.years} disabled={draft.experience === "fresher"} onChange={(event) => setDraft({ ...draft, years: Number(event.target.value) })} className="mt-2" />
            </Field>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <ChoiceGroup
              label="Interview type"
              value={draft.interviewType}
              options={[
                ["technical", "Technical"],
                ["hr", "HR"],
                ["mixed", "Mixed"],
              ]}
              onChange={(value) => setDraft({ ...draft, interviewType: value as InterviewType })}
            />
            <ChoiceGroup
              label="Difficulty"
              value={draft.difficulty}
              options={[
                ["warmup", "Warm-up"],
                ["standard", "Standard"],
                ["pressure", "Pressure"],
              ]}
              onChange={(value) => setDraft({ ...draft, difficulty: value as Difficulty })}
            />
            <ChoiceGroup
              label="Duration"
              value={String(draft.durationMinutes)}
              options={[
                ["15", "15 minutes"],
                ["30", "30 minutes"],
                ["45", "45 minutes"],
              ]}
              onChange={(value) => setDraft({ ...draft, durationMinutes: Number(value) as DurationMinutes })}
            />
          </>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          {step > 0 ? (
            <Button type="button" variant="outline" className="h-10" onClick={() => setStep((current) => current - 1)}>
              Back
            </Button>
          ) : null}
          <Button type="submit" className="h-10" disabled={pending}>
            {step < 2 ? "Continue" : pending ? "Preparing the round…" : "Start personalized round"}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive md:col-span-2" role="alert">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground md:col-span-2">{notice}</p> : null}
      </form>
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="md:col-span-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            className={`rounded-full px-4 py-2 text-sm ring-1 ${value === option ? "bg-primary text-primary-foreground ring-primary" : "bg-background ring-foreground/10"}`}
            onClick={() => onChange(option)}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
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
