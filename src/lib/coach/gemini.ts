import { ModelCallError, type ModelFailure } from "@/lib/coach/errors";
import type { ModelRequest } from "@/lib/coach/openai";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readGeminiText(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return null;
  const candidate = value.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
    return null;
  }
  const text = candidate.content.parts
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  return text || null;
}

function errorReason(details: unknown): string {
  if (!Array.isArray(details)) return "";
  for (const entry of details) {
    if (isRecord(entry) && typeof entry.reason === "string") return entry.reason;
  }
  return "";
}

async function classifyFailure(response: Response): Promise<ModelFailure> {
  let status = "";
  let message = "";
  let reason = "";
  try {
    const payload = (await response.json()) as { error?: { status?: unknown; message?: unknown; details?: unknown } };
    if (typeof payload.error?.status === "string") status = payload.error.status;
    if (typeof payload.error?.message === "string") message = payload.error.message;
    reason = errorReason(payload.error?.details);
  } catch {
    await response.body?.cancel().catch(() => undefined);
  }
  const quota = /quota/i.test(message);
  if (response.status === 429 || status === "RESOURCE_EXHAUSTED") {
    return quota ? "quota" : "rate-limit";
  }
  if (reason === "API_KEY_INVALID" || /api key not valid|api_key_invalid/i.test(message)) return "invalid-key";
  if (
    reason === "API_KEY_HTTP_REFERRER_BLOCKED" ||
    reason === "API_KEY_IP_ADDRESS_BLOCKED" ||
    reason === "API_KEY_ANDROID_APP_BLOCKED" ||
    reason === "API_KEY_IOS_APP_BLOCKED" ||
    /referr?er|ip address|android app|ios app/i.test(message)
  ) {
    return "restricted-key";
  }
  if (
    reason === "API_KEY_SERVICE_BLOCKED" ||
    reason === "SERVICE_DISABLED" ||
    /has not been used|is disabled|service.?blocked/i.test(message)
  ) {
    return "api-disabled";
  }
  if (
    response.status === 404 ||
    status === "NOT_FOUND" ||
    /not found|not supported|unknown model/i.test(message)
  ) {
    return "unsupported-model";
  }
  if (
    response.status === 401 ||
    response.status === 403 ||
    status === "UNAUTHENTICATED" ||
    status === "PERMISSION_DENIED"
  ) {
    return "invalid-key";
  }
  if (response.status === 400 || status === "INVALID_ARGUMENT") return "malformed-request";
  return "unavailable";
}

export async function completeGemini(
  request: ModelRequest,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const system = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const user = request.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");
  const response = await fetchImpl(
    `${request.baseUrl}/models/${encodeURIComponent(request.model)}:generateContent`,
    {
      method: "POST",
      signal: request.signal,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": request.apiKey,
      },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: request.temperature,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!response.ok) {
    const failure = await classifyFailure(response);
    throw new ModelCallError(failure, "gemini");
  }
  let payload: unknown;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    await response.body?.cancel().catch(() => undefined);
    throw new ModelCallError("unavailable", "gemini");
  }
  const text = readGeminiText(payload);
  if (!text) throw new ModelCallError("unavailable", "gemini");
  return text;
}
