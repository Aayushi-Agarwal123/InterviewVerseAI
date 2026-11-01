import { DIMENSION_COPY, topicById } from "@/lib/catalog";
import type { Dimension, Session, Topic } from "@/lib/domain";
import { DIMENSIONS } from "@/lib/domain";
import type { CandidateProfile } from "@/lib/career/profile";

export type RoadmapTask = {
  id: string;
  horizon: "today" | "week" | "skill";
  title: string;
  detail: string;
  done: boolean;
  auto: boolean;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function weekKey(iso: string): string {
  const date = new Date(iso);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return `${date.getUTCFullYear()}-W${Math.floor(diff / 7)}`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildRoadmap(
  sessions: Session[],
  profile: CandidateProfile | null,
  manualDone: string[],
  now?: string,
): RoadmapTask[] {
  const clock = now ?? new Date().toISOString();
  const completed = sessions.filter((session) => session.status === "completed" && session.report && !session.sample);
  const dimensionScores = new Map<Dimension, number[]>();
  const topicScores = new Map<Topic, number[]>();
  for (const session of completed) {
    for (const dimension of DIMENSIONS) {
      const list = dimensionScores.get(dimension) ?? [];
      list.push(session.report?.dimensions[dimension] ?? 0);
      dimensionScores.set(dimension, list);
    }
    const topics = topicScores.get(session.config.topic) ?? [];
    topics.push(session.report?.overall ?? 0);
    topicScores.set(session.config.topic, topics);
  }
  const weakestDimension =
    [...dimensionScores.entries()].sort((a, b) => average(a[1]) - average(b[1]))[0]?.[0] ?? "specificity";
  const weakestTopic =
    [...topicScores.entries()].sort((a, b) => average(a[1]) - average(b[1]))[0]?.[0] ??
    (profile?.interviewType === "hr" ? "behavioral" : "backend");
  const today = dayKey(clock);
  const week = weekKey(clock);
  const todayDone = completed.some(
    (session) => dayKey(session.updatedAt) === today && session.config.topic === weakestTopic,
  );
  const weekRounds = completed.filter((session) => weekKey(session.updatedAt) === week).length;
  const copy = DIMENSION_COPY.find((item) => item.id === weakestDimension);
  const manual = new Set(manualDone);
  const tasks: RoadmapTask[] = [
    {
      id: `today-${weakestTopic}`,
      horizon: "today",
      title: `Answer one ${topicById(weakestTopic).label} prompt`,
      detail: profile
        ? `${profile.name}, this is the weakest topic saved on this device. One focused round is today's goal.`
        : "This is the weakest topic saved on this device.",
      done: todayDone || manual.has(`today-${weakestTopic}`),
      auto: todayDone,
    },
    {
      id: "week-rounds",
      horizon: "week",
      title: "Finish three scored rounds this week",
      detail: `${weekRounds} of 3 completed rounds fall in this week.`,
      done: weekRounds >= 3 || manual.has("week-rounds"),
      auto: weekRounds >= 3,
    },
    {
      id: "week-coding",
      horizon: "week",
      title: "Solve two coding arena problems",
      detail: "Use the arena's in-browser JavaScript runner. Mark this done after two passing submissions.",
      done: manual.has("week-coding"),
      auto: false,
    },
    {
      id: `skill-${weakestDimension}`,
      horizon: "skill",
      title: `Raise ${copy?.label ?? weakestDimension}`,
      detail: copy?.improvement ?? "Answer with one concrete example and one limit.",
      done: manual.has(`skill-${weakestDimension}`),
      auto: false,
    },
  ];
  if (profile) {
    for (const skill of profile.skills.slice(0, 3)) {
      const id = `skill-read-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      tasks.push({
        id,
        horizon: "skill",
        title: `Explain ${skill} out loud`,
        detail: `Target role: ${profile.role}. Spend ten minutes on one tradeoff, then answer a related prompt.`,
        done: manual.has(id),
        auto: false,
      });
    }
  }
  return tasks;
}
