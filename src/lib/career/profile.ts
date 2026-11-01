import type { Difficulty } from "@/lib/domain";

export type InterviewType = "technical" | "hr" | "mixed";
export type ExperienceLevel = "fresher" | "experienced";
export type DurationMinutes = 15 | 30 | 45;

export type CandidateProfile = {
  name: string;
  qualification: string;
  college: string;
  skills: string[];
  experience: ExperienceLevel;
  years: number;
  role: string;
  company: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  durationMinutes: DurationMinutes;
};

const DIFFICULTIES = new Set<Difficulty>(["warmup", "standard", "pressure"]);
const TYPES = new Set<InterviewType>(["technical", "hr", "mixed"]);
const DURATIONS = new Set<DurationMinutes>([15, 30, 45]);

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function questionBudget(duration: DurationMinutes): number {
  if (duration === 15) return 3;
  if (duration === 30) return 5;
  return 6;
}

export function parseProfile(value: unknown): { ok: true; value: CandidateProfile } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Send the candidate profile as an object." };
  }
  const raw = value as Record<string, unknown>;
  const name = clean(raw.name, 60);
  if (name.length < 2) return { ok: false, error: "Enter the candidate name." };
  const qualification = clean(raw.qualification, 80);
  if (qualification.length < 2) return { ok: false, error: "Enter a qualification." };
  const college = clean(raw.college, 80);
  const role = clean(raw.role, 80);
  if (role.length < 2) return { ok: false, error: "Enter the target role." };
  const company = clean(raw.company, 80);
  const experience = raw.experience === "experienced" ? "experienced" : raw.experience === "fresher" ? "fresher" : "";
  if (!experience) return { ok: false, error: "Choose fresher or experienced." };
  const years = experience === "fresher" ? 0 : Number(raw.years);
  if (!Number.isInteger(years) || years < 0 || years > 40) {
    return { ok: false, error: "Experience years must be a whole number from 0 to 40." };
  }
  if (!TYPES.has(raw.interviewType as InterviewType)) return { ok: false, error: "Choose a technical, HR, or mixed interview." };
  if (!DIFFICULTIES.has(raw.difficulty as Difficulty)) return { ok: false, error: "Choose a difficulty." };
  if (!DURATIONS.has(raw.durationMinutes as DurationMinutes)) {
    return { ok: false, error: "Choose a 15, 30, or 45 minute interview." };
  }
  if (!Array.isArray(raw.skills)) return { ok: false, error: "Enter at least one skill." };
  const skills = raw.skills
    .map((item) => clean(item, 40))
    .filter((item) => item.length >= 2)
    .slice(0, 12);
  if (skills.length === 0) return { ok: false, error: "Enter at least one skill." };
  return {
    ok: true,
    value: {
      name,
      qualification,
      college,
      skills,
      experience,
      years,
      role,
      company,
      interviewType: raw.interviewType as InterviewType,
      difficulty: raw.difficulty as Difficulty,
      durationMinutes: raw.durationMinutes as DurationMinutes,
    },
  };
}
