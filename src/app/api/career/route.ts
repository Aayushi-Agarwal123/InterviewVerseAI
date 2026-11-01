import { connection } from "next/server";
import { readCoachConfig } from "@/lib/coach/config";
import { mentorBrief, mentorReply } from "@/lib/career/mentor";
import { parseProfile } from "@/lib/career/profile";
import { planInterview } from "@/lib/career/plan";
import { nextAvatarQuestion, type AvatarExchange } from "@/lib/avatar/engine";
import type { AvatarInterviewer } from "@/lib/avatar/provider";
import type { Session } from "@/lib/domain";

const MAX_BODY_BYTES = 64_000;

function respond(body: unknown, status: number, apiKey: string | null): Response {
  const encoded = JSON.stringify(body);
  if (apiKey && apiKey.length >= 12 && encoded.includes(apiKey)) {
    return Response.json({ error: "The career response was withheld." }, { status: 500 });
  }
  return new Response(encoded, {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function readBody(request: Request): Promise<string | null> {
  const header = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(header) && header > MAX_BODY_BYTES) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES ? null : text;
}

function isSessionList(value: unknown): value is Session[] {
  return Array.isArray(value) && value.length <= 40;
}

export async function POST(request: Request) {
  await connection();
  const config = readCoachConfig(process.env);
  const text = await readBody(request);
  if (text === null) return respond({ error: "That request is too large." }, 413, config.apiKey);
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return respond({ error: "Send a JSON body." }, 400, config.apiKey);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return respond({ error: "Send a JSON object." }, 400, config.apiKey);
  }
  const record = body as Record<string, unknown>;
  if (record.action === "personalize") {
    const profile = parseProfile(record.profile);
    if (!profile.ok) return respond({ error: profile.error }, 400, config.apiKey);
    const plan = await planInterview(profile.value, config);
    return respond(
      {
        source: plan.source,
        notice: plan.notice,
        questionIds: plan.questionIds,
        standbyIds: plan.standbyIds,
        prompts: plan.prompts ?? null,
        promptNotes: plan.promptNotes,
        sessionConfig: plan.sessionConfig,
        durationMinutes: plan.durationMinutes,
        profileName: plan.profileName,
      },
      200,
      config.apiKey,
    );
  }
  if (record.action === "mentor") {
    const message = typeof record.message === "string" ? record.message.replace(/\s+/g, " ").trim() : "";
    if (message.length < 2 || message.length > 800) {
      return respond({ error: "Write a mentor question between 2 and 800 characters." }, 400, config.apiKey);
    }
    const profile = record.profile ? parseProfile(record.profile) : { ok: true as const, value: null };
    if (!profile.ok) return respond({ error: profile.error }, 400, config.apiKey);
    if (!isSessionList(record.sessions)) {
      return respond({ error: "Send the saved rounds as a short list." }, 400, config.apiKey);
    }
    const sessions = record.sessions.filter(
      (item): item is Session =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item) && Array.isArray((item as Session).turns),
    );
    const reply = await mentorReply(message, mentorBrief(profile.value, sessions), config);
    return respond(reply, 200, config.apiKey);
  }
  if (record.action === "avatar-next") {
    const profile = parseProfile(record.profile);
    if (!profile.ok) return respond({ error: profile.error }, 400, config.apiKey);
    const interviewer: AvatarInterviewer =
      record.interviewer === "leela" || record.interviewer === "mixed" ? record.interviewer : "arun";
    const askedIds = Array.isArray(record.askedIds)
      ? record.askedIds.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [];
    const history: AvatarExchange[] = Array.isArray(record.history)
      ? record.history
          .filter((item): item is AvatarExchange => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return false;
            const row = item as AvatarExchange;
            return typeof row.prompt === "string" && typeof row.answer === "string";
          })
          .slice(-4)
          .map((item) => ({ prompt: item.prompt.slice(0, 300), answer: item.answer.slice(0, 600) }))
      : [];
    const turn = await nextAvatarQuestion(profile.value, askedIds, history, interviewer, config);
    return respond(
      {
        source: turn.source,
        notice: turn.notice,
        question: turn.question,
      },
      200,
      config.apiKey,
    );
  }
  return respond({ error: "Unknown career action." }, 400, config.apiKey);
}
