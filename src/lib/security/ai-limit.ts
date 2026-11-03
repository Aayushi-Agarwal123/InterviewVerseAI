import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const AI_LIMITS = {
  coach: { requests: 12, window: "10 m" },
  career: { requests: 12, window: "10 m" },
  builder: { requests: 10, window: "10 m" },
  "builder-generate": { requests: 4, window: "60 m" },
} as const;

export type AiBucket = keyof typeof AI_LIMITS;

const TRUSTED_IP_HEADERS = new Set([
  "cf-connecting-ip",
  "x-vercel-forwarded-for",
  "x-real-ip",
  "x-forwarded-for",
]);

const SHARED_CLIENT = "shared";

type Env = Record<string, string | undefined>;

export const AI_LIMIT_DEADLINE_MS = 2_000;

export const REDIS_RETRY = { retries: 1, backoffMs: 50 } as const;

export type LimitResult = {
  success: boolean;
  reset: number;
  reason?: string;
};

export type LimitProbe = {
  limit: (key: string) => Promise<LimitResult>;
};

type GuardOptions = {
  env?: Env;
  probes?: Partial<Record<AiBucket, LimitProbe>>;
};

const limiters = new Map<string, Ratelimit>();
let redisClient: Redis | null = null;
let redisIdentity = "";

function configuredSecret(value: string | undefined): string {
  const text = value?.trim() ?? "";
  if (!text || /your[_-]|placeholder|changeme|example[_-]?key|paste|insert[_-]|replace[_-]?me/i.test(text)) {
    return "";
  }
  return text;
}

function normalizeIp(value: string): string | null {
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  if (candidate.length < 3 || candidate.length > 64) return null;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate)) {
    const parts = candidate.split(".").map(Number);
    if (parts.some((part) => part > 255)) return null;
    return candidate;
  }
  if (candidate.includes(":") && /^[0-9a-fA-F:]+$/.test(candidate)) return candidate.toLowerCase();
  return null;
}

function headerName(env: Env): string {
  return env.INTERVIEWVERSE_TRUSTED_IP_HEADER?.trim().toLowerCase() ?? "";
}

function vercelDeployment(env: Env): boolean {
  const stage = env.VERCEL_ENV?.trim().toLowerCase() ?? "";
  return stage === "production" || stage === "preview";
}

function vercelHeaderRejected(env: Env): boolean {
  return vercelDeployment(env) && headerName(env) !== "x-vercel-forwarded-for";
}

export function clientAddress(request: { headers: Headers }, env: Env = process.env): string {
  const name = headerName(env);
  if (vercelDeployment(env)) {
    if (name !== "x-vercel-forwarded-for") return SHARED_CLIENT;
  } else if (!TRUSTED_IP_HEADERS.has(name)) {
    return SHARED_CLIENT;
  }
  const raw = request.headers.get(name);
  if (!raw) return SHARED_CLIENT;
  const first = raw.split(",")[0] ?? "";
  return normalizeIp(first) ?? SHARED_CLIENT;
}

function tooMany(reset: number): Response {
  const wait = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json(
    { error: "Too many AI requests from this network. Wait and try again." },
    { status: 429, headers: { "retry-after": String(wait), "cache-control": "no-store" } },
  );
}

function unavailable(): Response {
  return Response.json(
    { error: "AI requests are temporarily unavailable." },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}

function limiterFor(bucket: AiBucket, url: string, token: string): Ratelimit {
  const identity = `${url}\n${token}`;
  if (!redisClient || redisIdentity !== identity) {
    redisClient = new Redis({
      url,
      token,
      retry: { retries: REDIS_RETRY.retries, backoff: () => REDIS_RETRY.backoffMs },
    });
    redisIdentity = identity;
    limiters.clear();
  }
  const existing = limiters.get(bucket);
  if (existing) return existing;
  const rule = AI_LIMITS[bucket];
  const created = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(rule.requests, rule.window),
    prefix: `interviewverse:${bucket}`,
    analytics: false,
    timeout: 0,
  });
  limiters.set(bucket, created);
  return created;
}

function decide(result: LimitResult): Response | null {
  if (result.reason === "timeout") return unavailable();
  return result.success ? null : tooMany(result.reset);
}

async function withDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("limiter-timeout")), AI_LIMIT_DEADLINE_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function enforceAiLimit(
  request: Request,
  bucket: AiBucket,
  options: GuardOptions = {},
): Promise<Response | null> {
  const env = options.env ?? process.env;
  if (vercelHeaderRejected(env)) return unavailable();
  const key = clientAddress(request, env);
  const probe = options.probes?.[bucket];
  if (probe) {
    try {
      return decide(await withDeadline(probe.limit(key)));
    } catch {
      return unavailable();
    }
  }

  const url = configuredSecret(env.UPSTASH_REDIS_REST_URL);
  const token = configuredSecret(env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) {
    return env.NODE_ENV === "production" ? unavailable() : null;
  }

  try {
    return decide(await withDeadline(limiterFor(bucket, url, token).limit(key)));
  } catch {
    return unavailable();
  }
}
