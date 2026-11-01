import { DIMENSION_COPY, topicById } from "@/lib/catalog";
import type { Dimension, Session, Topic, Track } from "@/lib/domain";
import { DIMENSIONS, emptyDimensions } from "@/lib/domain";

export type ScoreBucket = {
  label: string;
  count: number;
  average: number | null;
};

export type PerformanceSnapshot = {
  rounds: number;
  overall: number | null;
  technical: ScoreBucket;
  hr: ScoreBucket;
  model: ScoreBucket;
  local: ScoreBucket;
  dimensions: Record<Dimension, number | null>;
  topics: { topic: Topic; label: string; average: number; count: number }[];
  trend: { at: string; overall: number; source: "model" | "local" | "mixed"; track: Track }[];
  recentAverage: number | null;
  previousAverage: number | null;
  recommendations: string[];
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function bucket(label: string, values: number[]): ScoreBucket {
  return { label, count: values.length, average: average(values) };
}

function turnSource(turn: Session["turns"][number]): "model" | "local" {
  return turn.coach?.source === "ai" ? "model" : "local";
}

export function performanceSnapshot(sessions: Session[]): PerformanceSnapshot {
  const completed = sessions.filter((session) => session.status === "completed" && session.report && !session.sample);
  const technical = completed.filter((session) => session.config.track === "technical").map((session) => session.report?.overall ?? 0);
  const hr = completed.filter((session) => session.config.track === "hr").map((session) => session.report?.overall ?? 0);
  const modelScores: number[] = [];
  const localScores: number[] = [];
  const topicScores = new Map<Topic, number[]>();
  for (const session of completed) {
    const topic = session.config.topic;
    const list = topicScores.get(topic) ?? [];
    list.push(session.report?.overall ?? 0);
    topicScores.set(topic, list);
    for (const turn of session.turns) {
      const score = turn.score.overall;
      if (turnSource(turn) === "model") modelScores.push(score);
      else localScores.push(score);
    }
  }
  const dimensions = emptyDimensions() as Record<Dimension, number | null>;
  for (const dimension of DIMENSIONS) {
    dimensions[dimension] = average(completed.map((session) => session.report?.dimensions[dimension] ?? 0));
  }
  const ordered = [...completed].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const trend = ordered.slice(-12).map((session) => {
    const sources = new Set(session.turns.map(turnSource));
    const source: "model" | "local" | "mixed" =
      sources.size > 1 ? "mixed" : sources.has("model") ? "model" : "local";
    return {
      at: session.updatedAt,
      overall: session.report?.overall ?? 0,
      source,
      track: session.config.track,
    };
  });
  const last = ordered.slice(-5).map((session) => session.report?.overall ?? 0);
  const prior = ordered.slice(-10, -5).map((session) => session.report?.overall ?? 0);
  const weakest = DIMENSION_COPY.map((copy) => ({
    text: copy.improvement,
    score: dimensions[copy.id] ?? 100,
  })).sort((a, b) => a.score - b.score);
  const weakTopic = [...topicScores.entries()].sort((a, b) => average(a[1])! - average(b[1])!)[0];
  const recommendations = weakest.slice(0, 2).map((item) => item.text);
  if (weakTopic) {
    recommendations.push(`Practice another ${topicById(weakTopic[0]).label} round. It is the lowest topic average on this device.`);
  }
  return {
    rounds: completed.length,
    overall: average(completed.map((session) => session.report?.overall ?? 0)),
    technical: bucket("Technical rounds", technical),
    hr: bucket("HR rounds", hr),
    model: bucket("Model coach answers", modelScores),
    local: bucket("Local Coach answers", localScores),
    dimensions,
    topics: [...topicScores.entries()].map(([topic, scores]) => ({
      topic,
      label: topicById(topic).label,
      average: average(scores) ?? 0,
      count: scores.length,
    })),
    trend,
    recentAverage: average(last),
    previousAverage: average(prior),
    recommendations,
  };
}
