"use client";

import { useSyncExternalStore } from "react";
import {
  emptyCareer,
  loadCareer,
  saveCareer,
  type CareerData,
  type CodingSubmission,
  type MentorMessage,
} from "@/lib/career/memory";
import type { CandidateProfile } from "@/lib/career/profile";

const EMPTY = emptyCareer();

type Snap = { ready: boolean; data: CareerData };

const SERVER_SNAP: Snap = { ready: true, data: EMPTY };
let snapshot: Snap = SERVER_SNAP;
let browserRead = false;
const listeners = new Set<() => void>();

function emit(next: Snap) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function readBrowser(): Snap {
  try {
    return { ready: true, data: loadCareer() };
  } catch {
    return SERVER_SNAP;
  }
}

function ensureBrowser(): Snap {
  if (browserRead || typeof window === "undefined") return snapshot;
  browserRead = true;
  snapshot = readBrowser();
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Snap {
  return ensureBrowser();
}

function getServerSnapshot(): Snap {
  return SERVER_SNAP;
}

function commit(data: CareerData) {
  emit({ ready: true, data: saveCareer(data) });
}

export function useCareer() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ready: current.ready,
    data: current.data,
    saveProfile(profile: CandidateProfile) {
      commit({ ...snapshot.data, profile });
    },
    toggleTask(id: string) {
      const manualTasks = snapshot.data.manualTasks.includes(id)
        ? snapshot.data.manualTasks.filter((item) => item !== id)
        : [...snapshot.data.manualTasks, id];
      commit({ ...snapshot.data, manualTasks });
    },
    addSubmission(submission: CodingSubmission) {
      commit({ ...snapshot.data, submissions: [submission, ...snapshot.data.submissions].slice(0, 20) });
    },
    addMentor(messages: MentorMessage[]) {
      commit({ ...snapshot.data, mentor: [...snapshot.data.mentor, ...messages].slice(-30) });
    },
    addMatch(match: CareerData["matches"][number]) {
      commit({ ...snapshot.data, matches: [match, ...snapshot.data.matches].slice(0, 8) });
    },
    clearLearning() {
      commit(emptyCareer());
    },
    clearRoadmap() {
      commit({ ...snapshot.data, manualTasks: [] });
    },
  };
}
