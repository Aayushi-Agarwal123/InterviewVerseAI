const SECRET_PATTERNS: readonly RegExp[] = [
  /AIza[0-9A-Za-z\-_]{8,}/g,
  /AQ\.[0-9A-Za-z_\-]{10,}/g,
  /sk-(?:proj-)?[A-Za-z0-9_\-]{8,}/g,
  /ghp_[A-Za-z0-9]{16,}/g,
  /github_pat_[A-Za-z0-9_]{16,}/g,
  /ya29\.[0-9A-Za-z_\-]{10,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /"(?:api[_-]?key|access[_-]?token|token|secret|authorization)"\s*:\s*"[^"]*"/gi,
  /(?:api[_-]?key|access[_-]?token|token|secret|authorization|x-goog-api-key)\s*[:=]\s*([^\s&,"']+)/gi,
];

const EXACT_KEY_MIN = 8;

export function redactSensitiveText(value: string, apiKey?: string | null): string {
  let next = value;
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[redacted]");
  }
  const secret = apiKey?.trim() ?? "";
  if (secret.length >= EXACT_KEY_MIN && next.includes(secret)) {
    next = next.split(secret).join("[redacted]");
  }
  return next;
}
