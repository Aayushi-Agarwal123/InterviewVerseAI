import { connection } from "next/server";
import { readCoachConfig, type CoachRuntime } from "@/lib/coach/config";
import { generateProject, geminiBuilderReady } from "@/lib/builder/generate";
import { sealManifest } from "@/lib/builder/manifest";
import { parseBuildRequest } from "@/lib/builder/request";
import { zipProject } from "@/lib/builder/zip";

const MAX_BODY_BYTES = 320_000;

function respond(body: unknown, status: number, apiKey: string | null): Response {
  const encoded = JSON.stringify(body);
  if (apiKey && apiKey.length >= 12 && encoded.includes(apiKey)) {
    return Response.json({ error: "The builder response was withheld." }, { status: 500 });
  }
  return new Response(encoded, {
    status,
    headers: { "content-type": "application/json" },
  });
}

function builderStatus(config: CoachRuntime) {
  if (geminiBuilderReady(config)) return { mode: "gemini" as const, reason: "ready" as const };
  if (config.reason === "missing-model") return { mode: "local" as const, reason: "missing-model" as const };
  if (config.reason === "forced-local") return { mode: "local" as const, reason: "forced-local" as const };
  if (!config.apiKey || config.reason === "no-api-key") {
    return { mode: "local" as const, reason: "no-api-key" as const };
  }
  return { mode: "local" as const, reason: "not-gemini" as const };
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
  return respond(builderStatus(config), 200, config.apiKey);
}

export async function POST(request: Request) {
  await connection();
  const config = readCoachConfig(process.env);
  const text = await readBody(request);
  if (text === null) return respond({ error: "That brief is too large to scaffold." }, 413, config.apiKey);
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
  if (action === "generate") return generate(body, config);
  if (action === "download") return download(body, config);
  return respond({ error: "Unknown builder action." }, 400, config.apiKey);
}

async function generate(body: unknown, config: CoachRuntime): Promise<Response> {
  const parsed = parseBuildRequest(body);
  if (!parsed.ok) return respond({ error: parsed.error }, 400, config.apiKey);
  const result = await generateProject(parsed.value, config);
  const sealed = sealManifest(result.manifest);
  if (!sealed) return respond({ error: "The starter could not be sealed." }, 500, config.apiKey);
  return respond({ mode: result.mode, notice: result.notice, manifest: sealed }, 200, config.apiKey);
}

function download(body: unknown, config: CoachRuntime): Response {
  const record = body as { manifest?: unknown };
  const manifest = sealManifest(record.manifest);
  if (!manifest) return respond({ error: "That project archive is not valid." }, 400, config.apiKey);
  const bytes = zipProject(manifest.slug, manifest.files, config.apiKey);
  if (!bytes) return respond({ error: "That project archive is not valid." }, 400, config.apiKey);
  if (config.apiKey && config.apiKey.length >= 12 && new TextDecoder().decode(bytes).includes(config.apiKey)) {
    return respond({ error: "The builder response was withheld." }, 500, config.apiKey);
  }
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${manifest.slug}.zip"`,
    },
  });
}
