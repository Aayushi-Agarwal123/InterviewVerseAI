import { connection } from "next/server";
import { publicCoachStatus, readCoachConfig } from "@/lib/coach/config";
import { evaluateAnswer, writeDebrief } from "@/lib/coach/evaluate";
import { parseDebriefInput, parseEvaluateInput } from "@/lib/coach/schema";
import { getQuestion } from "@/lib/questions";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export async function GET() {
  await connection();
  const config = readCoachConfig(process.env);
  return json(publicCoachStatus(config));
}

export async function POST(request: Request) {
  await connection();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > 100_000) {
    return json({ error: "That round is too large to score." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send a JSON body." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Send a JSON object." }, 400);
  }

  const action = (body as { action?: unknown }).action;
  const config = readCoachConfig(process.env);

  if (action === "evaluate") {
    const parsed = parseEvaluateInput(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const question = getQuestion(parsed.value.questionId);
    if (!question) return json({ error: "That prompt is not in the bank." }, 400);
    const result = await evaluateAnswer(question, parsed.value, config);
    return json(result);
  }

  if (action === "debrief") {
    const parsed = parseDebriefInput(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const result = await writeDebrief(parsed.value, config);
    return json(result);
  }

  return json({ error: "Unknown coach action." }, 400);
}
