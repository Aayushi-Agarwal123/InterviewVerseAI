import { DIMENSION_COPY, dimensionCopy, topicById } from "@/lib/catalog";
import type {
  AnswerScore,
  Difficulty,
  Dimension,
  Question,
  Report,
  Session,
  SessionConfig,
} from "@/lib/domain";
import { DIMENSIONS, emptyDimensions } from "@/lib/domain";
import {
  clampScore,
  keywordsFrom,
  sentencesOf,
  textHas,
  textHasAny,
  wordCount,
} from "@/lib/text";

const FILLERS = [
  "basically",
  "kind of",
  "sort of",
  "you know",
  "i think",
  "stuff",
  "a bit",
];

const LENGTH_BAND: Record<Difficulty, { min: number; max: number }> = {
  warmup: { min: 35, max: 180 },
  standard: { min: 50, max: 260 },
  pressure: { min: 60, max: 280 },
};

function countPatterns(text: string, patterns: RegExp[]): number {
  return patterns.reduce(
    (total, pattern) => total + (pattern.test(text) ? 1 : 0),
    0,
  );
}

function relevanceScore(question: Question, text: string, words: number): number {
  const keywords = keywordsFrom(`${question.prompt} ${question.setup}`);
  const covered = keywords.filter((word) => textHas(text, word)).length;
  const ratio = keywords.length === 0 ? 0.6 : covered / keywords.length;
  let score = Math.sqrt(ratio) * 100;
  if (words < 35) score = Math.min(score, 68);
  if (words < 12) score = Math.min(score, 30);
  return clampScore(score);
}

function structureScore(question: Question, text: string): number {
  const lower = text.toLowerCase();
  const sentences = sentencesOf(text);
  let score = 28;
  if (sentences.length >= 2) score += 14;
  if (sentences.length >= 4) score += 10;
  const markers = countPatterns(lower, [
    /\bfirst\b/,
    /\bthen\b/,
    /\bnext\b/,
    /\bafter that\b/,
    /\bbecause\b/,
    /\bso that\b/,
    /\btrade-?off/,
    /\balternatively\b/,
    /\binstead\b/,
    /\bdownside\b/,
    /\bon the other hand\b/,
    /\bfinally\b/,
    /\bbefore\b/,
    /\bso\b/,
  ]);
  if (markers >= 1) score += 18;
  if (markers >= 3) score += 12;
  if (/\b(start by|the approach|i would|i'd)\b/.test(lower)) score += 8;

  if (question.track === "hr") {
    const star = countPatterns(lower, [
      /\b(when|while|during|at the time|last (year|quarter|sprint)|situation|context|we were|the team was)\b/,
      /\b(i owned|i was responsible|my role|i needed to|the goal was|i had to|task was)\b/,
      /\b(i (decided|built|wrote|asked|led|talked|shipped|cut|designed|proposed|paired|reviewed|called|met|told|pushed)|we agreed)\b/,
      /\b(result|as a result|ended up|outcome|shipped|reduced|increased|learned|saved|on time|percent)\b/,
    ]);
    const starScore = (star / 4) * 100;
    score = score * 0.4 + starScore * 0.6;
  }

  return clampScore(score);
}

function specificityScore(text: string, words: number): number {
  const lower = text.toLowerCase();
  const hits = countPatterns(lower, [
    /\d/,
    /%|percent/,
    /\bo\([^)]+\)/,
    /\b(users|customers|requests|tickets|engineers|people|days|weeks|months|hours|minutes|seconds|latency|revenue|qps)\b/,
    /\b(for example|for instance|specifically|in particular)\b/,
    /\b(react|sql|postgres|redis|kafka|queue|index|cache|jwt|http|css|api|transaction|shard|replica|hash map|linked list)\b/,
  ]);
  let score = 20 + hits * 18;
  if (words < 25) score = Math.min(score, 46);
  return clampScore(score);
}

function depthScore(
  question: Question,
  text: string,
  words: number,
  hintUsed: boolean,
): { score: number; hit: string[]; missed: string[] } {
  const hit = question.signals
    .filter((signal) => textHasAny(text, signal.patterns))
    .map((signal) => signal.id);
  const missed = question.signals
    .filter((signal) => !hit.includes(signal.id))
    .map((signal) => signal.id);
  const ratio =
    question.signals.length === 0 ? 0 : hit.length / question.signals.length;
  let score = ratio * 100;
  if (hintUsed) score -= 12;
  if (words < 20) score = Math.min(score, 36);
  return { score: clampScore(score), hit, missed };
}

function communicationScore(
  text: string,
  words: number,
  difficulty: Difficulty,
): number {
  const band = LENGTH_BAND[difficulty];
  let length = 100;
  if (words < band.min) {
    length = Math.max(18, (words / band.min) * 100);
  } else if (words > band.max) {
    length = Math.max(35, 100 - (words - band.max) / 8);
  }

  const sentences = sentencesOf(text);
  const average =
    sentences.length === 0 ? words : words / sentences.length;
  let shape = 100;
  if (average < 8 || average > 32) shape = 58;
  if (sentences.length < 2 && words > 45) shape = 42;

  const lower = text.toLowerCase();
  const fillers = FILLERS.reduce(
    (total, filler) => total + (textHas(lower, filler) ? 1 : 0),
    0,
  );
  const penalty = Math.min(24, fillers * 6);
  return clampScore(length * 0.72 + shape * 0.28 - penalty);
}

export function coachNotes(
  question: Question,
  score: Pick<AnswerScore, "dimensions" | "missedSignalIds">,
  hintUsed: boolean,
): string[] {
  const notes: string[] = [];
  const missed = question.signals.find((signal) =>
    score.missedSignalIds.includes(signal.id),
  );
  if (missed) {
    notes.push(`You never land “${missed.label}”. ${missed.hint}`);
  }
  const ordered = [...DIMENSIONS].sort(
    (a, b) => score.dimensions[a] - score.dimensions[b],
  );
  for (const dimension of ordered) {
    if (notes.length >= 3) break;
    if (score.dimensions[dimension] >= 62) continue;
    if (dimension === "depth" && missed) continue;
    notes.push(dimensionCopy(dimension).improvement);
  }
  if (hintUsed) {
    notes.push("A nudge was used here, so depth is capped a little.");
  }
  if (notes.length === 0) {
    notes.push(
      "The signals for this prompt are present. Next time, put the conclusion in the first sentence so the panel hears it before the tour.",
    );
  }
  return notes.slice(0, 3);
}

export function weightedOverall(dimensions: Record<Dimension, number>): number {
  return clampScore(
    dimensions.relevance * 0.18 +
      dimensions.structure * 0.2 +
      dimensions.specificity * 0.18 +
      dimensions.depth * 0.28 +
      dimensions.communication * 0.16,
  );
}

export function scoreAnswer(input: {
  question: Question;
  text: string;
  hintUsed: boolean;
  difficulty: Difficulty;
}): AnswerScore {
  const text = input.text.trim();
  const words = wordCount(text);
  const dimensions = emptyDimensions();
  dimensions.relevance = relevanceScore(input.question, text, words);
  dimensions.structure = structureScore(input.question, text);
  dimensions.specificity = specificityScore(text, words);
  const depth = depthScore(input.question, text, words, input.hintUsed);
  dimensions.depth = depth.score;
  dimensions.communication = communicationScore(
    text,
    words,
    input.difficulty,
  );

  const overall = weightedOverall(dimensions);

  const partial = {
    dimensions,
    missedSignalIds: depth.missed,
  };
  return {
    dimensions,
    overall,
    hitSignalIds: depth.hit,
    missedSignalIds: depth.missed,
    notes: coachNotes(input.question, partial, input.hintUsed),
  };
}

export function pickFollowUp(
  question: Question,
  score: AnswerScore,
  difficulty: Difficulty,
): string | undefined {
  if (difficulty === "warmup") return undefined;
  if (difficulty === "standard" && score.dimensions.depth >= 72) {
    return undefined;
  }
  for (const followUp of question.followUps) {
    if (score.missedSignalIds.includes(followUp.signalId)) {
      return followUp.prompt;
    }
  }
  return undefined;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function weakestDimension(dimensions: Record<Dimension, number>): Dimension {
  return [...DIMENSIONS].sort((a, b) => dimensions[a] - dimensions[b])[0];
}

export function buildReport(session: Session): Report {
  const dimensions = emptyDimensions();
  for (const dimension of DIMENSIONS) {
    dimensions[dimension] = average(
      session.turns.map((turn) => turn.score.dimensions[dimension]),
    );
  }
  const overall = average(session.turns.map((turn) => turn.score.overall));
  const weak = weakestDimension(dimensions);
  const weakCopy = dimensionCopy(weak);
  const topic = topicById(session.config.topic).label;
  const strengths = DIMENSION_COPY.filter(
    (item) => dimensions[item.id] >= 72,
  ).map((item) => item.strength);
  if (strengths.length === 0) {
    strengths.push("You closed the round. Most practice stops before a score exists.");
  }

  const improvements = [weak, ...DIMENSIONS.filter((item) => item !== weak)]
    .slice(0, 2)
    .map((dimension) => dimensionCopy(dimension).improvement);

  let headline = "This round would not yet change a hiring decision.";
  if (overall >= 85) headline = "You would survive this round of the onsite.";
  else if (overall >= 70) {
    headline = "A credible round, with one gap a panel would still probe.";
  } else if (overall >= 55) {
    headline = "The shape is there. The evidence is still thin.";
  }

  const focus = session.config.focus.trim();
  const focusLine = focus
    ? ` You asked to lean into “${focus}”. Check whether the answers actually stayed there.`
    : "";

  return {
    overall,
    dimensions,
    headline,
    summary: `${topic} landed at ${overall}. The soft spot is ${weakCopy.label.toLowerCase()}: ${weakCopy.description.charAt(0).toLowerCase()}${weakCopy.description.slice(1)}${focusLine}`,
    strengths: strengths.slice(0, 3),
    improvements,
    nextPractice: nextPractice(session.config, weak),
  };
}

function nextPractice(config: SessionConfig, weak: Dimension): string {
  const topic = topicById(config.topic).label;
  if (config.track === "hr" && (weak === "structure" || weak === "specificity")) {
    return "Run Behavioral again and put a number in the result of every story.";
  }
  if (config.track === "hr" && weak === "depth") {
    return `Stay on ${topic}, and answer the missed signal before Leela has to ask for it.`;
  }
  if (weak === "depth" || weak === "specificity") {
    return `Repeat ${topic} on Warm-up. Say the failure mode before you talk about the happy path.`;
  }
  if (weak === "communication") {
    return `Repeat one ${topic} prompt in half the words. First sentence is the decision.`;
  }
  return `One more ${topic} round. Open each answer by naming the constraint in the prompt.`;
}
