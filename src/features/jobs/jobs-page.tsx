"use client";

import { useState } from "react";
import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { useCareer } from "@/components/shell/career-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { matchJob, type SkillMatch } from "@/lib/career/match";
import { topicById } from "@/lib/catalog";

export function JobsPage() {
  const career = useCareer();
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SkillMatch | null>(null);

  function compare() {
    if (description.trim().length < 20) {
      setError("Paste a job description of at least a sentence.");
      setResult(null);
      return;
    }
    const entered = skills.split(",").map((item) => item.trim()).filter(Boolean);
    if (entered.length === 0) {
      setError("Type the skills you have. This page does not read a resume.");
      setResult(null);
      return;
    }
    const match = matchJob(description, entered);
    setResult(match);
    setError("");
    career.addMatch({ id: `match-${Date.now()}`, at: new Date().toISOString(), gap: match.gapPercent, missing: match.missing });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageIntro
        kicker="Job match"
        title="Paste a description. Type your skills."
        lede="The comparison runs in this browser. It looks for a fixed list of skills in the text you paste and the skills you enter. There is no resume upload."
      />
      <form
        className="panel flex flex-col gap-4 px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          compare();
        }}
      >
        <div>
          <Label htmlFor="jd">Job description</Label>
          <Textarea id="jd" value={description} maxLength={6000} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-40" placeholder="Paste the posting. Do not upload a file." />
        </div>
        <div>
          <Label htmlFor="skills">Your skills</Label>
          <Input id="skills" value={skills} onChange={(event) => setSkills(event.target.value)} className="mt-2 h-10 bg-background" placeholder="JavaScript, React, communication" />
        </div>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button type="submit" className="h-10 w-fit">Compare</Button>
      </form>
      {result ? (
        <section className="panel px-5 py-5" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-sage uppercase">Match</p>
              <p className="mt-2 font-heading text-5xl tabular-nums">{100 - result.gapPercent}<span className="text-2xl text-muted-foreground">%</span></p>
            </div>
            <p className="text-sm text-muted-foreground">{result.gapPercent}% of recognized required skills are missing.</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.note}</p>
          <SkillList title="Required skills" items={result.required} empty="None recognized." tone="neutral" />
          <SkillList title="Matching skills" items={result.matching} empty="None of your typed skills matched." tone="match" />
          <SkillList title="Missing skills" items={result.missing} empty="No missing skills from the recognized list." tone="gap" />
          <h2 className="mt-6 font-heading text-2xl">Recommended practice</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {result.topics.length === 0 ? <li className="text-sm text-muted-foreground">No topic mapped yet.</li> : result.topics.map((topic) => (
              <li key={topic}>
                <Link className="rounded-full bg-background px-3 py-1 text-sm ring-1 ring-foreground/10" href={`/practice?topic=${topic}`}>
                  {topicById(topic).label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-lg">Questions from the bank</h2>
          {result.questions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No bank question matched the missing skills.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {result.questions.map((question) => (
                <li key={question.id} className="text-sm leading-6">{question.prompt}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      {career.ready && career.data.matches.length > 0 ? (
        <section>
          <h2 className="text-2xl tracking-tight">Recent comparisons</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {career.data.matches.map((match) => (
              <li key={match.id} className="text-sm text-muted-foreground">{match.gap}% gap · missing {match.missing.join(", ") || "none"}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SkillList({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: "neutral" | "match" | "gap" }) {
  const chip = tone === "match" ? "bg-secondary text-secondary-foreground" : tone === "gap" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground";
  return (
    <div className="mt-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {items.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">{empty}</p> : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => <li key={item} className={`rounded-full px-3 py-1 text-sm ${chip}`}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
