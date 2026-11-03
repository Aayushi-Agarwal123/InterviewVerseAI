export async function readBoundedBody(request: Request, maxBytes: number): Promise<string | null> {
  const header = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(header) && header > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) {
    const text = await request.text();
    return new TextEncoder().encode(text).byteLength > maxBytes ? null : text;
  }
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
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
