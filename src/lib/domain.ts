export type Track = "technical" | "hr";

export type Topic =
  | "dsa"
  | "system-design"
  | "frontend"
  | "backend"
  | "behavioral"
  | "leadership"
  | "conflict"
  | "career";

export type Difficulty = "warmup" | "standard" | "pressure";

export type RoleTarget =
  | "new-grad"
  | "frontend"
  | "backend"
  | "fullstack"
  | "senior";

export type Dimension =
  | "relevance"
  | "structure"
  | "specificity"
  | "depth"
  | "communication";

export type Signal = {
  id: string;
  label: string;
  hint: string;
  patterns: string[];
};

export type Question = {
  id: string;
  track: Track;
  topic: Topic;
  difficulties: Difficulty[];
  minutes: number;
  prompt: string;
  setup: string;
  signals: Signal[];
  followUps: { signalId: string; prompt: string }[];
  outline: string[];
};

export type AnswerScore = {
  dimensions: Record<Dimension, number>;
  overall: number;
  hitSignalIds: string[];
  missedSignalIds: string[];
  notes: string[];
};

export type TurnCoach = {
  source: "ai";
  strengths: string[];
  improvements: string[];
  tips: string[];
  sampleAnswer: string;
};

export type Turn = {
  questionId: string;
  prompt: string;
  answer: string;
  hintUsed: boolean;
  followUpPrompt?: string;
  followUpAnswer?: string;
  score: AnswerScore;
  coach?: TurnCoach;
};

export type CoachVerdict = {
  source: "ai" | "local";
  score: AnswerScore;
  followUp?: string;
  strengths: string[];
  improvements: string[];
  tips: string[];
  sampleAnswer?: string;
};

export type SessionConfig = {
  track: Track;
  topic: Topic;
  difficulty: Difficulty;
  role: RoleTarget;
  questionCount: number;
  focus: string;
};

export type ActivePrompt = {
  answer: string;
  hintUsed: boolean;
  followUpPrompt?: string;
};

export type SessionPhase = "answering" | "followup" | "done";

export type ReportCoach = {
  source: "ai";
  narrative: string;
  recommendations: string[];
};

export type Report = {
  overall: number;
  dimensions: Record<Dimension, number>;
  headline: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextPractice: string;
  coach?: ReportCoach;
};

export type SessionKind = "bank" | "personalized" | "voice";

export type Session = {
  id: string;
  createdAt: string;
  updatedAt: string;
  questionStartedAt: string;
  config: SessionConfig;
  questionIds: string[];
  index: number;
  phase: SessionPhase;
  active: ActivePrompt;
  draft: string;
  turns: Turn[];
  status: "active" | "completed";
  sample?: boolean;
  report?: Report;
  coachNotice?: string;
  kind?: SessionKind;
  voice?: boolean;
  prompts?: Record<string, Question>;
  standbyIds?: string[];
  promptNotes?: Record<string, string>;
  durationMinutes?: number;
  planSource?: "gemini" | "bank";
  profileName?: string;
};

export const DIMENSIONS: Dimension[] = [
  "relevance",
  "structure",
  "specificity",
  "depth",
  "communication",
];

export function emptyDimensions(): Record<Dimension, number> {
  return {
    relevance: 0,
    structure: 0,
    specificity: 0,
    depth: 0,
    communication: 0,
  };
}

export function freshActive(): ActivePrompt {
  return { answer: "", hintUsed: false };
}
