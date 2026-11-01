import { connection } from "next/server";
import { publicCoachStatus, readCoachConfig, type CoachRuntime } from "@/lib/coach/config";
import { evaluateAnswer, writeDebrief } from "@/lib/coach/evaluate";
import {
  parseDebriefInput,
  parseEvaluateInput,
  readCoachVerdict,
  readReportCoach,
} from "@/lib/coach/schema";
import { sealCustomQuestion } from "@/lib/career/custom";
import { getQuestion } from "@/lib/questions";

const MAX_BODY_BYTES = 320_000;

function respond(body: unknown, status: number, apiKey: string | null): Response {
  const encoded = JSON.stringify(body);
  if (apiKey && apiKey.length >= 12 && encoded.includes(apiKey)) {
    return Response.json({ error: "The coach response was withheld." }, { status: 500 });
  }
  return new Response(encoded, {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function readBody(request: Request): Promise<string | null> {
  const header = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(header) && header > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) {
    const text = await request.text();
    return new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES ? null : text;
  }
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function GET() {
  await connection();
  const config = readCoachConfig(process.env);
  return respond(publicCoachStatus(config), 200, config.apiKey);
}

export async function POST(request: Request) {
  await connection();
  const config = readCoachConfig(process.env);
  const text = await readBody(request);
  if (text === null) {
    return respond({ error: "That round is too large to score." }, 413, config.apiKey);
  }

  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return respond({ error: "Send a JSON body." }, 400, config.apiKey);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return respond({ error: "Send a JSON object." }, 400, config.apiKey);
  }

  const action = (body as { action?: unknown }).action;
  if (action === "evaluate") return evaluate(body, config);
  if (action === "evaluate-custom") return evaluateCustom(body, config);
  if (action === "debrief") return debrief(body, config);
  return respond({ error: "Unknown coach action." }, 400, config.apiKey);
}

async function evaluate(body: unknown, config: CoachRuntime): Promise<Response> {
  const parsed = parseEvaluateInput(body);
  if (!parsed.ok) return respond({ error: parsed.error }, 400, config.apiKey);
  const question = getQuestion(parsed.value.questionId);
  if (!question) return respond({ error: "That prompt is not in the bank." }, 400, config.apiKey);
  const result = await evaluateAnswer(question, parsed.value, config);
  const verdict = readCoachVerdict(result.verdict);
  if (!verdict) return respond({ error: "The coach response was withheld." }, 500, config.apiKey);
  return respond({ ...result, verdict }, 200, config.apiKey);
}

async function evaluateCustom(body: unknown, config: CoachRuntime): Promise<Response> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return respond({ error: "Send a JSON object." }, 400, config.apiKey);
  }
  const record = body as Record<string, unknown>;
  const question = sealCustomQuestion(record.question, 0);
  if (!question) return respond({ error: "That custom prompt could not be scored." }, 400, config.apiKey);
  const parsed = parseEvaluateInput({ ...record, questionId: question.id });
  if (!parsed.ok) return respond({ error: parsed.error }, 400, config.apiKey);
  const result = await evaluateAnswer(question, parsed.value, config);
  const verdict = readCoachVerdict(result.verdict);
  if (!verdict) return respond({ error: "The coach response was withheld." }, 500, config.apiKey);
  return respond({ ...result, verdict }, 200, config.apiKey);
}

async function debrief(body: unknown, config: CoachRuntime): Promise<Response> {
  const parsed = parseDebriefInput(body);
  if (!parsed.ok) return respond({ error: parsed.error }, 400, config.apiKey);
  const result = await writeDebrief(parsed.value, config);
  if (!result.coach) return respond(result, 200, config.apiKey);
  const coach = readReportCoach(result.coach);
  if (!coach) return respond({ error: "The coach response was withheld." }, 500, config.apiKey);
  return respond({ ...result, coach }, 200, config.apiKey);
}
