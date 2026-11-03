import type { CandidateProfile } from "@/lib/career/profile";
import { redactSensitiveText } from "@/lib/security/redact";

export const CAREER_KEY = "interviewverse.career.v1";

export type MentorMessage = {
  role: "user" | "mentor";
  text: string;
  source: "local" | "gemini";
  at: string;
};

export type CodingSubmission = {
  id: string;
  problemId: string;
  language: string;
  code: string;
  passed: number;
  total: number;
  at: string;
  mode: "browser" | "not-run";
};

export type CareerData = {
  version: 1;
  profile: CandidateProfile | null;
  manualTasks: string[];
  submissions: CodingSubmission[];
  mentor: MentorMessage[];
  matches: { id: string; at: string; gap: number; missing: string[] }[];
};

export function emptyCareer(): CareerData {
  return { version: 1, profile: null, manualTasks: [], submissions: [], mentor: [], matches: [] };
}

function scrub(text: string): string {
  return redactSensitiveText(text);
}

export function parseCareer(raw: string): CareerData | null {
  try {
    const parsed = JSON.parse(raw) as CareerData;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.manualTasks)) return null;
    return {
      version: 1,
      profile: parsed.profile ?? null,
      manualTasks: parsed.manualTasks.filter((item) => typeof item === "string").slice(0, 40),
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions.slice(0, 20) : [],
      mentor: Array.isArray(parsed.mentor) ? parsed.mentor.slice(-30) : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches.slice(0, 8) : [],
    };
  } catch {
    return null;
  }
}

export function loadCareer(): CareerData {
  if (typeof window === "undefined") return emptyCareer();
  const raw = window.localStorage.getItem(CAREER_KEY);
  if (!raw) return emptyCareer();
  return parseCareer(raw) ?? emptyCareer();
}

export function saveCareer(data: CareerData): CareerData {
  const next: CareerData = {
    ...data,
    version: 1,
    manualTasks: data.manualTasks.slice(0, 40),
    submissions: data.submissions.slice(0, 20).map((item) => ({ ...item, code: scrub(item.code).slice(0, 6000) })),
    mentor: data.mentor.slice(-30).map((item) => ({ ...item, text: scrub(item.text).slice(0, 1500) })),
    matches: data.matches.slice(0, 8),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CAREER_KEY, JSON.stringify(next));
  }
  return next;
}
