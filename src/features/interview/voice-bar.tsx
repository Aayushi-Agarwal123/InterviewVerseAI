"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function VoiceBar({
  prompt,
  onTranscript,
}: {
  prompt: string;
  onTranscript: (text: string) => void;
}) {
  const [support, setSupport] = useState(() => voiceSupport(null));
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    const host = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSupport(voiceSupport({ speechSynthesis: window.speechSynthesis, SpeechRecognition: host.SpeechRecognition, webkitSpeechRecognition: host.webkitSpeechRecognition }));
  }, []);

  useEffect(() => {
    return () => {
      recognition.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak() {
    if (!window.speechSynthesis) {
      setError("This browser cannot speak the question.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(prompt);
    utterance.onerror = () => setError("Speech playback failed. Read the question on screen.");
    window.speechSynthesis.speak(utterance);
    setPaused(false);
    setError("");
  }

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("This browser has no speech recognition. Type the answer.");
      return;
    }
    setError("");
    const next = new Ctor();
    next.continuous = true;
    next.interimResults = false;
    next.lang = "en-US";
    next.onresult = (event) => {
      const parts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index]?.isFinal) parts.push(event.results[index][0].transcript);
      }
      const text = parts.join(" ").trim();
      if (text) onTranscript(text);
    };
    next.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone permission was denied. Allow it in the browser, or type the answer.");
        return;
      }
      setError("Speech recognition stopped. You can type the answer.");
    };
    next.onend = () => setListening(false);
    recognition.current = next;
    try {
      next.start();
      setListening(true);
      setPaused(false);
    } catch {
      setError("The microphone did not start. Type the answer.");
    }
  }

  function pause() {
    recognition.current?.stop();
    window.speechSynthesis?.pause();
    setListening(false);
    setPaused(true);
  }

  function stop() {
    recognition.current?.abort();
    window.speechSynthesis?.cancel();
    setListening(false);
    setPaused(false);
  }

  const stateLabel = listening ? "Listening" : paused ? "Paused" : "Ready";

  return (
    <section className="panel px-5 py-5" aria-label="Voice interview">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          aria-pressed={listening}
          disabled={!support.speechRecognition}
          onClick={listening ? pause : start}
          className={`grid size-20 shrink-0 place-items-center rounded-full text-primary-foreground shadow-card transition-transform ${listening ? "animate-pulse bg-primary" : "bg-primary hover:scale-105"} disabled:opacity-50`}
        >
          {listening ? <Pause className="size-7" aria-hidden /> : <Mic className="size-7" aria-hidden />}
          <span className="sr-only">{listening ? "Pause microphone" : "Start microphone"}</span>
        </button>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-sage uppercase">{stateLabel}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{support.label}</p>
          <p className="mt-2 text-sm leading-6">
            {listening
              ? "Final phrases are added to the answer as you speak."
              : "Nothing is recorded on the server. You can still type the answer."}
          </p>
        </div>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
        <Button type="button" variant="outline" className="h-10" disabled={!support.speechSynthesis} onClick={speak}>
          <Volume2 aria-hidden />
          Speak question
        </Button>
        <Button type="button" variant="outline" className="h-10" disabled={!listening && !paused} onClick={pause}>
          <Pause aria-hidden />
          Pause
        </Button>
        <Button type="button" variant="outline" className="h-10" onClick={stop}>
          <Square aria-hidden />
          Stop
        </Button>
      </div>
    </section>
  );
}
