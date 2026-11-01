import type { CandidateProfile } from "@/lib/career/profile";
import { questionBudget } from "@/lib/career/profile";
import { sealCustomQuestion } from "@/lib/career/custom";
import { planFromBank } from "@/lib/career/plan";
import type { CoachRuntime } from "@/lib/coach/config";
import { completeGemini } from "@/lib/coach/gemini";
import type { Question, Track } from "@/lib/domain";
import { QUESTIONS } from "@/lib/questions";
import type { AvatarInterviewer } from "@/lib/avatar/provider";

export type AvatarExchange = { prompt: string; answer: string };

export type AvatarTurnResult = {
  source: "gemini" | "local";
  notice: string;
  question: Question;
};

function scrub(text: string): string {
  return text.replace(/AIza[0-9A-Za-z\-_]{10,}/g, "[redacted]").replace(/sk-[A-Za-z0-9]{10,}/g, "[redacted]");
}

export function interviewerTrack(interviewer: AvatarInterviewer, profile: CandidateProfile, asked: number): Track {
  if (interviewer === "arun") return "technical";
  if (interviewer === "leela") return "hr";
  const bias = profile.interviewType === "hr" ? 1 : 0;
  return (asked + bias) % 2 === 0 ? "technical" : "hr";
}

function localCraft(profile: CandidateProfile, track: Track, index: number): Question | null {
  const skill = profile.skills[index % Math.max(1, profile.skills.length)] ?? "your stack";
  const prompt =
    track === "hr"
      ? `Tell me about a time your work as a ${profile.experience} candidate mattered for a ${profile.role} team. What did you do yourself, and what changed?`
      : `Walk me through how you would use ${skill} for a ${profile.role} problem. Name the approach, one tradeoff, and an edge case.`;
  const setup = track === "hr" ? "A specific episode from your own work." : `Skill in view: ${skill}.`;
  return sealCustomQuestion(
    { track, topic: track === "hr" ? "behavioral" : "backend", difficulty: profile.difficulty, prompt, setup },
    index,
  );
}

export function nextLocalAvatarQuestion(
  profile: CandidateProfile,
  askedIds: string[],
  interviewer: AvatarInterviewer,
): Question {
  const asked = new Set(askedIds);
  const track = interviewerTrack(interviewer, profile, askedIds.length);
  const preferred = planFromBank({
    ...profile,
    interviewType: track === "hr" ? "hr" : "technical",
  }).questionIds;
  const bank = [...preferred, ...QUESTIONS.filter((question) => question.track === track).map((question) => question.id)];
  for (const id of bank) {
    if (asked.has(id)) continue;
    const question = QUESTIONS.find((item) => item.id === id);
    if (question && question.track === track) return question;
  }
  return (
    localCraft(profile, track, askedIds.length) ??
    QUESTIONS.find((question) => question.track === track) ??
    QUESTIONS[0]
  );
}

function readJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export function avatarBudget(profile: CandidateProfile): number {
  return questionBudget(profile.durationMinutes);
}

export async function nextAvatarQuestion(
  profile: CandidateProfile,
  askedIds: string[],
  history: AvatarExchange[],
  interviewer: AvatarInterviewer,
  config: CoachRuntime,
  fetchImpl?: typeof fetch,
): Promise<AvatarTurnResult> {
  const localQuestion = nextLocalAvatarQuestion(profile, askedIds, interviewer);
  const localNotice = "Local interviewer. Gemini did not write this question.";
  const ready = config.mode === "ai" && config.provider === "gemini" && Boolean(config.apiKey) && Boolean(config.model);
  if (!ready || !config.apiKey) {
    return { source: "local", notice: localNotice, question: localQuestion };
  }
  const recent = history.slice(-4).map((item) => `Question: ${scrub(item.prompt).slice(0, 240)}\nAnswer: ${scrub(item.answer).slice(0, 500)}`);
  const track = interviewerTrack(interviewer, profile, askedIds.length);
  try {
    const text = await completeGemini(
      {
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        temperature: 0.4,
        signal: AbortSignal.timeout(12_000),
        messages: [
          {
            role: "system",
            content:
              'Write the next interview question as JSON only: {"track":"technical","topic":"backend","difficulty":"standard","prompt":"","setup":""}. Use the previous answer. Do not repeat a question. No markdown, scores, or sample answers. Topics: dsa, system-design, frontend, backend, behavioral, leadership, conflict, career.',
          },
          {
            role: "user",
            content: [
              `Candidate: ${profile.name}, ${profile.qualification}, ${profile.experience}${profile.years ? `, ${profile.years} years` : ""}`,
              `Role: ${profile.role}${profile.company ? ` at ${profile.company}` : ""}`,
              `Skills: ${profile.skills.join(", ")}`,
              `Difficulty: ${profile.difficulty}`,
              `This question's track must be ${track}.`,
              recent.length ? `Conversation so far:\n${recent.join("\n\n")}` : "This is the opening question.",
            ].join("\n"),
          },
        ],
      },
      fetchImpl,
    );
    const parsed = readJson(text);
    const record = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    const sealed = sealCustomQuestion(
      record?.prompt ? { ...record, track } : record?.question,
      askedIds.length,
    );
    if (!sealed) {
      return { source: "local", notice: "Gemini did not return a usable question. The local interviewer asked instead.", question: localQuestion };
    }
    return {
      source: "gemini",
      notice: "Gemini wrote this question from the profile and the answers so far.",
      question: sealed,
    };
  } catch {
    return {
      source: "local",
      notice: "Gemini did not answer. The local interviewer asked instead.",
      question: localQuestion,
    };
  }
}
