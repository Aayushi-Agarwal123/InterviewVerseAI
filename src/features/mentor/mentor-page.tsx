"use client";

import { useState } from "react";
import { PageIntro } from "@/components/page-intro";
import { useCareer } from "@/components/shell/career-store";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localMentorReply, mentorBrief } from "@/lib/career/mentor";

export function MentorPage() {
  const store = useSessions();
  const career = useCareer();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  if (store.status === "loading" || !career.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  }
  if (store.status === "error") return <StorageError message={store.message} onReset={store.clear} />;

  const brief = mentorBrief(career.data.profile, store.sessions);

  async function ask() {
    const text = message.trim();
    if (text.length < 2) {
      setError("Ask something the mentor can act on.");
      return;
    }
    setPending(true);
    setError("");
    const now = new Date().toISOString();
    try {
      const response = await fetch("/api/career", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "mentor",
          message: text,
          profile: career.data.profile,
          sessions: store.sessions.slice(0, 12).map((session) => ({
            id: session.id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            questionStartedAt: session.questionStartedAt,
            config: session.config,
            questionIds: session.questionIds,
            index: session.index,
            phase: session.phase,
            active: session.active,
            draft: "",
            status: session.status,
            sample: session.sample,
            report: session.report,
            turns: session.turns.map((turn) => ({
              questionId: turn.questionId,
              prompt: turn.prompt.slice(0, 180),
              answer: "",
              hintUsed: turn.hintUsed,
              score: turn.score,
              coach: turn.coach ? { source: "ai" as const, strengths: [], improvements: [], tips: [], sampleAnswer: "" } : undefined,
            })),
          })),
        }),
      });
      const body = (await response.json().catch(() => null)) as { source?: "gemini" | "local"; text?: string; notice?: string; error?: string };
      if (!response.ok || !body?.text || (body.source !== "gemini" && body.source !== "local")) {
        const fallback = localMentorReply(text, brief);
        career.addMentor([
          { role: "user", text, source: "local", at: now },
          { role: "mentor", text: fallback, source: "local", at: now },
        ]);
        setNotice(body?.error ?? "The mentor service failed, so this reply stayed on the device.");
        setMessage("");
        return;
      }
      career.addMentor([
        { role: "user", text, source: body.source, at: now },
        { role: "mentor", text: body.text, source: body.source, at: now },
      ]);
      setNotice(body.notice ?? (body.source === "gemini" ? "Gemini wrote this reply from the saved brief." : "Local mentor. Gemini did not write it."));
      setMessage("");
    } catch {
      const fallback = localMentorReply(text, brief);
      career.addMentor([
        { role: "user", text, source: "local", at: now },
        { role: "mentor", text: fallback, source: "local", at: now },
      ]);
      setNotice("The mentor service could not be reached. This reply stayed on the device.");
      setMessage("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageIntro
        kicker="Mentor"
        title={`Preparing for ${brief.role}.`}
        lede={`${brief.name === "there" ? "Save a profile in Personalized to name the role." : `${brief.name}, the weakest saved area is ${brief.weakest}.`} The mentor only uses rounds and profile fields stored in this browser.`}
      />
      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="Saved average" value={brief.overall === null ? "—" : String(brief.overall)} />
        <Stat label="Model answers" value={String(brief.modelCount)} />
        <Stat label="Local answers" value={String(brief.localCount)} />
      </dl>
      <div className="panel flex min-h-72 flex-col gap-3 px-4 py-4">
        {career.data.mentor.length === 0 ? (
          <p className="m-auto max-w-md text-center text-sm leading-6 text-muted-foreground">
            Ask for a practice question, or ask what a hash map, an index, a REST API, or a STAR answer should include.
          </p>
        ) : (
          career.data.mentor.map((entry, index) => {
            const mine = entry.role === "user";
            return (
              <article key={`${entry.at}-${index}`} className={mine ? "ml-8 self-end" : "mr-8 self-start"}>
                <p className={`mb-1 text-[10px] font-semibold tracking-[0.14em] uppercase ${mine ? "text-right text-muted-foreground" : "text-sage"}`}>
                  {mine ? "You" : entry.source === "gemini" ? "Gemini mentor" : "Local mentor"}
                </p>
                <p className={`rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {entry.text}
                </p>
              </article>
            );
          })
        )}
      </div>
      <form
        className="panel flex flex-col gap-3 px-4 py-4"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="mentor" className="text-sm font-medium">Ask the mentor</label>
        <Textarea id="mentor" value={message} maxLength={800} onChange={(event) => setMessage(event.target.value)} placeholder="What should I practice for a backend role?" />
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        <Button type="submit" className="h-10 w-fit" disabled={pending}>
          {pending ? "Thinking…" : "Send"}
        </Button>
      </form>
    </div>
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
