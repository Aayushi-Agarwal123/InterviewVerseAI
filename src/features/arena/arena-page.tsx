"use client";

import { useMemo, useState } from "react";
import { PageIntro } from "@/components/page-intro";
import { useCareer } from "@/components/shell/career-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PROBLEMS, type CodingLevel, type CodingProblem } from "@/lib/coding/problems";
import { runJavaScriptLocally, type RunReport } from "@/lib/coding/run";
import { cn } from "@/lib/utils";

const LEVELS: CodingLevel[] = ["easy", "medium", "hard"];

export function ArenaPage() {
  const career = useCareer();
  const [level, setLevel] = useState<CodingLevel | "all">("all");
  const [problemId, setProblemId] = useState(PROBLEMS[0].id);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(PROBLEMS[0].starter);
  const [report, setReport] = useState<RunReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const visible = useMemo(
    () => PROBLEMS.filter((problem) => level === "all" || problem.level === level),
    [level],
  );
  const problem = visible.find((item) => item.id === problemId) ?? visible[0] ?? PROBLEMS[0];

  function choose(next: CodingProblem) {
    setProblemId(next.id);
    setCode(next.starter);
    setReport(null);
    setError("");
  }

  async function run() {
    setError("");
    if (language !== "javascript") {
      career.addSubmission({
        id: `sub-${Date.now()}`,
        problemId: problem.id,
        language,
        code,
        passed: 0,
        total: problem.cases.length,
        at: new Date().toISOString(),
        mode: "not-run",
      });
      setReport({
        mode: "not-run",
        results: [],
        passed: 0,
        total: problem.cases.length,
        message: `${language} is saved and not executed. Only JavaScript runs in this browser, and the server never runs arena code.`,
      });
      return;
    }
    setPending(true);
    const result = await runJavaScriptLocally(code, problem.cases);
    career.addSubmission({
      id: `sub-${Date.now()}`,
      problemId: problem.id,
      language,
      code,
      passed: result.passed,
      total: result.total,
      at: new Date().toISOString(),
      mode: result.mode,
    });
    setReport(result);
    setPending(false);
  }

  if (!career.ready) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        kicker="Coding arena"
        title="Sample cases, run in the browser."
        lede="JavaScript runs in a worker on this device and stops after 1.5 seconds. Python, Java, and TypeScript can be written and saved. InterviewVerse does not execute them."
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty">
        {(["all", ...LEVELS] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={level === item}
            onClick={() => setLevel(item)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm capitalize ring-1",
              level === item ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-foreground/10",
            )}
          >
            {item === "all" ? "All" : item}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <ul className="panel flex flex-col gap-1 p-2">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => choose(item)}
                className={cn(
                  "w-full rounded-xl px-3 py-3 text-left",
                  item.id === problem.id ? "bg-secondary text-secondary-foreground" : "hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium">{item.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground capitalize">{item.level} · {item.topic}</span>
              </button>
            </li>
          ))}
        </ul>
        <section className="panel flex min-w-0 flex-col px-5 py-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-sage uppercase">{problem.level}</p>
          <h2 className="mt-2 font-heading text-3xl tracking-tight">{problem.title}</h2>
          <p className="mt-3 text-sm leading-6">{problem.prompt}</p>
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">{problem.signature}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <label htmlFor="language" className="text-sm font-medium">
              Language
              <select id="language" className="mt-2 block h-10 rounded-xl border border-input bg-background px-3 text-sm" value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="javascript">JavaScript · runs here</option>
                <option value="typescript">TypeScript · saved, not run</option>
                <option value="python">Python · saved, not run</option>
                <option value="java">Java · saved, not run</option>
              </select>
            </label>
            <Button className="h-10" disabled={pending} onClick={() => void run()}>
              {pending ? "Running…" : language === "javascript" ? "Run sample cases" : "Save without running"}
            </Button>
          </div>
          <label htmlFor="solution" className="mt-4 text-sm font-medium">Editor</label>
          <Textarea id="solution" value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 min-h-72 flex-1 bg-[#1c241c] font-mono text-sm text-[#e7f0e4] placeholder:text-[#e7f0e4]/50" spellCheck={false} />
          {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
        </section>
        <aside className="flex flex-col gap-4">
          <section className="panel px-4 py-4">
            <h3 className="text-sm font-medium">Sample cases</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {problem.cases.map((item, index) => (
                <li key={index} className="rounded-xl bg-muted px-3 py-2 font-mono text-[11px] leading-5">
                  solve({item.args.map((arg) => JSON.stringify(arg)).join(", ")}) → {JSON.stringify(item.expected)}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel px-4 py-4" role="status">
            <h3 className="text-sm font-medium">Results</h3>
            {report ? (
              <>
                <p className="mt-2 text-sm leading-6">{report.message}</p>
                {report.results.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2 font-mono text-xs">
                    {report.results.map((item) => (
                      <li key={item.index} className={`rounded-xl px-3 py-2 ${item.passed ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"}`}>
                        Case {item.index + 1}: {item.passed ? "passed" : "failed"}
                        {item.error ? ` · ${item.error}` : ` · got ${item.actual}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">This language was saved and was not executed.</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Run JavaScript to see sample results. Other languages stay in history as not executed.</p>
            )}
          </section>
        </aside>
      </div>
      <section className="panel px-5 py-5">
        <h2 className="font-heading text-2xl tracking-tight">Submission history</h2>
        {career.data.submissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No submissions saved in this browser.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {career.data.submissions.map((item) => (
              <li key={item.id} className="rounded-xl bg-muted px-4 py-3 text-sm">
                {item.problemId} · {item.language} · {item.mode === "browser" ? `${item.passed}/${item.total} passed in browser` : "not executed"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
