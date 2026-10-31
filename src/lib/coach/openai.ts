import type { ChatMessage } from "@/lib/coach/prompt";

export type ModelRequest = {
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  messages: ChatMessage[];
  signal: AbortSignal;
};

type CompletionBody = {
  model: string;
  temperature: number;
  messages: ChatMessage[];
  response_format?: { type: "json_object" };
};

async function postCompletion(request: ModelRequest, jsonMode: boolean): Promise<Response> {
  const body: CompletionBody = {
    model: request.model,
    temperature: request.temperature,
    messages: request.messages,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  return fetch(`${request.baseUrl}/chat/completions`, {
    method: "POST",
    signal: request.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

async function discard(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

export async function completeOpenAi(request: ModelRequest): Promise<string> {
  let response = await postCompletion(request, true);
  if (response.status === 400) {
    await discard(response);
    response = await postCompletion(request, false);
  }
  if (!response.ok) {
    await discard(response);
    throw new Error(`Model request failed (${response.status}).`);
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Model reply was empty.");
  }
  return content;
}
