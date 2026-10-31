import { QUESTIONS, getQuestion } from "../src/lib/questions";
import { scoreAnswer, pickFollowUp } from "../src/lib/engine/score";
import {
  createSession,
  endEarly,
  questionsFor,
  submitAnswer,
} from "../src/lib/engine/session";
import { buildSampleSession } from "../src/lib/engine/sample";
import { currentStreak } from "../src/lib/format";

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

console.log(
  `engine ok: ${QUESTIONS.length} prompts, strong ${strong.overall}, weak ${weak.overall}, sample ${sample.report.overall}`,
);
