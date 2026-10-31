import { QUESTIONS, getQuestion } from "../src/lib/questions";
import { pickFollowUp, scoreAnswer } from "../src/lib/engine/score";
import {
  createSession,
  endEarly,
  questionsFor,
  submitAnswer,
} from "../src/lib/engine/session";
import { buildSampleSession } from "../src/lib/engine/sample";
import { currentStreak } from "../src/lib/format";
import { publicCoachStatus, readCoachConfig } from "../src/lib/coach/config";
import { evaluateAnswer, writeDebrief } from "../src/lib/coach/evaluate";
import { evaluationMessages } from "../src/lib/coach/prompt";
import { chooseFollowUp } from "../src/lib/coach/policy";
import { parseEvaluateInput } from "../src/lib/coach/schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const ids = new Set<string>();
for (const question of QUESTIONS) {
  assert(!ids.has(question.id), `duplicate id ${question.id}`);
  ids.add(question.id);
  assert(question.signals.length >= 3, `${question.id} needs 3 signals`);
  assert(question.followUps.length >= 2, `${question.id} needs follow-ups`);
  assert(question.difficulties.length > 0, `${question.id} needs a difficulty`);
  for (const followUp of question.followUps) {
    assert(
      question.signals.some((signal) => signal.id === followUp.signalId),
      `${question.id} follow-up ${followUp.signalId} is unknown`,
    );
  }
  const topics = {
    dsa: "technical",
    "system-design": "technical",
    frontend: "technical",
    backend: "technical",
    behavioral: "hr",
    leadership: "hr",
    conflict: "hr",
    career: "hr",
  } as const;
  assert(topics[question.topic] === question.track, `${question.id} track mismatch`);
}

assert(QUESTIONS.length >= 40, "question bank is too small");

const twoSum = getQuestion("dsa-two-sum");
assert(twoSum, "missing two sum");

const strong = scoreAnswer({
  question: twoSum,
  difficulty: "standard",
  hintUsed: false,
  text: "I use a hash map from value to index and walk the array once. For each number I look up the complement, target minus the current value, before inserting it so the same index is not reused. That is a single pass, so time is O(n) and extra space is O(n). If the array is empty or no pair exists I return not found.",
});
assert(strong.overall >= 75, `strong two-sum scored ${strong.overall}`);
assert(strong.missedSignalIds.length === 0, "strong two-sum missed a signal");
assert(
  pickFollowUp(twoSum, strong, "standard") === undefined,
  "strong answer should not earn a follow-up",
);

const weak = scoreAnswer({
  question: twoSum,
  difficulty: "standard",
  hintUsed: false,
  text: "I would loop.",
});
assert(weak.overall <= 45, `weak two-sum scored ${weak.overall}`);
assert(pickFollowUp(twoSum, weak, "standard"), "weak answer should follow up");
assert(
  pickFollowUp(twoSum, weak, "warmup") === undefined,
  "warmup never follows up",
);

const pool = questionsFor({
  track: "technical",
  topic: "dsa",
  difficulty: "standard",
});
assert(pool.length >= 5, "dsa standard pool");

const session = createSession(
  {
    track: "technical",
    topic: "dsa",
    difficulty: "standard",
    role: "backend",
    questionCount: 3,
    focus: "failure modes",
  },
  { random: () => 0.2, now: "2026-04-01T10:00:00.000Z" },
);
assert(session.questionIds.length === 3, "session length");
assert(endEarly(session, "   ", "2026-04-01T10:05:00.000Z") === null, "empty end");

let live = submitAnswer(session, "I would loop over pairs.", "2026-04-01T10:06:00.000Z");
if (live.phase === "followup") {
  live = submitAnswer(live, "A hash map.", "2026-04-01T10:07:00.000Z");
}
assert(live.turns.length === 1, "one turn recorded");
assert(live.turns[0]?.coach === undefined, "local turn has no model feedback");

const sample = buildSampleSession("2026-04-02T10:00:00.000Z");
assert(sample.status === "completed", "sample completes");
assert(sample.turns.length === 3, `sample turns ${sample.turns.length}`);
assert(sample.report, "sample report");
assert(
  sample.report.overall >= 55,
  `sample overall ${sample.report.overall}`,
);

const streak = currentStreak(
  ["2026-04-02T08:00:00.000Z", "2026-04-01T08:00:00.000Z"],
  new Date("2026-04-02T12:00:00.000Z"),
);
assert(streak === 2, `streak ${streak}`);

const hrQuestion = QUESTIONS.find((question) => question.track === "hr");
assert(hrQuestion, "hr prompt");
const personaInput = {
  questionId: hrQuestion.id,
  phase: "answering" as const,
  difficulty: "standard" as const,
  role: "fullstack" as const,
  focus: "",
  hintUsed: false,
  answer: "I shipped it.",
  asked: [],
};
assert(evaluationMessages(hrQuestion, personaInput)[0]?.content.includes("Leela Kapoor"), "leela prompt");
assert(
  evaluationMessages(twoSum, { ...personaInput, questionId: twoSum.id })[0]?.content.includes("Arun Mehta"),
  "arun prompt",
);

void (async () => {
const secret = "sk-test-secret-value";
const hidden = readCoachConfig({
  INTERVIEWVERSE_COACH_API_KEY: secret,
  INTERVIEWVERSE_COACH_PROVIDER: "openai",
});
assert(hidden.mode === "ai", "key enables the model coach");
assert(!JSON.stringify(publicCoachStatus(hidden)).includes(secret), "status leaked the key");
assert(readCoachConfig({}).mode === "local", "missing key stays local");
assert(readCoachConfig({}).reason === "no-api-key", "missing key reason");
assert(
  readCoachConfig({
    INTERVIEWVERSE_COACH_PROVIDER: "local",
    INTERVIEWVERSE_COACH_API_KEY: secret,
  }).reason === "forced-local",
  "local provider wins",
);
assert(
  readCoachConfig({
    INTERVIEWVERSE_COACH_PROVIDER: "anthropic",
    INTERVIEWVERSE_COACH_API_KEY: secret,
  }).reason === "unknown-provider",
  "unknown provider stays local",
);
assert(!parseEvaluateInput({ action: "evaluate" }).ok, "empty evaluate body");

const aiConfig = hidden;
let modelCalls = 0;
const localResult = await evaluateAnswer(
  twoSum,
  {
    questionId: twoSum.id,
    phase: "answering",
    difficulty: "standard",
    role: "backend",
    focus: "",
    hintUsed: false,
    answer: "I would loop.",
    asked: [],
  },
  readCoachConfig({}),
  async () => {
    modelCalls += 1;
    return "{}";
  },
);
assert(modelCalls === 0, "local mode must not call the model");
assert(localResult.mode === "local" && localResult.verdict.source === "local", "local verdict");
assert(!localResult.verdict.sampleAnswer, "local verdict has no sample answer");

const modelJson = JSON.stringify({
  dimensions: { relevance: 42, structure: 38, specificity: 30, depth: 28, communication: 40 },
  strengths: ["You named a loop."],
  improvements: ["You never said how the pair is found."],
  tips: ["Say the complexity before the walk."],
  sampleAnswer:
    "I walk the array once with a hash map of value to index, check the complement before inserting, and return not found when no pair exists.",
  followUp: "What happens if the same index would be used twice?",
});
const aiWeak = await evaluateAnswer(
  twoSum,
  {
    questionId: twoSum.id,
    phase: "answering",
    difficulty: "standard",
    role: "backend",
    focus: "failure modes",
    hintUsed: false,
    answer: "I would loop.",
    asked: [],
  },
  aiConfig,
  async () => modelJson,
);
assert(aiWeak.mode === "ai", "model verdict");
assert(aiWeak.verdict.source === "ai", "ai source");
assert(aiWeak.verdict.sampleAnswer?.includes("hash map"), "sample answer kept");
assert(aiWeak.verdict.followUp?.includes("same index"), "dynamic follow-up kept");
assert(aiWeak.verdict.score.hitSignalIds.length === weak.hitSignalIds.length, "signals stay on the rubric");
assert(aiWeak.verdict.score.overall > 0 && aiWeak.verdict.score.overall <= 100, "overall stays in range");

const warmup = await evaluateAnswer(
  twoSum,
  {
    questionId: twoSum.id,
    phase: "answering",
    difficulty: "warmup",
    role: "backend",
    focus: "",
    hintUsed: false,
    answer: "I would loop.",
    asked: [],
  },
  aiConfig,
  async () => modelJson,
);
assert(warmup.verdict.followUp === undefined, "warmup never follows up");

const hinted = await evaluateAnswer(
  twoSum,
  {
    questionId: twoSum.id,
    phase: "answering",
    difficulty: "standard",
    role: "backend",
    focus: "",
    hintUsed: true,
    answer: "I would loop.",
    asked: [],
  },
  aiConfig,
  async () =>
    JSON.stringify({
      ...JSON.parse(modelJson),
      dimensions: { relevance: 42, structure: 38, specificity: 30, depth: 80, communication: 40 },
    }),
);
assert(hinted.verdict.score.dimensions.depth === 68, `nudge depth ${hinted.verdict.score.dimensions.depth}`);

const repeated = chooseFollowUp({
  phase: "answering",
  difficulty: "standard",
  question: twoSum,
  localScore: weak,
  modelFollowUp: twoSum.prompt,
  modelDepth: 20,
  asked: [],
});
assert(repeated === pickFollowUp(twoSum, weak, "standard"), "repeated follow-up falls back to the bank");

const failed = await evaluateAnswer(
  twoSum,
  {
    questionId: twoSum.id,
    phase: "answering",
    difficulty: "standard",
    role: "backend",
    focus: "",
    hintUsed: false,
    answer: "I would loop.",
    asked: [],
  },
  aiConfig,
  async () => {
    throw new Error("socket closed");
  },
);
assert(failed.fellBack && failed.verdict.source === "local", "model failure uses the rubric");
assert(failed.notice?.includes("kept"), "failure notice keeps the answer");

const aiTurn = submitAnswer(
  createSession(
    {
      track: "technical",
      topic: "dsa",
      difficulty: "warmup",
      role: "backend",
      questionCount: 1,
      focus: "",
    },
    { random: () => 0, now: "2026-04-01T10:00:00.000Z", questionIds: ["dsa-two-sum"] },
  ),
  "I use a hash map.",
  "2026-04-01T10:06:00.000Z",
  {
    source: "ai",
    score: strong,
    strengths: ["Named the map."],
    improvements: ["Name the empty case first."],
    tips: ["Lead with the complexity."],
    sampleAnswer: "I use a hash map and check the complement before inserting so one index is not reused.",
  },
);
assert(aiTurn.turns[0]?.coach?.source === "ai", "ai turn stores coach feedback");
assert(aiTurn.report?.overall === strong.overall, "report uses the same overall");

const closed = endEarly(
  createSession(
    {
      track: "technical",
      topic: "dsa",
      difficulty: "standard",
      role: "backend",
      questionCount: 1,
      focus: "",
    },
    { random: () => 0, now: "2026-04-01T10:00:00.000Z", questionIds: ["dsa-two-sum"] },
  ),
  "I would loop and stop.",
  "2026-04-01T10:08:00.000Z",
  aiWeak.verdict,
);
assert(closed?.turns[0]?.answer === "I would loop and stop.", "early close keeps the draft");
assert(closed?.turns[0]?.coach?.sampleAnswer?.includes("hash map"), "early close keeps the sample");

const summary = await writeDebrief(
  {
    track: "technical",
    topic: "dsa",
    difficulty: "standard",
    role: "backend",
    focus: "failure modes",
    turns: [
      {
        prompt: twoSum.prompt,
        answer: "I would loop.",
        overall: 20,
        strengths: ["You named a loop."],
        improvements: ["You never said how the pair is found."],
      },
    ],
  },
  aiConfig,
  async () =>
    JSON.stringify({
      narrative: "The loop is a start, and the pair lookup is still missing from the answer.",
      recommendations: ["Repeat two-sum and say the complement before the insert."],
    }),
);
assert(summary.coach?.narrative.includes("pair lookup"), "debrief narrative");
const localSummary = await writeDebrief(
  {
    track: "hr",
    topic: "behavioral",
    difficulty: "standard",
    role: "fullstack",
    focus: "",
    turns: [
      {
        prompt: "Tell me about a deadline.",
        answer: "We shipped.",
        overall: 40,
        strengths: [],
        improvements: [],
      },
    ],
  },
  readCoachConfig({}),
  async () => {
    throw new Error("should not be called");
  },
);
assert(!localSummary.coach, "local debrief does not invent a narrative");

console.log(
  `engine ok: ${QUESTIONS.length} prompts, strong ${strong.overall}, weak ${weak.overall}, sample ${sample.report?.overall}`,
);
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
