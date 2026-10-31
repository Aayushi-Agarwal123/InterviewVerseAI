import type { Difficulty, Dimension, RoleTarget, Topic, Track } from "@/lib/domain";

export const TRACKS: { id: Track; label: string; kicker: string }[] = [
  {
    id: "technical",
    label: "Technical",
    kicker: "Depth, tradeoffs, and what fails",
  },
  {
    id: "hr",
    label: "HR",
    kicker: "Ownership, judgment, and evidence",
  },
];

export const TOPICS: {
  id: Topic;
  track: Track;
  label: string;
  blurb: string;
}[] = [
  {
    id: "dsa",
    track: "technical",
    label: "Data structures",
    blurb: "Invariants, complexity, and the case you would not use.",
  },
  {
    id: "system-design",
    track: "technical",
    label: "System design",
    blurb: "Capacity, data flow, and the first thing that breaks.",
  },
  {
    id: "frontend",
    track: "technical",
    label: "Frontend",
    blurb: "Interfaces, rendering, and what the user actually hits.",
  },
  {
    id: "backend",
    track: "technical",
    label: "Backend",
    blurb: "APIs, data, and failure that does not double-charge.",
  },
  {
    id: "behavioral",
    track: "hr",
    label: "Behavioral",
    blurb: "Ownership stories with a result, not a mood.",
  },
  {
    id: "leadership",
    track: "hr",
    label: "Leadership",
    blurb: "Raising the bar when you do not own the org chart.",
  },
  {
    id: "conflict",
    track: "hr",
    label: "Conflict",
    blurb: "Disagreement without inventing a villain.",
  },
  {
    id: "career",
    track: "hr",
    label: "Career story",
    blurb: "Why this work, told without a slogan.",
  },
];

export const ROLES: { id: RoleTarget; label: string }[] = [
  { id: "new-grad", label: "New grad" },
  { id: "frontend", label: "Frontend engineer" },
  { id: "backend", label: "Backend engineer" },
  { id: "fullstack", label: "Full-stack engineer" },
  { id: "senior", label: "Senior engineer" },
];

export const DIFFICULTIES: {
  id: Difficulty;
  label: string;
  detail: string;
}[] = [
  {
    id: "warmup",
    label: "Warm-up",
    detail: "Shorter prompts. No follow-up. Learn the shape.",
  },
  {
    id: "standard",
    label: "Standard",
    detail: "A follow-up when a core signal is missing.",
  },
  {
    id: "pressure",
    label: "Pressure",
    detail: "A visible timebox, and a follow-up if you skip a signal.",
  },
];

export const DIMENSION_COPY: {
  id: Dimension;
  label: string;
  description: string;
  strength: string;
  improvement: string;
}[] = [
  {
    id: "relevance",
    label: "Relevance",
    description: "Answers the question that was asked.",
    strength: "You stay on the question that was asked.",
    improvement:
      "Open with the decision, then the constraint. The panel loses you when the answer never names the prompt.",
  },
  {
    id: "structure",
    label: "Structure",
    description: "A sequence a panel can follow.",
    strength: "A listener can follow the sequence without rereading.",
    improvement:
      "Signpost. For HR: situation, what you owned, the action, the result. For technical: approach, tradeoff, failure mode.",
  },
  {
    id: "specificity",
    label: "Specificity",
    description: "Numbers, names, and claims a panel can check.",
    strength: "Claims come with numbers, names, or a checkable example.",
    improvement:
      "Replace one adjective with a number, a name, or a before-and-after.",
  },
  {
    id: "depth",
    label: "Depth",
    description: "The signals this prompt is built to surface.",
    strength: "You cover the signals this prompt is listening for.",
    improvement:
      "The missed signals under each question are the probes a panel would still ask. Answer those next time, unprompted.",
  },
  {
    id: "communication",
    label: "Communication",
    description: "Length, sentence shape, and low filler.",
    strength: "The length and the sentences are easy to sit with.",
    improvement:
      "One idea a sentence. Cut basically, kind of, and I think. Stop before the answer turns into a tour.",
  },
];

export function topicById(id: Topic) {
  return TOPICS.find((topic) => topic.id === id) ?? TOPICS[0];
}

export function roleLabel(id: RoleTarget): string {
  return ROLES.find((role) => role.id === id)?.label ?? "Engineer";
}

export function difficultyLabel(id: Difficulty): string {
  return DIFFICULTIES.find((item) => item.id === id)?.label ?? id;
}

export function dimensionCopy(id: Dimension) {
  return DIMENSION_COPY.find((item) => item.id === id) ?? DIMENSION_COPY[0];
}

export type Persona = {
  name: string;
  role: string;
  initials: string;
  line: string;
};

export function personaFor(track: Track): Persona {
  if (track === "hr") {
    return {
      name: "Leela Kapoor",
      role: "Talent partner",
      initials: "LK",
      line: "Tell it as it happened. I am listening for what you did, not what the team generally did.",
    };
  }
  return {
    name: "Arun Mehta",
    role: "Staff engineer",
    initials: "AM",
    line: "Walk me through it. I will stop you if I need a different layer.",
  };
}

export type ScoreBand = "strong" | "solid" | "developing" | "thin";

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "strong";
  if (score >= 65) return "solid";
  if (score >= 50) return "developing";
  return "thin";
}

export function bandLabel(band: ScoreBand): string {
  switch (band) {
    case "strong":
      return "Strong";
    case "solid":
      return "Solid";
    case "developing":
      return "Developing";
    case "thin":
      return "Thin";
  }
}
