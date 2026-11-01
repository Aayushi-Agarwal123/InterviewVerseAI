import type { Difficulty, Question, Signal, Topic, Track } from "@/lib/domain";

const TOPICS = new Set<Topic>([
  "dsa",
  "system-design",
  "frontend",
  "backend",
  "behavioral",
  "leadership",
  "conflict",
  "career",
]);

const TECH_SIGNALS: Signal[] = [
  {
    id: "px-approach",
    label: "a concrete approach",
    hint: "Name the first step you would take, and why.",
    patterns: ["i would", "approach", "because", "start"],
  },
  {
    id: "px-tradeoff",
    label: "a tradeoff",
    hint: "Say what you give up to get the property you want.",
    patterns: ["tradeoff", "trade-off", "instead", "cost", "memory"],
  },
  {
    id: "px-case",
    label: "a failure or edge case",
    hint: "Name an input or outage that changes the answer.",
    patterns: ["empty", "edge", "fails", "error", "null", "timeout"],
  },
];

const HR_SIGNALS: Signal[] = [
  {
    id: "px-role",
    label: "what you did",
    hint: "Use I, and name the action.",
    patterns: ["i ", "i decided", "i wrote", "i asked", "my role"],
  },
  {
    id: "px-result",
    label: "a result",
    hint: "End with what changed, preferably with a number.",
    patterns: ["result", "increased", "reduced", "shipped", "%", "percent"],
  },
  {
    id: "px-stake",
    label: "the other person",
    hint: "Name who disagreed or who depended on the work.",
    patterns: ["manager", "teammate", "customer", "stakeholder", "we agreed"],
  },
];

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function sealCustomQuestion(value: unknown, index: number): Question | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const track: Track = raw.track === "hr" ? "hr" : raw.track === "technical" ? "technical" : "technical";
  const topic = TOPICS.has(raw.topic as Topic) ? (raw.topic as Topic) : track === "hr" ? "behavioral" : "backend";
  const difficulty: Difficulty =
    raw.difficulty === "warmup" || raw.difficulty === "pressure" || raw.difficulty === "standard"
      ? raw.difficulty
      : "standard";
  const prompt = clean(raw.prompt, 500);
  const setup = clean(raw.setup, 280);
  if (prompt.length < 20 || setup.length < 8) return null;
  const id = typeof raw.id === "string" && /^gx-[1-6]$/.test(raw.id) ? raw.id : `gx-${index + 1}`;
  const signals = track === "hr" ? HR_SIGNALS : TECH_SIGNALS;
  const followUps = [
    {
      signalId: signals[1]?.id ?? signals[0].id,
      prompt:
        track === "hr"
          ? "What did you do yourself, and what changed because of it?"
          : "What fails first, and how would you know?",
    },
    {
      signalId: signals[2]?.id ?? signals[0].id,
      prompt:
        track === "hr"
          ? "Who disagreed, and what did you keep after that conversation?"
          : "Which cost are you accepting, and when would you choose the other design?",
    },
  ];
  return {
    id,
    track,
    topic,
    difficulties: [difficulty],
    minutes: difficulty === "pressure" ? 8 : difficulty === "warmup" ? 4 : 6,
    prompt,
    setup,
    signals,
    followUps,
    outline: [
      "Answer the prompt in the first sentence.",
      track === "hr" ? "Name your action and the result." : "Name the approach, the cost, and one edge case.",
      "Stop before you repeat the setup.",
    ],
  };
}

export function sealCustomQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];
  const questions: Question[] = [];
  for (const entry of value) {
    const sealed = sealCustomQuestion(entry, questions.length);
    if (sealed) questions.push(sealed);
    if (questions.length === 6) break;
  }
  return questions;
}
