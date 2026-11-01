"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Pause, Play, RotateCcw, Square, Video, VideoOff } from "lucide-react";
import { useCareer } from "@/components/shell/career-store";
import { peekSession, useSessions } from "@/components/shell/session-provider";
import { MissingRound, StorageError } from "@/components/storage-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InterviewerAvatar } from "@/features/avatar/interviewer-avatar";
import type { AvatarTurnResult } from "@/lib/avatar/engine";
import type { AvatarInterviewer, AvatarVisualState } from "@/lib/avatar/provider";
import { ILLUSTRATED_AVATAR } from "@/lib/avatar/provider";
import { answerAvatar, closeAvatar } from "@/lib/avatar/turn";
import { requestCustomEvaluation, requestDebrief } from "@/lib/coach/browser";
import { questionBudget } from "@/lib/career/profile";
import type { Question, Session } from "@/lib/domain";
import { questionOn } from "@/lib/engine/session";
import { formatClock } from "@/lib/format";
import { voiceSupport } from "@/lib/voice/support";

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function interviewerOf(session: Session): AvatarInterviewer {
  const saved = session.promptNotes?.["avatar-interviewer"];
  if (saved === "leela" || saved === "mixed" || saved === "arun") return saved;
  return "arun";
}

function faceFor(session: Session, question: Question | undefined): "arun" | "leela" {
  const interviewer = interviewerOf(session);
  if (interviewer === "leela") return "leela";
  if (interviewer === "arun") return "arun";
  return question?.track === "hr" ? "leela" : "arun";
}

export function AvatarRoom({ id }: { id: string }) {
  const store = useSessions();
  const career = useCareer();
  const router = useRouter();
  const session = store.sessions.find((item) => item.id === id) ?? peekSession(id);
  const [support, setSupport] = useState(() => voiceSupport(null));
  const [visual, setVisual] = useState<AvatarVisualState>("idle");
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState<"off" | "on" | "denied">("off");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const spoken = useRef("");
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const speakRef = useRef<(text: string) => void>(() => {});
  const shown = useRef(false);

  useEffect(() => {
    setHydrated(true);
    const host = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSupport(voiceSupport({ speechSynthesis: window.speechSynthesis, SpeechRecognition: host.SpeechRecognition, webkitSpeechRecognition: host.webkitSpeechRecognition }));
  }, []);

  useEffect(() => {
    return () => {
      recognition.current?.abort();
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!session || session.status !== "active" || !session.durationMinutes) return;
    const ends = new Date(session.createdAt).getTime() + session.durationMinutes * 60_000;
    const tick = () => setRemaining(Math.round((ends - Date.now()) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  const question = session ? questionOn(session, session.questionIds[session.index]) : undefined;
  const spokenKey = session && question ? `${session.id}:${question.id}:${session.phase}:${session.active.followUpPrompt ?? ""}` : "";

  useEffect(() => {
    if (session?.kind === "avatar" && session.status === "completed") {
      router.replace(`/report/${session.id}`);
    }
  }, [session, router]);

  useEffect(() => {
    if (!shown.current || !spokenKey || pausedRef.current || spoken.current === spokenKey) return;
    if (!session || session.kind !== "avatar" || session.status !== "active") return;
    const current = questionOn(session, session.questionIds[session.index]);
    if (!current) return;
    const text = session.phase === "followup" ? session.active.followUpPrompt ?? current.prompt : current.prompt;
    spoken.current = spokenKey;
    speakRef.current(text);
  }, [spokenKey, session, hydrated]);

  shown.current = false;
  if (!hydrated || store.status === "loading") return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  if (store.status === "error") return <StorageError message={store.message} onReset={store.clear} />;
  if (!session || session.kind !== "avatar") {
    return (
      <MissingRound
        title="This avatar interview is not on this device."
        body="Avatar rounds stay in the browser that started them."
      />
    );
  }
  if (session.status === "completed") {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  }
  if (!question) {
    return (
      <MissingRound
        title="This round has no question."
        body="Start again from the avatar interview."
      />
    );
  }

  const minutes = session.durationMinutes === 15 || session.durationMinutes === 45 ? session.durationMinutes : 30;
  const budget = questionBudget(minutes);
  const progress = Math.round((session.turns.length / budget) * 100);
  const line = session.phase === "followup" ? session.active.followUpPrompt ?? question.prompt : question.prompt;
  const sourceNote = session.promptNotes?.[question.id] || session.coachNotice || "";
  shown.current = true;
  const face = faceFor(session, question);
  const round = session;
  const askedQuestion = question;
  const phase = round.phase === "followup" ? "followup" : "answering";

  function speak(text: string) {
    if (!window.speechSynthesis) {
      setError("This browser cannot speak. Read the question on screen.");
      setVisual("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setVisual("speaking");
    utterance.onend = () => {
      setVisual("idle");
      if (!pausedRef.current && !mutedRef.current) startMic();
    };
    utterance.onerror = () => {
      setVisual("idle");
      setError("Speech playback failed. Read the question on screen.");
    };
    window.speechSynthesis.speak(utterance);
    setError("");
  }

  speakRef.current = speak;

  function startMic() {
    if (mutedRef.current || pausedRef.current) return;
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("This browser has no speech recognition. Type the answer.");
      return;
    }
    recognition.current?.abort();
    const next = new Ctor();
    next.continuous = true;
    next.interimResults = true;
    next.lang = "en-US";
    next.onresult = (event) => {
      let pending = "";
      let finals = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const piece = event.results[index]?.[0]?.transcript ?? "";
        if (event.results[index]?.isFinal) finals += `${piece} `;
        else pending += piece;
      }
      if (finals.trim()) {
        setDraft((current) => `${current} ${finals}`.replace(/\s+/g, " ").trim());
      }
      setInterim(pending);
    };
    let failed = false;
    next.onerror = (event) => {
      failed = true;
      setListening(false);
      setVisual("idle");
      if (event.error === "not-allowed") {
        setError("Microphone permission was denied. Allow it in the browser, or type the answer.");
        setMuted(true);
        mutedRef.current = true;
        return;
      }
      if (event.error !== "aborted") setError("Speech recognition stopped. You can type the answer.");
    };
    next.onend = () => setListening(false);
    recognition.current = next;
    try {
      next.start();
      if (failed) return;
      setListening(true);
      setVisual("listening");
      setError("");
    } catch {
      setError("The microphone did not start. Type the answer.");
    }
  }

  function stopMic() {
    recognition.current?.abort();
    setListening(false);
    setInterim("");
  }

  async function score(text: string) {
    try {
      const result = await requestCustomEvaluation({
        questionId: askedQuestion.id,
        question: askedQuestion,
        phase,
        difficulty: round.config.difficulty,
        role: round.config.role,
        focus: round.config.focus,
        hintUsed: false,
        answer: text,
        priorAnswer: phase === "followup" ? round.active.answer : undefined,
        followUpPrompt: phase === "followup" ? round.active.followUpPrompt : undefined,
        asked: round.turns.map((turn) => turn.prompt),
      });
      if (result.notice) setNotice(result.notice);
      return result.verdict;
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "This answer was scored by the local coach.");
      return undefined;
    }
  }

  async function loadNext(latestPrompt: string, latestAnswer: string): Promise<{ question: Question; notice: string } | null> {
    if (!career.data.profile) return null;
    if (round.turns.length + 1 >= budget) return null;
    const history = [
      ...round.turns.map((turn) => ({
        prompt: turn.prompt,
        answer: [turn.answer, turn.followUpAnswer].filter(Boolean).join(" "),
      })),
      { prompt: latestPrompt, answer: latestAnswer },
    ];
    const response = await fetch("/api/career", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "avatar-next",
        profile: career.data.profile,
        interviewer: interviewerOf(round),
        askedIds: round.questionIds,
        history,
      }),
    });
    const body = (await response.json().catch(() => null)) as AvatarTurnResult | null;
    if (!response.ok || !body?.question?.id) return null;
    setNotice(body.notice);
    return { question: body.question, notice: body.notice };
  }

  async function send() {
    const text = `${draft} ${interim}`.replace(/\s+/g, " ").trim();
    if (!text || busy) {
      setError("Say or type an answer before sending it.");
      return;
    }
    setBusy(true);
    setVisual("thinking");
    stopMic();
    window.speechSynthesis?.cancel();
    setError("");
    const now = new Date().toISOString();
    try {
      const verdict = await score(text);
      const followUp = phase === "answering" ? verdict?.followUp?.trim() : undefined;
      let working = round;
      let next: Question | null = null;
      if (!followUp) {
        const latestPrompt = phase === "followup" ? round.active.followUpPrompt ?? askedQuestion.prompt : askedQuestion.prompt;
        const latestAnswer = phase === "followup" ? `${round.active.answer} ${text}` : text;
        const loaded = await loadNext(latestPrompt, latestAnswer);
        if (loaded) {
          next = loaded.question;
          working = { ...round, promptNotes: { ...round.promptNotes, [loaded.question.id]: loaded.notice } };
        }
      }
      let saved = answerAvatar(working, text, now, verdict, next, budget);
      if (saved.status === "completed" && saved.report) {
        try {
          const coach = await requestDebrief(saved);
          if (coach) saved = { ...saved, report: { ...saved.report, coach } };
        } catch {
          setNotice("The debrief stayed on the local rubric.");
        }
      }
      store.replace(saved);
      setDraft("");
      setInterim("");
      if (saved.status === "completed") router.push(`/report/${saved.id}`);
    } catch {
      setError("The answer was kept on screen. The coach could not be reached.");
      setVisual("idle");
    } finally {
      setBusy(false);
      setVisual((current) => (current === "thinking" ? "idle" : current));
    }
  }

  async function end() {
    if (busy) return;
    const text = `${draft} ${interim}`.replace(/\s+/g, " ").trim();
    setBusy(true);
    stopMic();
    window.speechSynthesis?.cancel();
    const now = new Date().toISOString();
    try {
      let current = round;
      if (text || (phase === "followup" && round.active.answer.trim())) {
        const verdict = text ? await score(text) : undefined;
        current = answerAvatar(round, text, now, verdict, null, budget, true);
      }
      if (current.status !== "completed") {
        const closed = closeAvatar(current, now);
        if (!closed) {
          setError("Answer at least one question before ending.");
          setBusy(false);
          return;
        }
        current = closed;
      }
      store.replace(current);
      if (current.status === "completed") router.push(`/report/${current.id}`);
    } finally {
      setBusy(false);
      setVisual((current) => (current === "thinking" ? "idle" : current));
    }
  }

  async function toggleCamera() {
    if (camera === "on") {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamera("off");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("denied");
      setError("This browser cannot open the camera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamera("on");
    } catch (caught) {
      const name = caught instanceof DOMException ? caught.name : "";
      setCamera("denied");
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Camera permission was denied. The interview continues without a self view.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No camera was found. The interview continues without a self view.");
      } else {
        setError("The camera did not open. The interview continues without a self view.");
      }
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_340px]">
      <section className="overflow-hidden rounded-3xl bg-primary p-4 text-primary-foreground shadow-card md:p-6">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-primary-foreground/70">
            {session.turns.length + 1} of {budget}
          </p>
          <p className="tabular-nums">{remaining === null ? "—" : remaining >= 0 ? formatClock(remaining) : "Time is up"}</p>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/15" role="meter" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Interview progress">
          <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${progress}%` }} />
        </div>
        <InterviewerAvatar who={face} state={busy ? "thinking" : visual} />
        <p className="mx-auto mt-3 max-w-md text-center text-xs leading-5 text-primary-foreground/75">{ILLUSTRATED_AVATAR.limitation}</p>
      </section>
      <div className="flex flex-col gap-4">
        <section className="panel px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-sage uppercase">
              {session.phase === "followup" ? "Follow-up" : "Current question"}
            </p>
            <p className="text-xs text-muted-foreground">{sourceNote || "Waiting for the question source."}</p>
          </div>
          <p className="mt-3 text-lg leading-7">{line}</p>
          {notice && notice !== sourceNote ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{notice}</p> : null}
        </section>
        <section className="panel px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-sage uppercase">Live transcript</p>
            <button type="button" className="text-xs text-sage" onClick={() => void toggleCamera()}>
              {camera === "on" ? <VideoOff className="mr-1 inline size-3" aria-hidden /> : <Video className="mr-1 inline size-3" aria-hidden />}
              {camera === "on" ? "Hide camera" : "Show camera"}
            </button>
          </div>
          <div className={`mt-3 overflow-hidden rounded-2xl bg-muted ${camera === "on" ? "block" : "hidden"}`}>
            <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" aria-label="Your camera" />
          </div>
          {camera === "denied" ? <p className="mt-2 text-xs text-muted-foreground">Camera unavailable. The interview does not need it.</p> : null}
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-3 min-h-28"
            placeholder={support.speechRecognition ? "Your words appear here as you speak. You can also type." : "Type the answer. This browser has no speech recognition."}
            aria-label="Answer transcript"
          />
          {interim ? <p className="mt-2 text-sm text-muted-foreground">{interim}</p> : null}
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{support.label}</p>
          {error ? <p className="mt-2 text-sm text-destructive" role="alert">{error}</p> : null}
        </section>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={muted ? "secondary" : "outline"} className="h-10" onClick={() => {
            const next = !muted;
            setMuted(next);
            mutedRef.current = next;
            if (next) stopMic();
            else startMic();
          }}>
            {muted ? <MicOff aria-hidden /> : <Mic aria-hidden />}
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button type="button" variant="outline" className="h-10" onClick={() => speak(line)} disabled={!support.speechSynthesis}>
            <RotateCcw aria-hidden />
            Replay
          </Button>
          <Button type="button" variant="outline" className="h-10" onClick={() => {
            if (paused) {
              pausedRef.current = false;
              setPaused(false);
              if (spoken.current !== spokenKey) speak(line);
              else {
                window.speechSynthesis?.resume();
                startMic();
              }
            } else {
              pausedRef.current = true;
              setPaused(true);
              window.speechSynthesis?.pause();
              stopMic();
              setVisual("idle");
            }
          }}>
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button type="button" className="h-10" disabled={busy} onClick={() => void send()}>
            {busy ? "Thinking…" : "Send answer"}
          </Button>
          <Button type="button" variant="outline" className="h-10" disabled={busy} onClick={() => void end()}>
            <Square aria-hidden />
            End interview
          </Button>
        </div>
      </div>
    </div>
  );
}
