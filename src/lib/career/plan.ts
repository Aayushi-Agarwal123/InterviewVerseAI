import type { CoachRuntime } from "@/lib/coach/config";
import { completeGemini } from "@/lib/coach/gemini";
import type { Difficulty, Question, SessionConfig, Topic, Track } from "@/lib/domain";
import { createSession } from "@/lib/engine/session";
import { QUESTIONS } from "@/lib/questions";
import { questionBudget, type CandidateProfile } from "@/lib/career/profile";
import { sealCustomQuestions } from "@/lib/career/custom";
import { redactSensitiveText } from "@/lib/security/redact";

export type InterviewPlan = {
  source: "gemini" | "bank";
  notice?: string;
  sessionConfig: SessionConfig;
  questionIds: string[];
  standbyIds: string[];
  prompts?: Record<string, Question>;
  promptNotes: Record<string, string>;
  durationMinutes: CandidateProfile["durationMinutes"];
  profileName: string;
};

const TOPIC_WORDS: { topic: Topic; words: string[] }[] = [
  { topic: "frontend", words: ["react", "css", "html", "frontend", "vite", "next", "ui", "browser"] },
  { topic: "backend", words: ["node", "express", "api", "mongodb", "sql", "backend", "server", "database"] },
  { topic: "dsa", words: ["dsa", "algorithm", "array", "tree", "graph", "leetcode", "coding"] },
  { topic: "system-design", words: ["system", "design", "scale", "distributed", "cache", "queue"] },
  { topic: "leadership", words: ["lead", "mentor", "ownership", "staff"] },
  { topic: "conflict", words: ["conflict", "disagree", "feedback"] },
  { topic: "behavioral", words: ["behavioral", "team", "collaboration"] },
  { topic: "career", words: ["career", "fresher", "resume", "growth"] },
];

function scrub(text: string): string {
  return redactSensitiveText(text);
}

function wantedTopics(profile: CandidateProfile): Topic[] {
  const haystack = `${profile.skills.join(" ")} ${profile.role}`.toLowerCase();
  const found = TOPIC_WORDS.filter((entry) => entry.words.some((word) => haystack.includes(word))).map(
    (entry) => entry.topic,
  );
  if (profile.interviewType === "hr") {
    const hr = found.filter((topic) => ["behavioral", "leadership", "conflict", "career"].includes(topic));
    return hr.length > 0 ? hr : ["behavioral", "career"];
  }
  if (profile.interviewType === "technical") {
    const technical = found.filter((topic) => ["frontend", "backend", "dsa", "system-design"].includes(topic));
    return technical.length > 0 ? technical : ["backend", "dsa"];
  }
  return found.length > 0 ? found : ["backend", "behavioral"];
}

function tracksFor(profile: CandidateProfile): Track[] {
  if (profile.interviewType === "mixed") return ["technical", "hr"];
  return [profile.interviewType];
}

function rank(question: Question, topics: Topic[], difficulty: Difficulty): number {
  let score = question.difficulties.includes(difficulty) ? 4 : question.difficulties.includes("standard") ? 1 : 0;
  if (topics.includes(question.topic)) score += 6;
  return score;
}

function noteFor(profile: CandidateProfile, question: Question): string {
  const company = profile.company ? ` at ${profile.company}` : "";
  const college = profile.college ? ` ${profile.college}.` : "";
  return scrub(
    `Chosen for ${profile.name}, ${profile.qualification}.${college} Target role: ${profile.role}${company}. Skills considered: ${profile.skills.join(", ")}. Topic: ${question.topic}.`,
  );
}

function take(pool: Question[], count: number, used: Set<string>): Question[] {
  const picked: Question[] = [];
  for (const question of pool) {
    if (used.has(question.id)) continue;
    picked.push(question);
    used.add(question.id);
    if (picked.length === count) break;
  }
  return picked;
}

export function planFromBank(profile: CandidateProfile): InterviewPlan {
  const topics = wantedTopics(profile);
  const tracks = tracksFor(profile);
  const count = questionBudget(profile.durationMinutes);
  const pool = QUESTIONS.filter((question) => tracks.includes(question.track)).sort(
    (a, b) => rank(b, topics, profile.difficulty) - rank(a, topics, profile.difficulty),
  );
  const used = new Set<string>();
  const main = take(
    pool.filter((question) => question.difficulties.includes(profile.difficulty)),
    count,
    used,
  );
  if (main.length < count) {
    main.push(...take(pool, count - main.length, used));
  }
  const standbyPool = pool.filter((question) => !question.difficulties.includes(profile.difficulty));
  const easier = take(
    standbyPool.filter((question) => question.difficulties.includes("warmup")),
    1,
    used,
  );
  const harder = take(
    standbyPool.filter((question) => question.difficulties.includes("pressure")),
    1,
    used,
  );
  const standby = [...easier, ...harder];
  const promptNotes: Record<string, string> = {};
  for (const question of [...main, ...standby]) promptNotes[question.id] = noteFor(profile, question);
  const track: Track = profile.interviewType === "hr" ? "hr" : "technical";
  return {
    source: "bank",
    sessionConfig: {
      track,
      topic: main[0]?.topic ?? topics[0] ?? "backend",
      difficulty: profile.difficulty,
      role: profile.experience === "fresher" ? "new-grad" : profile.role.toLowerCase().includes("front") ? "frontend" : profile.role.toLowerCase().includes("back") ? "backend" : "fullstack",
      questionCount: main.length,
      focus: profile.skills.slice(0, 4).join(", "),
    },
    questionIds: main.map((question) => question.id),
    standbyIds: standby.map((question) => question.id),
    promptNotes,
    durationMinutes: profile.durationMinutes,
    profileName: profile.name,
  };
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

export async function planInterview(
  profile: CandidateProfile,
  config: CoachRuntime,
  fetchImpl?: typeof fetch,
): Promise<InterviewPlan> {
  const local = planFromBank(profile);
  const ready = config.mode === "ai" && config.provider === "gemini" && Boolean(config.apiKey) && Boolean(config.model);
  if (!ready || !config.apiKey) {
    return {
      ...local,
      notice: "Gemini is not configured, so this round uses the question bank chosen for the profile.",
    };
  }
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
              'Write interview questions as JSON only: {"questions":[{"track":"technical","topic":"backend","difficulty":"standard","prompt":"","setup":""}]}. Topics: dsa, system-design, frontend, backend, behavioral, leadership, conflict, career. Difficulty is warmup, standard, or pressure. Write 4 to 6 questions. No markdown, no sample answers, no scores.',
          },
          {
            role: "user",
            content: [
              `Name: ${profile.name}`,
              `Qualification: ${profile.qualification}`,
              profile.college ? `College: ${profile.college}` : "",
              `Skills: ${profile.skills.join(", ")}`,
              `Experience: ${profile.experience}${profile.years ? `, ${profile.years} years` : ""}`,
              `Target role: ${profile.role}`,
              profile.company ? `Target company: ${profile.company}` : "",
              `Interview type: ${profile.interviewType}`,
              `Difficulty: ${profile.difficulty}`,
              `Duration minutes: ${profile.durationMinutes}`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
      fetchImpl,
    );
    const parsed = readJson(text);
    const questions = sealCustomQuestions(
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as { questions?: unknown }).questions
        : null,
    );
    if (questions.length < 2) {
      return { ...local, notice: "Gemini did not return usable questions. This round uses the question bank." };
    }
    const count = Math.min(questionBudget(profile.durationMinutes), questions.length);
    const main = questions.slice(0, count);
    const prompts = Object.fromEntries(main.map((question) => [question.id, question]));
    const promptNotes = Object.fromEntries(main.map((question) => [question.id, noteFor(profile, question)]));
    for (const id of local.standbyIds) promptNotes[id] = local.promptNotes[id] ?? "";
    return {
      source: "gemini",
      sessionConfig: { ...local.sessionConfig, topic: main[0]?.topic ?? local.sessionConfig.topic, questionCount: main.length },
      questionIds: main.map((question) => question.id),
      standbyIds: local.standbyIds,
      prompts,
      promptNotes,
      durationMinutes: profile.durationMinutes,
      profileName: profile.name,
    };
  } catch {
    return {
      ...local,
      notice: "Gemini did not answer. This round uses the question bank chosen for the profile.",
    };
  }
}

export function sessionFromPlan(
  plan: InterviewPlan,
  options?: { now?: string; voice?: boolean },
) {
  return createSession(plan.sessionConfig, {
    now: options?.now,
    questionIds: plan.questionIds,
    standbyIds: plan.standbyIds,
    prompts: plan.prompts,
    promptNotes: plan.promptNotes,
    kind: "personalized",
    voice: options?.voice,
    durationMinutes: plan.durationMinutes,
    planSource: plan.source,
    profileName: plan.profileName,
  });
}
