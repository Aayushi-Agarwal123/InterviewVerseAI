"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { useSessions } from "@/components/shell/session-provider";
import { StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DIFFICULTIES,
  ROLES,
  TOPICS,
  TRACKS,
  personaFor,
  roleLabel,
  topicById,
} from "@/lib/catalog";
import type { Difficulty, RoleTarget, Topic, Track } from "@/lib/domain";
import { questionsFor } from "@/lib/engine/session";
import { voiceSupport } from "@/lib/voice/support";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

function lengthOptions(count: number): { count: number; label: string }[] {
  if (count <= 0) return [];
  const options = [{ count: 1, label: "One prompt" }];
  if (count >= 3) options.push({ count: 3, label: "Short round" });
  if (count === 2) options.push({ count: 2, label: "Both prompts" });
  if (count > 3) options.push({ count, label: `Full set · ${count}` });
  return options;
}

function topicFor(track: Track, requested: string | null): Topic {
  const match = TOPICS.find(
    (topic) => topic.id === requested && topic.track === track,
  );
  return match?.id ?? TOPICS.find((topic) => topic.track === track)!.id;
}

export function PracticePage({ voiceMode = false }: { voiceMode?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const store = useSessions();
  const initialTrack: Track = params.get("track") === "hr" ? "hr" : "technical";
  const [track, setTrack] = useState<Track>(initialTrack);
  const [topic, setTopic] = useState<Topic>(topicFor(initialTrack, params.get("topic")));
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [role, setRole] = useState<RoleTarget>("fullstack");
  const [questionCount, setQuestionCount] = useState(3);
  const [focus, setFocus] = useState("");
  const [voice, setVoice] = useState(voiceMode);
  const [voiceNote, setVoiceNote] = useState("Voice is checked in this browser after the page loads.");

  const pool = useMemo(
    () => questionsFor({ track, topic, difficulty }),
    [track, topic, difficulty],
  );
  const options = lengthOptions(pool.length);
  const count = options.some((option) => option.count === questionCount)
    ? questionCount
    : (options.find((option) => option.count === 3)?.count ?? options.at(-1)?.count ?? 0);
  const minutes =
    pool.length === 0
      ? 0
      : Math.round(
          (pool.reduce((sum, question) => sum + question.minutes, 0) / pool.length) *
            count,
        );
  const persona = personaFor(track);

  useEffect(() => {
    const host = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setVoiceNote(
      voiceSupport({
        speechSynthesis: window.speechSynthesis,
        SpeechRecognition: host.SpeechRecognition,
        webkitSpeechRecognition: host.webkitSpeechRecognition,
      }).label,
    );
  }, []);

  function chooseTrack(next: Track) {
    setTrack(next);
    setTopic(topicFor(next, null));
  }

  if (store.status === "loading") {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  }
  if (store.status === "error") {
    return <StorageError message={store.message} onReset={store.clear} />;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <PageIntro
          kicker={voiceMode ? "Voice interview" : "Question interview"}
          title={voiceMode ? "Speak the round, or type if the browser cannot." : "Set the round, then sit in it."}
          lede={
            voiceMode
              ? `${voiceNote} The same question bank, timer, follow-ups, and debrief still apply.`
              : "Pick the interviewer, the topic, and how hard they push. You can leave early and still get a debrief on the answers you gave."
          }
        />
        {voiceMode ? (
          <div className="panel mt-6 flex items-center gap-4 px-5 py-4">
            <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-card">
              <Mic className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-sage uppercase">Voice round</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{voiceNote}</p>
            </div>
          </div>
        ) : null}

        <fieldset className="mt-8">
          <legend className="text-sm font-medium">Interviewer</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TRACKS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={track === item.id}
                onClick={() => chooseTrack(item.id)}
                className={cn(
                  "rounded-2xl px-4 py-4 text-left ring-1 transition-colors",
                  track === item.id
                    ? "bg-primary text-primary-foreground ring-primary shadow-card"
                    : "bg-card ring-foreground/10 hover:bg-secondary/50",
                )}
              >
                <span className="block font-medium">{item.label}</span>
                <span className="mt-1 block text-sm opacity-75">
                  {item.kicker}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium">Topic</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TOPICS.filter((item) => item.track === track).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={topic === item.id}
                onClick={() => setTopic(item.id)}
                className={cn(
                  "rounded-2xl px-4 py-4 text-left ring-1 transition-colors",
                  topic === item.id
                    ? "bg-secondary text-secondary-foreground ring-primary/30 shadow-card"
                    : "bg-card ring-foreground/10 hover:bg-secondary/40",
                )}
              >
                <span className="block font-medium">{item.label}</span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                  {item.blurb}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium">Pressure</legend>
            <div className="mt-3 flex flex-col gap-2">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={difficulty === item.id}
                  onClick={() => setDifficulty(item.id)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-left ring-1",
                    difficulty === item.id
                      ? "bg-card shadow-card ring-primary"
                      : "bg-card/50 ring-foreground/8 hover:bg-card",
                  )}
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    {item.detail}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-5">
            <div>
              <Label htmlFor="role">Role you are practicing for</Label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as RoleTarget)}
                className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm"
              >
                {ROLES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Length</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {options.map((option) => (
                  <button
                    key={option.count}
                    type="button"
                    aria-pressed={count === option.count}
                    onClick={() => setQuestionCount(option.count)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm ring-1",
                      count === option.count
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-card ring-foreground/10",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="focus">Focus, if you have one</Label>
              <Input
                id="focus"
                value={focus}
                maxLength={120}
                onChange={(event) => setFocus(event.target.value)}
                placeholder="Failure modes, or stories with a number"
                className="mt-2 h-10 bg-card"
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                The debrief will ask whether you actually stayed there. It does not change the prompts.
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside className="panel h-fit px-5 py-5 lg:sticky lg:top-24">
        <p className="text-xs font-medium tracking-[0.16em] text-copper uppercase">
          {persona.initials}
        </p>
        <h2 className="mt-2 text-3xl tracking-tight">{persona.name}</h2>
        <p className="text-sm text-muted-foreground">{persona.role}</p>
        <p className="mt-4 text-sm leading-6">{persona.line}</p>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Topic</dt>
            <dd>{topicById(topic).label}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd>{roleLabel(role)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Prompts</dt>
            <dd className="tabular-nums">{count}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">About</dt>
            <dd className="tabular-nums">{minutes} min</dd>
          </div>
        </dl>
        <label className="mt-5 flex items-start gap-3 text-sm leading-5">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[var(--primary)]"
            checked={voice || voiceMode}
            disabled={voiceMode}
            onChange={(event) => setVoice(event.target.checked)}
          />
          <span>
            Voice interview
            <span className="mt-1 block text-xs text-muted-foreground">{voiceNote}</span>
          </span>
        </label>
        <Button
          className="mt-6 h-10 w-full"
          disabled={count === 0}
          onClick={() => {
            const session = store.create(
              {
                track,
                topic,
                difficulty,
                role,
                questionCount: count,
                focus,
              },
              voice || voiceMode ? { voice: true, kind: "voice" } : undefined,
            );
            if (session) router.push(`/interview/${session.id}`);
          }}
        >
          Begin with {persona.name.split(" ")[0]}
        </Button>
      </aside>
    </div>
  );
}
