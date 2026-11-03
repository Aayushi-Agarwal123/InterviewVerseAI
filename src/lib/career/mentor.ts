import type { CoachRuntime } from "@/lib/coach/config";
import { completeGemini } from "@/lib/coach/gemini";
import { DIMENSION_COPY, topicById } from "@/lib/catalog";
import type { Session } from "@/lib/domain";
import type { CandidateProfile } from "@/lib/career/profile";
import { performanceSnapshot } from "@/lib/career/analytics";
import { redactSensitiveText } from "@/lib/security/redact";

export type MentorBrief = {
  name: string;
  role: string;
  company: string;
  skills: string[];
  weakest: string;
  overall: number | null;
  modelCount: number;
  localCount: number;
  recentTopics: string[];
};

const CONCEPTS: { key: string; title: string; body: string }[] = [
  {
    key: "hash",
    title: "Hash map",
    body: "A hash map stores a value under a key so the next lookup is expected constant time. In an interview, say what the key is, when you insert it, and what happens on a collision or a missing key.",
  },
  {
    key: "index",
    title: "Database index",
    body: "An index is a separate structure that finds rows without scanning the table. It speeds reads and slows writes. Name the column, the query it serves, and the write cost.",
  },
  {
    key: "rest",
    title: "REST API",
    body: "A REST API names resources and uses HTTP methods for list, create, update, and delete. Say which status you return on a missing record and how you avoid doing the same write twice.",
  },
  {
    key: "star",
    title: "STAR answer",
    body: "Situation, task, action, result. The action should be yours, and the result should be something a panel can check. One number is enough.",
  },
];

export function mentorBrief(profile: CandidateProfile | null, sessions: Session[]): MentorBrief {
  const snapshot = performanceSnapshot(sessions);
  const weakest =
    snapshot.topics.slice().sort((a, b) => a.average - b.average)[0]?.label ??
    DIMENSION_COPY.slice().sort(
      (a, b) => (snapshot.dimensions[a.id] ?? 100) - (snapshot.dimensions[b.id] ?? 100),
    )[0]?.label ??
    "Specificity";
  const recentTopics = sessions
    .filter((session) => session.status === "completed")
    .slice(0, 5)
    .map((session) => topicById(session.config.topic).label);
  return {
    name: profile?.name ?? "there",
    role: profile?.role ?? "the role you have not named yet",
    company: profile?.company ?? "",
    skills: profile?.skills ?? [],
    weakest,
    overall: snapshot.overall,
    modelCount: snapshot.model.count,
    localCount: snapshot.local.count,
    recentTopics,
  };
}

export function localMentorReply(message: string, brief: MentorBrief): string {
  const text = message.toLowerCase();
  const concept = CONCEPTS.find((item) => text.includes(item.key));
  const company = brief.company ? ` at ${brief.company}` : "";
  const score =
    brief.overall === null
      ? "There is no completed round saved on this device yet."
      : `The saved overall average is ${brief.overall}. ${brief.modelCount} answers were scored by a model coach and ${brief.localCount} by the Local Coach. Those are separate counts.`;
  if (concept) {
    return `${concept.title}: ${concept.body} For ${brief.role}${company}, practice it once in your own words, then answer a prompt that forces the tradeoff. ${score}`;
  }
  if (text.includes("question") || text.includes("practice")) {
    return `Practice ${brief.weakest} next. ${brief.name}, pick one prompt in that area and answer with a decision, a constraint, and a result. ${score}`;
  }
  return `${brief.name}, the target role on file is ${brief.role}${company}. The weakest saved area is ${brief.weakest}. Today's action: write one answer that names what you did, what it cost, and how you would check it. ${score} Skills on the profile: ${brief.skills.join(", ") || "none saved"}. Recent topics: ${brief.recentTopics.join(", ") || "none yet"}.`;
}

function readReply(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { reply?: unknown };
    if (typeof parsed.reply !== "string") return null;
    const reply = parsed.reply.replace(/\s+/g, " ").trim();
    if (reply.length < 40 || reply.length > 1200) return null;
    return redactSensitiveText(reply);
  } catch {
    return null;
  }
}

export async function mentorReply(
  message: string,
  brief: MentorBrief,
  config: CoachRuntime,
  fetchImpl?: typeof fetch,
): Promise<{ source: "gemini" | "local"; text: string; notice?: string }> {
  const local = localMentorReply(message, brief);
  const ready = config.mode === "ai" && config.provider === "gemini" && Boolean(config.apiKey) && Boolean(config.model);
  if (!ready || !config.apiKey) {
    return { source: "local", text: local, notice: "Gemini is not configured. This reply uses the saved profile and scores." };
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
              'You are a career mentor. Return JSON only: {"reply":""}. Use only the scores and topics in the brief. Do not invent interviews, employers, or scores. Give one next action. 80 to 500 characters.',
          },
          {
            role: "user",
            content: `Brief: ${JSON.stringify(brief)}\n\nCandidate: ${message}`,
          },
        ],
      },
      fetchImpl,
    );
    const reply = readReply(text);
    if (!reply) return { source: "local", text: local, notice: "Gemini did not return a usable reply. Showing the local mentor." };
    return { source: "gemini", text: reply };
  } catch {
    return { source: "local", text: local, notice: "Gemini did not answer. Showing the local mentor." };
  }
}
