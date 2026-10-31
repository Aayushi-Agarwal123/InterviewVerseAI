import { QUESTIONS, getQuestion } from "../src/lib/questions";
import { pickFollowUp, scoreAnswer, weightedOverall } from "../src/lib/engine/score";
import {
  createSession,
  endEarly,
  questionsFor,
  submitAnswer,
} from "../src/lib/engine/session";
import { buildSampleSession } from "../src/lib/engine/sample";
import { currentStreak } from "../src/lib/format";
import { unzipSync, strFromU8 } from "fflate";
import { generateProject } from "../src/lib/builder/generate";
import { sealManifest } from "../src/lib/builder/manifest";
import { LIMITS, safeRelativePath } from "../src/lib/builder/paths";
import { parseBuildRequest, resolveStack } from "../src/lib/builder/request";
import { zipProject } from "../src/lib/builder/zip";
import { publicCoachStatus, readCoachConfig } from "../src/lib/coach/config";
import { ModelCallError } from "../src/lib/coach/errors";
import { evaluateAnswer, writeDebrief } from "../src/lib/coach/evaluate";
import { completeGemini } from "../src/lib/coach/gemini";
import { coachCopy } from "../src/lib/coach/status";
import { evaluationMessages } from "../src/lib/coach/prompt";
import { chooseFollowUp } from "../src/lib/coach/policy";
import { parseEvaluateInput, readCoachVerdict } from "../src/lib/coach/schema";

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

const crlf = readCoachConfig({
  INTERVIEWVERSE_COACH_API_KEY: "sk-test\r\nX-Injected: 1",
  INTERVIEWVERSE_COACH_PROVIDER: "openai",
});
assert(crlf.mode === "local" && crlf.reason === "no-api-key" && crlf.apiKey === null, "crlf key is ignored");
assert(!JSON.stringify(publicCoachStatus(crlf)).includes("Injected"), "crlf status stays public");
assert(hidden.baseUrl === "https://api.openai.com/v1", "default base url");

const loopback = readCoachConfig({
  INTERVIEWVERSE_COACH_API_KEY: secret,
  INTERVIEWVERSE_COACH_PROVIDER: "openai",
  INTERVIEWVERSE_COACH_BASE_URL: "http://127.0.0.1:11434/v1",
});
assert(loopback.mode === "ai" && loopback.baseUrl === "http://127.0.0.1:11434/v1", "loopback http stays");

for (const bad of ["file:///tmp", "javascript:alert(1)", "https://user:pass@api.openai.com/v1"]) {
  let calls = 0;
  const cfg = readCoachConfig({
    INTERVIEWVERSE_COACH_API_KEY: secret,
    INTERVIEWVERSE_COACH_PROVIDER: "openai",
    INTERVIEWVERSE_COACH_BASE_URL: bad,
  });
  assert(cfg.mode === "local" && cfg.reason === "unknown-provider" && cfg.apiKey === null, `bad url ${bad}`);
  const result = await evaluateAnswer(
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
    cfg,
    async () => {
      calls += 1;
      return "{}";
    },
  );
  assert(calls === 0 && result.verdict.source === "local", `bad url does not call ${bad}`);
}

const dims = { relevance: 42, structure: 38, specificity: 30, depth: 28, communication: 40 };
const sampleAnswer =
  "I walk the array once with a hash map of value to index, check the complement before inserting, and return not found when no pair exists.";
const hostile = readCoachVerdict({
  source: "ai",
  score: {
    dimensions: dims,
    overall: 900,
    hitSignalIds: ["dsa-two-sum-hash"],
    missedSignalIds: ["dsa-two-sum-complement"],
    notes: ["Name the empty case."],
  },
  strengths: ["You named a loop."],
  improvements: ["You never said how the pair is found."],
  tips: ["Say the complexity before the walk."],
  sampleAnswer,
  followUp: "What happens if the same index would be used twice?",
});
assert(hostile, "hostile overall still yields a verdict");
assert(hostile.score.overall === weightedOverall(dims), "overall is recomputed");
assert(hostile.score.overall >= 0 && hostile.score.overall <= 100, "recomputed overall is in range");

const huge = "x".repeat(100_000);
assert(
  readCoachVerdict({
    source: "ai",
    score: {
      dimensions: dims,
      overall: 10,
      hitSignalIds: [],
      missedSignalIds: [],
      notes: [],
    },
    strengths: [huge],
    improvements: ["You never said how the pair is found."],
    tips: ["Say the complexity before the walk."],
    sampleAnswer,
  }) === null,
  "a verdict with only an oversized strength is rejected",
);
const mixed = readCoachVerdict({
  source: "ai",
  score: {
    dimensions: dims,
    overall: 10,
    hitSignalIds: [],
    missedSignalIds: [],
    notes: [],
  },
  strengths: ["You named a loop.", huge],
  improvements: ["You never said how the pair is found."],
  tips: ["Say the complexity before the walk."],
  sampleAnswer,
  followUp: `${"Q".repeat(401)}?`,
});
assert(mixed, "mixed strengths still yield a verdict");
assert(mixed.strengths.length === 1 && mixed.strengths[0] === "You named a loop.", "oversized strength is dropped");
assert(mixed.followUp === undefined, "oversized follow-up is dropped");
assert(!JSON.stringify(mixed).includes(huge.slice(0, 40)), "stored verdict omits the oversized strength");

const roundTrip = readCoachVerdict(aiWeak.verdict);
assert(roundTrip, "server verdict stays readable");
assert(roundTrip.score.overall === aiWeak.verdict.score.overall, "server overall is unchanged");
assert(roundTrip.followUp === aiWeak.verdict.followUp, "server follow-up is unchanged");
assert(roundTrip.sampleAnswer === aiWeak.verdict.sampleAnswer, "server sample is unchanged");
const localRoundTrip = readCoachVerdict(localResult.verdict);
assert(localRoundTrip, "local verdict stays readable");
assert(localRoundTrip.score.overall === localResult.verdict.score.overall, "local overall is unchanged");
assert(localRoundTrip.followUp === localResult.verdict.followUp, "local follow-up is unchanged");
assert(!localRoundTrip.sampleAnswer, "local round trip has no sample");

const geminiModel = "gemini-2.5-flash";
const geminiConfig = readCoachConfig({
  INTERVIEWVERSE_COACH_PROVIDER: "gemini",
  INTERVIEWVERSE_COACH_API_KEY: secret,
  INTERVIEWVERSE_COACH_MODEL: geminiModel,
});
assert(geminiConfig.mode === "ai" && geminiConfig.provider === "gemini", "gemini key enables the model coach");
assert(geminiConfig.model === geminiModel, "gemini model comes from the environment");
assert(
  geminiConfig.baseUrl === "https://generativelanguage.googleapis.com/v1beta",
  "gemini uses the developer api by default",
);
assert(!JSON.stringify(publicCoachStatus(geminiConfig)).includes(secret), "gemini status leaked the key");
assert(hidden.provider === "openai", "openai provider stays available");
const geminiCopy = coachCopy("ai", "ready", "gemini");
assert(geminiCopy.label === "Gemini AI Coach", "gemini label");
assert(geminiCopy.detail.includes("Google"), "gemini privacy notice");
assert(coachCopy("local", "no-api-key", null).label === "Local Coach", "local label");
assert(coachCopy("ai", "ready", "openai").label === "AI Coach", "openai label stays");
assert(coachCopy("local", "missing-model", null).detail.includes("MODEL"), "missing model copy");

const geminiWithoutKey = readCoachConfig({ INTERVIEWVERSE_COACH_PROVIDER: "gemini" });
assert(
  geminiWithoutKey.mode === "local" && geminiWithoutKey.reason === "no-api-key" && geminiWithoutKey.apiKey === null,
  "gemini without a key stays local",
);
const geminiMissingModel = readCoachConfig({
  INTERVIEWVERSE_COACH_PROVIDER: "gemini",
  INTERVIEWVERSE_COACH_API_KEY: secret,
});
assert(
  geminiMissingModel.mode === "local" &&
    geminiMissingModel.reason === "missing-model" &&
    geminiMissingModel.apiKey === null,
  "gemini without a model stays local",
);
assert(
  readCoachConfig({
    INTERVIEWVERSE_COACH_PROVIDER: "gemini",
    INTERVIEWVERSE_COACH_API_KEY: secret,
    INTERVIEWVERSE_COACH_MODEL: "../secret",
  }).reason === "missing-model",
  "gemini model id cannot change the request path",
);

const weakInput = {
  questionId: twoSum.id,
  phase: "answering" as const,
  difficulty: "standard" as const,
  role: "backend" as const,
  focus: "",
  hintUsed: false,
  answer: "I would loop.",
  asked: [] as string[],
};

async function withFetch<T>(
  handler: (url: string, init: RequestInit) => Response,
  run: () => Promise<T>,
): Promise<{ result: T; calls: { url: string; init: RequestInit }[] }> {
  const calls: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const next = init ?? {};
    calls.push({ url, init: next });
    return handler(url, next);
  }) as typeof fetch;
  try {
    return { result: await run(), calls };
  } finally {
    globalThis.fetch = original;
  }
}

function geminiResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let localCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  localCalls += 1;
  return geminiResponse(500, {});
}) as typeof fetch;
try {
  const quiet = await evaluateAnswer(twoSum, weakInput, geminiWithoutKey);
  assert(localCalls === 0 && quiet.verdict.source === "local", "local gemini config does not call fetch");
  const unconfigured = await evaluateAnswer(twoSum, weakInput, geminiMissingModel);
  assert(localCalls === 0 && unconfigured.verdict.source === "local", "missing model does not call fetch");
} finally {
  globalThis.fetch = originalFetch;
}

const technical = await withFetch(
  () =>
    geminiResponse(200, {
      candidates: [{ content: { parts: [{ text: modelJson }] }, role: "model" }],
    }),
  () => evaluateAnswer(twoSum, weakInput, geminiConfig),
);
assert(technical.calls.length === 1, "gemini technical call is not retried");
assert(technical.calls[0]?.url.endsWith(`/models/${geminiModel}:generateContent`), "gemini generateContent url");
assert(!technical.calls[0]?.url.includes(secret) && !technical.calls[0]?.url.includes("key="), "key stays out of the url");
assert(new Headers(technical.calls[0]?.init.headers).get("x-goog-api-key") === secret, "key is sent as a header");
const technicalBody = JSON.parse(String(technical.calls[0]?.init.body)) as {
  systemInstruction?: { parts?: { text?: string }[] };
  contents?: { role?: string; parts?: { text?: string }[] }[];
  generationConfig?: { responseMimeType?: string };
};
assert(technicalBody.generationConfig?.responseMimeType === "application/json", "gemini json mode");
assert(technicalBody.contents?.[0]?.role === "user", "gemini user content");
assert(technicalBody.systemInstruction?.parts?.[0]?.text?.includes("Arun Mehta"), "technical persona");
assert(technicalBody.contents?.[0]?.parts?.[0]?.text?.includes("I would loop."), "answer is sent only in ai mode");
assert(technical.result.mode === "ai" && technical.result.verdict.source === "ai", "mocked gemini verdict");
assert(technical.result.verdict.sampleAnswer?.includes("hash map"), "gemini sample kept");
assert(technical.result.verdict.followUp?.includes("same index"), "gemini follow-up kept");
assert(technical.result.verdict.score.overall >= 0 && technical.result.verdict.score.overall <= 100, "gemini overall bounded");
assert(
  technical.result.verdict.score.hitSignalIds.length === weak.hitSignalIds.length,
  "gemini signals stay on the rubric",
);

const hr = await withFetch(
  () =>
    geminiResponse(200, {
      candidates: [{ content: { parts: [{ text: modelJson }] }, role: "model" }],
    }),
  () =>
    evaluateAnswer(
      hrQuestion,
      {
        questionId: hrQuestion.id,
        phase: "answering",
        difficulty: "warmup",
        role: "fullstack",
        focus: "",
        hintUsed: false,
        answer: "I shipped the migration after I cut the scope with the manager.",
        asked: [],
      },
      geminiConfig,
    ),
);
const hrBody = JSON.parse(String(hr.calls[0]?.init.body)) as {
  systemInstruction?: { parts?: { text?: string }[] };
};
assert(hr.calls.length === 1, "gemini hr call is not retried");
assert(hrBody.systemInstruction?.parts?.[0]?.text?.includes("Leela Kapoor"), "hr persona");
assert(hr.result.verdict.followUp === undefined, "warmup still never follows up");
const hrRound = submitAnswer(
  createSession(
    {
      track: "hr",
      topic: hrQuestion.topic,
      difficulty: "warmup",
      role: "fullstack",
      questionCount: 1,
      focus: "",
    },
    { random: () => 0, now: "2026-04-01T10:00:00.000Z", questionIds: [hrQuestion.id] },
  ),
  "I shipped the migration after I cut the scope with the manager.",
  "2026-04-01T10:06:00.000Z",
  hr.result.verdict,
);
assert(hrRound.turns[0]?.answer.includes("migration"), "hr answer is stored");
assert(hrRound.turns[0]?.coach?.source === "ai", "hr debrief keeps the gemini sample");
assert(hrRound.report, "hr round still completes");

const quota = await withFetch(
  () =>
    geminiResponse(429, {
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "You exceeded your current quota, please check your plan and billing details.",
      },
    }),
  () => evaluateAnswer(twoSum, weakInput, geminiConfig),
);
assert(quota.calls.length === 1, "quota is not retried");
assert(quota.result.fellBack && quota.result.verdict.source === "local", "quota falls back to the rubric");
assert(quota.result.notice?.includes("quota") && quota.result.notice.includes("kept"), "quota notice");
assert(!quota.result.notice?.toLowerCase().includes("billing"), "quota notice does not suggest billing");
assert(!quota.result.verdict.sampleAnswer, "quota fallback has no sample answer");
const kept = submitAnswer(
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
  weakInput.answer,
  "2026-04-01T10:04:00.000Z",
  quota.result.verdict,
);
const storedAnswer = kept.phase === "followup" ? kept.active.answer : kept.turns[0]?.answer;
assert(storedAnswer === weakInput.answer, "quota fallback keeps the typed answer");

const limited = await withFetch(
  () => geminiResponse(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Too many requests." } }),
  () => evaluateAnswer(twoSum, weakInput, geminiConfig),
);
assert(limited.calls.length === 1 && limited.result.notice?.includes("rate-limited"), "rate limit notice");

const invalid = await withFetch(
  () =>
    geminiResponse(400, {
      error: { code: 400, status: "INVALID_ARGUMENT", message: `API key not valid. Please pass a valid API key. ${secret}` },
    }),
  async () => {
    try {
      await completeGemini({
        apiKey: secret,
        model: geminiModel,
        baseUrl: geminiConfig.baseUrl,
        temperature: 0.3,
        messages: [{ role: "user", content: "I would loop." }],
        signal: AbortSignal.timeout(1000),
      });
      return "resolved";
    } catch (error) {
      return error instanceof Error ? `${error.name} ${error.message}` : "unknown";
    }
  },
);
assert(invalid.calls.length === 1, "invalid key is not retried");
assert(invalid.result.includes("ModelCallError"), "invalid key is a model error");
assert(!invalid.result.includes(secret) && !invalid.result.includes("not valid"), "invalid key error hides the provider body");

const invalidEval = await withFetch(
  () =>
    geminiResponse(400, {
      error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." },
    }),
  () => evaluateAnswer(twoSum, weakInput, geminiConfig),
);
assert(invalidEval.calls.length === 1, "invalid evaluation is not retried");
assert(invalidEval.result.verdict.source === "local", "invalid key uses the local coach");
assert(invalidEval.result.notice?.includes("rejected") && invalidEval.result.notice.includes("kept"), "invalid key notice");

const malformed = await withFetch(
  () =>
    geminiResponse(200, {
      candidates: [{ content: { parts: [{ text: "not json at all" }] }, role: "model" }],
    }),
  () => evaluateAnswer(twoSum, weakInput, geminiConfig),
);
assert(malformed.calls.length === 1, "malformed text is not retried");
assert(malformed.result.fellBack && malformed.result.notice?.includes("could not be read"), "malformed text notice");
assert(malformed.result.verdict.source === "local", "malformed text uses the rubric");

const emptyReply = await withFetch(
  () => geminiResponse(200, { promptFeedback: { blockReason: "SAFETY" }, candidates: [] }),
  async () => {
    try {
      await completeGemini({
        apiKey: secret,
        model: geminiModel,
        baseUrl: geminiConfig.baseUrl,
        temperature: 0.2,
        messages: [{ role: "user", content: weakInput.answer }],
        signal: AbortSignal.timeout(1000),
      });
      return null;
    } catch (error) {
      return error;
    }
  },
);
assert(emptyReply.calls.length === 1, "empty gemini reply is not retried");
assert(
  emptyReply.result instanceof ModelCallError && emptyReply.result.failure === "unavailable",
  "empty gemini reply is unavailable",
);
assert(!String(emptyReply.result).includes(secret), "empty reply does not leak the key");

const debrief = await withFetch(
  () =>
    geminiResponse(200, {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  narrative: "The loop is a start, and the pair lookup is still missing from the answer.",
                  recommendations: ["Say the complement before the insert."],
                }),
              },
            ],
          },
        },
      ],
    }),
  () =>
    writeDebrief(
      {
        track: "technical",
        topic: "dsa",
        difficulty: "standard",
        role: "backend",
        focus: "",
        turns: [
          {
            prompt: twoSum.prompt,
            answer: weakInput.answer,
            overall: 15,
            strengths: [],
            improvements: [],
          },
        ],
      },
      geminiConfig,
    ),
);
assert(debrief.calls.length === 1, "gemini debrief is one request");
assert(debrief.result.coach?.narrative.includes("pair lookup"), "gemini debrief narrative");
const debriefQuota = await withFetch(
  () =>
    geminiResponse(429, {
      error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for this project." },
    }),
  () =>
    writeDebrief(
      {
        track: "technical",
        topic: "dsa",
        difficulty: "standard",
        role: "backend",
        focus: "",
        turns: [
          {
            prompt: twoSum.prompt,
            answer: weakInput.answer,
            overall: 15,
            strengths: [],
            improvements: [],
          },
        ],
      },
      geminiConfig,
    ),
);
assert(debriefQuota.calls.length === 1 && !debriefQuota.result.coach, "debrief quota keeps the saved scores");
assert(debriefQuota.result.notice?.includes("quota") && debriefQuota.result.notice.includes("saved"), "debrief quota notice");

const builderBrief =
  "Create an online interview preparation platform with practice rounds, feedback, and score tracking.";
assert(!parseBuildRequest({ name: "A", description: builderBrief, frontend: "react-vite", backend: "none", database: "none" }).ok, "short project name");
assert(!parseBuildRequest({ name: "Interview Prep", description: "too short", frontend: "react-vite", backend: "none", database: "none" }).ok, "short project description");
assert(safeRelativePath("../etc/passwd") === null, "reject parent traversal");
assert(safeRelativePath("/tmp/app.ts") === null, "reject absolute path");
assert(safeRelativePath("src/../../secret.ts") === null, "reject nested traversal");
assert(safeRelativePath("node_modules/left-pad/index.js") === null, "reject node_modules");
assert(safeRelativePath(".env") === null, "reject env file");
assert(safeRelativePath(".env.example") === ".env.example", "allow env example");
assert(safeRelativePath("src/index.ts") === "src/index.ts", "allow source path");
assert(!resolveStack("next", "express", "none").ok, "next does not take express");
const viteStack = resolveStack("react-vite", "none", "none");
const nextStack = resolveStack("next", "none", "none");
const expressStack = resolveStack("none", "express", "none");
const expressMongo = resolveStack("none", "express", "mongodb");
const fullStack = resolveStack("react-vite", "express", "mongodb");
assert(viteStack.ok && viteStack.stack === "react-vite", "vite stack");
assert(nextStack.ok && nextStack.stack === "next", "next stack");
assert(expressStack.ok && expressStack.stack === "express", "express stack");
assert(expressMongo.ok && expressMongo.stack === "express", "express can select mongo");
assert(fullStack.ok && fullStack.stack === "fullstack", "fullstack stack");

const stacks = [
  { frontend: "react-vite", backend: "none", database: "none", dependency: "vite", forbidden: "express" },
  { frontend: "next", backend: "none", database: "none", dependency: "next", forbidden: "mongodb" },
  { frontend: "none", backend: "express", database: "none", dependency: "express", forbidden: "react" },
  { frontend: "none", backend: "express", database: "mongodb", dependency: "mongodb", forbidden: "react" },
  { frontend: "react-vite", backend: "express", database: "mongodb", dependency: "mongodb", forbidden: "next" },
] as const;

let builderFetches = 0;
const builderFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  builderFetches += 1;
  throw new Error("builder should not call fetch");
}) as typeof fetch;
try {
  for (const stack of stacks) {
    const parsed = parseBuildRequest({
      name: "Interview Prep",
      description: builderBrief,
      extras: "Keep the first version small.",
      ...stack,
    });
    assert(parsed.ok, `stack parses ${stack.frontend}`);
    if (!parsed.ok) continue;
    const built = await generateProject(parsed.value, readCoachConfig({}));
    assert(built.mode === "local" && built.manifest.source === "local", `local source ${parsed.value.stack}`);
    assert(built.manifest.files.some((entry) => entry.path === "README.md"), "readme exists");
    assert(built.manifest.files.some((entry) => entry.contents.includes("not an AI-generated project")), "local label");
    assert(!built.manifest.files.some((entry) => entry.path.split("/").includes("node_modules")), "no installed modules");
    assert(built.manifest.dependencies.includes(stack.dependency), `dependency ${stack.dependency}`);
    assert(!built.manifest.dependencies.includes(stack.forbidden), `does not depend on ${stack.forbidden}`);
    assert(sealManifest(built.manifest)?.files.length === built.manifest.files.length, "manifest seals");
    const readme = built.manifest.files.find((entry) => entry.path === "README.md")?.contents ?? "";
    assert(readme.includes("What this starter does not include"), "honest limits");
    assert(!readme.includes(secret), "local archive omits the coach key");
  }
  assert(builderFetches === 0, "missing key does not call gemini");
} finally {
  globalThis.fetch = builderFetch;
}

const full = parseBuildRequest({
  name: "Interview Prep",
  description: `AIzaSyA123456789012345678901234 ${builderBrief}`,
  extras: "",
  frontend: "react-vite",
  backend: "express",
  database: "mongodb",
});
assert(full.ok, "fullstack request");
if (full.ok) {
  assert(!full.value.description.includes("AIza"), "brief redacts a pasted key");
  const built = await generateProject(full.value, readCoachConfig({ INTERVIEWVERSE_COACH_API_KEY: secret }));
  const joined = built.manifest.files.map((entry) => entry.contents).join("\n");
  assert(joined.includes("GET /health") || joined.includes('"/health"') || joined.includes("/health"), "health route");
  assert(joined.includes("mongodb"), "mongo driver");
  assert(!joined.includes("AIza"), "zip sources omit the pasted key");
  assert(!joined.includes(secret), "starter omits the server key");
  const env = built.manifest.files.find((entry) => entry.path === "server/.env.example")?.contents ?? "";
  assert(env.includes("MONGODB_URI=\n") && !env.includes("mongodb+srv"), "env example is empty");
  const zipped = zipProject(built.manifest.slug, built.manifest.files, secret);
  assert(zipped, "zip bytes");
  if (zipped) {
    const opened = unzipSync(zipped);
    const names = Object.keys(opened);
    assert(names.length === built.manifest.files.length, "zip preserves every file");
    assert(names.every((entry) => entry.startsWith(`${built.manifest.slug}/`)), "zip keeps the project folder");
    const health = names.find((entry) => entry.endsWith("server/src/index.ts"));
    assert(health && strFromU8(opened[health]).includes("/health"), "zip contains the health route");
    const readmeName = `${built.manifest.slug}/README.md`;
    assert(strFromU8(opened[readmeName]).includes("Interview Prep"), "zip readme names the project");
    assert(!names.some((entry) => entry.includes("node_modules")), "zip skips node_modules");
    assert(!strFromU8(zipped).includes(secret), "zip bytes omit the server key");
  }
}

const oversized = sealManifest({
  source: "local",
  name: "Interview Prep",
  slug: "interview-prep",
  stack: "express",
  files: Array.from({ length: LIMITS.files + 1 }, (_, index) => ({ path: `src/file-${index}.ts`, contents: "export {}\n" })),
});
assert(oversized === null, "file count limit");
const hugeFile = sealManifest({
  source: "local",
  name: "Interview Prep",
  slug: "interview-prep",
  stack: "express",
  files: [{ path: "src/index.ts", contents: "x".repeat(LIMITS.fileChars + 1) }],
});
assert(hugeFile === null, "file size limit");

const geminiRequest = parseBuildRequest({
  name: "Interview Prep",
  description: builderBrief,
  extras: "Mention ownership.",
  frontend: "none",
  backend: "express",
  database: "none",
});
assert(geminiRequest.ok, "gemini builder request");
if (geminiRequest.ok) {
  const analysis = JSON.stringify({
    objective: "Help candidates practice interviews and review their scores.",
    functionalRequirements: ["Practice a written interview round."],
    nonFunctionalRequirements: ["Run locally without a paid account."],
    modules: [{ name: "Practice desk", purpose: "Holds the brief for a later build." }],
  });
  const generated = await withFetch(
    () =>
      geminiResponse(200, {
        candidates: [{ content: { parts: [{ text: analysis }] }, role: "model" }],
      }),
    () => generateProject(geminiRequest.value, geminiConfig),
  );
  assert(generated.calls.length === 1, "builder calls gemini once");
  assert(generated.calls[0]?.url.includes(":generateContent"), "builder uses generateContent");
  assert(!generated.calls[0]?.url.includes(secret), "builder keeps the key out of the url");
  const builderBody = JSON.parse(String(generated.calls[0]?.init.body)) as {
    systemInstruction?: { parts?: { text?: string }[] };
  };
  assert(!builderBody.systemInstruction?.parts?.[0]?.text?.includes("Arun Mehta"), "builder prompt is not an interview");
  assert(generated.result.mode === "gemini" && generated.result.manifest.source === "gemini", "gemini summary");
  assert(generated.result.manifest.objective.includes("practice interviews"), "gemini objective kept");
  assert(
    generated.result.manifest.files.some((entry) => entry.contents.includes("Gemini wrote the requirements summary")),
    "gemini attribution",
  );
  assert(generated.result.manifest.files.some((entry) => entry.path === "src/index.ts"), "template files remain");

  const quotaProject = await withFetch(
    () =>
      geminiResponse(429, {
        error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "You exceeded your current quota." },
      }),
    () => generateProject(geminiRequest.value, geminiConfig),
  );
  assert(quotaProject.calls.length === 1, "builder quota is not retried");
  assert(quotaProject.result.mode === "local" && quotaProject.result.manifest.source === "local", "quota uses the template");
  assert(quotaProject.result.notice?.includes("quota"), "builder quota notice");
  assert(
    quotaProject.result.manifest.files.some((entry) => entry.contents.includes("not an AI-generated project")),
    "quota result is not labeled as AI",
  );

  const broken = await withFetch(
    () => geminiResponse(200, { candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
    () => generateProject(geminiRequest.value, geminiConfig),
  );
  assert(broken.calls.length === 1 && broken.result.manifest.source === "local", "malformed builder reply falls back");
  assert(broken.result.notice?.includes("could not be read"), "malformed builder notice");
}

console.log(
  `engine ok: ${QUESTIONS.length} prompts, strong ${strong.overall}, weak ${weak.overall}, sample ${sample.report?.overall}`,
);
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
