"use client";

import { useEffect, useRef, useState } from "react";
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

  return (
    <section className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10" aria-label="Voice interview">
      <p className="text-xs font-medium tracking-[0.14em] text-copper uppercase">Voice</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{support.label}</p>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={!support.speechSynthesis} onClick={speak}>
          Speak question
        </Button>
        <Button type="button" variant="outline" disabled={!support.speechRecognition || listening} onClick={start}>
          {listening ? "Listening" : "Start microphone"}
        </Button>
        <Button type="button" variant="outline" disabled={!listening && !paused} onClick={pause}>
          Pause
        </Button>
        <Button type="button" variant="outline" onClick={stop}>
          Stop
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {listening ? "Microphone is on. Final phrases are added to the answer." : "Nothing is recorded on the server."}{" "}
        Communication is scored with the rest of the answer when you send it.
      </p>
    </section>
  );
}
