// Writes project source through Gemini in checked batches.
// This module never imports child_process and never runs generated files.
import type { CoachRuntime } from "@/lib/coach/config";
import { ModelCallError } from "@/lib/coach/errors";
import { completeGemini } from "@/lib/coach/gemini";
import type { ChatMessage } from "@/lib/coach/prompt";
import type { ProjectAnalysis } from "@/lib/builder/manifest";
import { dependencyNames } from "@/lib/builder/manifest";
import { LIMITS, redactSecrets, safeRelativePath, withinFileLimits } from "@/lib/builder/paths";
import { rootGitignore, stackFiles, stackNotes } from "@/lib/builder/templates";
import { STACK_LABELS, type BuildRequest, type FileOrigin, type ProjectFile, type ProjectManifest } from "@/lib/builder/types";

export const CODE_BATCHES = ["configuration", "frontend", "backend", "database", "documentation"] as const;

export type CodeBatch = (typeof CODE_BATCHES)[number];

export type BatchProposal = {
  path: string;
  contents: string;
};

export const GENERATION_BUDGET_MS = 50_000;
export const ANALYSIS_TIMEOUT_MS = 15_000;
export const BATCH_TIMEOUT_MS = 12_000;

const BATCH_FILE_CAP = 12;
const LIFECYCLE_SCRIPTS = ["preinstall", "install", "postinstall", "prepare"];
const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "next.config.ts",
  "next-env.d.ts",
  "index.html",
  ".gitignore",
  ".env.example",
]);
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "application",
  "based",
  "build",
  "could",
  "create",
  "feature",
  "features",
  "from",
  "have",
  "include",
  "into",
  "just",
  "local",
  "more",
  "most",
  "must",
  "need",
  "needs",
  "online",
  "only",
  "other",
  "over",
  "platform",
  "project",
  "should",
  "simple",
  "small",
  "some",
  "such",
  "system",
  "that",
  "their",
  "them",
  "then",
  "there",
  "they",
  "this",
  "under",
  "user",
  "users",
  "using",
  "very",
  "want",
  "what",
  "when",
  "where",
  "which",
  "will",
  "with",
  "would",
  "your",
]);

type Draft = {
  contents: string;
  origin: FileOrigin;
};

export function budgetSignal(deadline: number, cap: number): AbortSignal | null {
  const left = deadline - Date.now();
  if (left < 1_500) return null;
  return AbortSignal.timeout(Math.min(cap, left));
}

export function batchesFor(request: BuildRequest): CodeBatch[] {
  const batches: CodeBatch[] = ["configuration"];
  if (request.frontend !== "none") batches.push("frontend");
  if (request.backend !== "none") batches.push("backend");
  if (request.database === "mongodb") batches.push("database");
  batches.push("documentation");
  return batches;
}

function fileName(path: string): string {
  return path.split("/").at(-1) ?? "";
}

function extension(path: string): string {
  const name = fileName(path);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot);
}

function configDir(dir: string, request: BuildRequest): boolean {
  if (dir === "") return true;
  return request.stack === "fullstack" && (dir === "client" || dir === "server");
}

function isDatabasePath(path: string, request: BuildRequest): boolean {
  if (request.stack === "fullstack") return path === "server/src/db.ts" || path.startsWith("server/src/models/");
  return path === "src/db.ts" || path.startsWith("src/models/");
}

function blockedName(name: string): boolean {
  if (name === ".env.example" || name === ".gitignore") return false;
  if (name.startsWith(".env")) return true;
  return /^(credentials|secrets|id_rsa|id_dsa)$/i.test(name) || /\.(pem|key|p12|pfx)$/i.test(name);
}

export function pathAllowed(batch: CodeBatch, path: string, request: BuildRequest): boolean {
  const safe = safeRelativePath(path);
  if (!safe || safe !== path || blockedName(fileName(path))) return false;
  if (batch === "documentation") return path === "README.md";
  if (batch === "configuration") {
    const parts = path.split("/");
    const name = parts.at(-1) ?? "";
    return CONFIG_NAMES.has(name) && configDir(parts.slice(0, -1).join("/"), request);
  }
  if (batch === "frontend") {
    if (request.frontend === "none") return false;
    if (![".ts", ".tsx", ".js", ".jsx", ".css"].includes(extension(path))) return false;
    return request.stack === "fullstack" ? path.startsWith("client/src/") : path.startsWith("src/");
  }
  if (batch === "backend") {
    if (request.backend === "none" || request.frontend === "next") return false;
    if (![".ts", ".js"].includes(extension(path))) return false;
    const root = request.stack === "fullstack" ? "server/src/" : "src/";
    if (!path.startsWith(root)) return false;
    if (request.database === "mongodb" && isDatabasePath(path, request)) return false;
    return true;
  }
  if (batch === "database") {
    if (request.database !== "mongodb") return false;
    if (![".ts", ".js"].includes(extension(path))) return false;
    return isDatabasePath(path, request);
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? text;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export function parseBatchPayload(text: string): BatchProposal[] | null {
  const parsed = extractJson(text);
  if (!isRecord(parsed) || !Array.isArray(parsed.files)) return null;
  const files: BatchProposal[] = [];
  for (const entry of parsed.files) {
    if (!isRecord(entry) || typeof entry.path !== "string" || typeof entry.contents !== "string") continue;
    files.push({ path: entry.path.trim(), contents: entry.contents });
    if (files.length === BATCH_FILE_CAP * 2) break;
  }
  return files;
}

function normalizePackage(contents: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (isRecord(parsed.scripts)) {
    const scripts = { ...parsed.scripts };
    for (const key of LIFECYCLE_SCRIPTS) delete scripts[key];
    parsed.scripts = scripts;
  }
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

function sanitizeEnvExample(contents: string): string | null {
  const lines = contents.split("\n").slice(0, 40);
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      if (trimmed.length > 120) return null;
      kept.push(trimmed);
      continue;
    }
    const match = /^([A-Z][A-Z0-9_]{0,40})=(.*)$/.exec(trimmed);
    if (!match) return null;
    const value = match[2].trim();
    if (value && !/^\d{1,5}$/.test(value)) return null;
    kept.push(`${match[1]}=${value}`);
  }
  if (kept.length === 0) return null;
  return `${kept.join("\n")}\n`;
}

function sanitizeContents(path: string, contents: string, apiKey: string | null): string | null {
  if (contents.includes("\0") || contents.length > LIMITS.fileChars) return null;
  let next = redactSecrets(contents, apiKey);
  if (apiKey && apiKey.length >= 8 && next.includes(apiKey)) return null;
  if (next.includes("-----BEGIN ")) return null;
  const name = fileName(path);
  if (name === "package.json") {
    const normalized = normalizePackage(next);
    if (!normalized) return null;
    next = normalized;
  } else if (name === ".env.example") {
    const normalized = sanitizeEnvExample(next);
    if (!normalized) return null;
    next = normalized;
  }
  if (!next.trim()) return null;
  if (!next.endsWith("\n")) next += "\n";
  if (next.length > LIMITS.fileChars) return null;
  return next;
}

export function filterBatchFiles(
  batch: CodeBatch,
  request: BuildRequest,
  proposed: BatchProposal[],
  apiKey: string | null,
  current: { path: string; contents: string }[],
): BatchProposal[] {
  let count = current.length;
  let chars = current.reduce((sum, file) => sum + file.contents.length, 0);
  const existing = new Map(current.map((file) => [file.path, file.contents.length]));
  const accepted: BatchProposal[] = [];
  const seen = new Set<string>();
  for (const entry of proposed) {
    if (accepted.length === BATCH_FILE_CAP || seen.has(entry.path)) continue;
    if (!pathAllowed(batch, entry.path, request)) continue;
    const contents = sanitizeContents(entry.path, entry.contents, apiKey);
    if (!contents) continue;
    const previous = existing.get(entry.path) ?? 0;
    const isNew = !existing.has(entry.path);
    if (isNew && count + 1 > LIMITS.files) continue;
    if (chars - previous + contents.length > LIMITS.totalChars) continue;
    if (isNew) count += 1;
    chars = chars - previous + contents.length;
    existing.set(entry.path, contents.length);
    seen.add(entry.path);
    accepted.push({ path: entry.path, contents });
  }
  return accepted;
}

function stripComments(contents: string): string {
  return contents
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function hasWord(hay: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, "i").test(hay);
}

function requirementFound(requirement: string, code: string): boolean {
  const words = requirement.toLowerCase().match(/[a-z][a-z0-9]{4,}/g) ?? [];
  const significant = [...new Set(words.filter((word) => !STOP_WORDS.has(word)))];
  if (significant.length === 0) return false;
  const hits = significant.filter((word) => hasWord(code, word));
  return hits.length >= (significant.length === 1 ? 1 : 2);
}

export function scanProject(
  files: { path: string; contents: string }[],
  request: BuildRequest,
  analysis: ProjectAnalysis,
): { included: string[]; notIncluded: string[] } {
  const code = files
    .filter((file) => /\.(tsx?|jsx?|css)$/.test(file.path))
    .map((file) => stripComments(file.contents))
    .join("\n");
  const included: string[] = [];
  const notIncluded: string[] = [];
  if (/\.get\(\s*["']\/health["']/.test(code)) included.push("The source registers GET /health.");
  if (/\.get\(\s*["']\/api\/items["']/.test(code)) included.push("The source registers GET /api/items.");
  if (/\.post\(\s*["']\/api\/items["']/.test(code)) included.push("The source registers POST /api/items.");
  if (/from ["']express["']/.test(code)) included.push("The source imports Express.");
  if (/from ["']react["']/.test(code)) included.push("The source imports React.");
  if (/from ["']mongodb["']/.test(code) || /new MongoClient\(/.test(code)) {
    included.push("The source contains a MongoDB client.");
  }
  if (files.some((file) => file.path.endsWith("vite.config.ts"))) included.push("The archive contains a Vite config.");
  if (files.some((file) => file.path.endsWith("next.config.ts"))) included.push("The archive contains a Next.js config.");

  const brief = `${request.description}\n${request.extras}\n${analysis.functionalRequirements.join("\n")}`;
  const authAsked = /\b(authentication|password|sign-in|signin|log in|login)\b/i.test(brief);
  const authPresent =
    /\b(bcrypt|jsonwebtoken|passport|argon2)\b/.test(code) ||
    (/\/api\/(?:login|signup|session)/.test(code) && /\bpassword\b/.test(code));
  if (authAsked && authPresent) included.push("The source contains authentication code.");
  if (authAsked && !authPresent) notIncluded.push("Authentication was requested and is not in the source.");

  for (const requirement of analysis.functionalRequirements) {
    if (requirementFound(requirement, code)) included.push(`The source mentions this brief line: ${requirement}`);
    else notIncluded.push(`Not in the source: ${requirement}`);
  }
  if (included.length === 0) included.push("No route, client, or brief line was found in the source files.");
  if (notIncluded.length === 0) notIncluded.push("No missing brief line was detected in the source files.");
  return { included, notIncluded };
}

function batchRules(batch: CodeBatch, request: BuildRequest): string {
  if (batch === "configuration") {
    return request.stack === "fullstack"
      ? "Allowed files: package.json, tsconfig.json, vite.config.ts, index.html, and .gitignore at the root or under client/ or server/, plus server/.env.example with empty or numeric values."
      : "Allowed root files: package.json, tsconfig.json, vite.config.ts, next.config.ts, next-env.d.ts, index.html, .gitignore, and .env.example with empty or numeric values.";
  }
  if (batch === "frontend") {
    return request.stack === "fullstack"
      ? "Allowed files: TypeScript, TSX, JavaScript, JSX, or CSS under client/src/."
      : "Allowed files: TypeScript, TSX, JavaScript, JSX, or CSS under src/.";
  }
  if (batch === "backend") {
    const database = request.database === "mongodb" ? " Do not write the database file in this batch." : "";
    return request.stack === "fullstack"
      ? `Allowed files: TypeScript under server/src/.${database}`
      : `Allowed files: TypeScript under src/.${database}`;
  }
  if (batch === "database") {
    return request.stack === "fullstack"
      ? "Allowed files: server/src/db.ts and TypeScript under server/src/models/."
      : "Allowed files: src/db.ts and TypeScript under src/models/.";
  }
  return "Allowed file: README.md. Describe the project. Do not claim a feature is implemented.";
}

function templatePaths(batch: CodeBatch, request: BuildRequest): string[] {
  const files = batch === "documentation" ? [{ path: "README.md", contents: "" }] : [rootGitignore(), ...stackFiles(request)];
  return files.map((file) => file.path).filter((path) => pathAllowed(batch, path, request));
}

function batchMessages(batch: CodeBatch, request: BuildRequest, analysis: ProjectAnalysis): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You write source files for one batch of a small TypeScript project.",
        'Return JSON only: {"files":[{"path":"relative/file.ts","contents":"full file text"}]}',
        "Every path is relative. Never use an absolute path, a .. segment, node_modules, a secret file, or an API key.",
        "Do not ask the server to run a command. The server will not execute anything you return.",
        "Omit a file to leave the existing template copy in place.",
        "Do not claim a feature exists unless the file contents contain it.",
        `This batch is ${batch}.`,
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Batch: ${batch}`,
        `Project name: ${request.name}`,
        `Stack: ${STACK_LABELS[request.stack]}`,
        `Objective: ${analysis.objective}`,
        `Requirements: ${analysis.functionalRequirements.join("; ")}`,
        `Template paths you may replace: ${templatePaths(batch, request).join(", ") || "none"}`,
        batchRules(batch, request),
      ].join("\n\n"),
    },
  ];
}

function fatal(error: unknown): boolean {
  return (
    error instanceof ModelCallError &&
    error.provider === "gemini" &&
    (error.failure === "quota" || error.failure === "rate-limit" || error.failure === "invalid-key")
  );
}

function composeReadme(
  request: BuildRequest,
  analysis: ProjectAnalysis,
  files: ProjectFile[],
  included: string[],
  notIncluded: string[],
): string {
  const notes = stackNotes(request.stack, request.database);
  const generated = files.filter((file) => file.origin === "gemini").map((file) => file.path);
  const kept = files.filter((file) => file.origin !== "gemini" && file.path !== "README.md").map((file) => file.path);
  return [
    `# ${request.name}`,
    "",
    notes.technologies.join(" · "),
    "",
    "This is a Gemini AI-generated project. Gemini wrote the files under Generated source. Every other source file was kept from the local template.",
    "",
    "A feature is listed as included only when its source is in this archive.",
    "",
    "## Objective",
    "",
    analysis.objective,
    "",
    "## Architecture",
    "",
    ...analysis.modules.map((item) => `- ${item.name}: ${item.purpose}`),
    "",
    "## Generated source",
    "",
    ...(generated.length > 0 ? generated.map((path) => `- ${path}`) : ["- None."]),
    "",
    "## Template files",
    "",
    ...(kept.length > 0 ? kept.map((path) => `- ${path}`) : ["- None."]),
    "",
    "## Included in this archive",
    "",
    ...included.map((item) => `- ${item}`),
    "",
    "## Excluded or incomplete",
    "",
    ...notIncluded.map((item) => `- ${item}`),
    "",
    "## Requirements from the brief",
    "",
    "These notes are not implemented unless they also appear under Included in this archive.",
    "",
    ...analysis.functionalRequirements.map((item) => `- ${item}`),
    "",
    "## Run it",
    "",
    ...notes.setup.map((item, index) => `${index + 1}. ${item}`),
    "",
    "No API keys are included. This server did not install dependencies or run the generated project.",
    "",
  ].join("\n");
}

function baseline(request: BuildRequest): Map<string, Draft> {
  const files = new Map<string, Draft>();
  for (const file of [rootGitignore(), ...stackFiles(request)]) {
    files.set(file.path, { contents: file.contents, origin: "template" });
  }
  return files;
}

function toProjectFiles(request: BuildRequest, files: Map<string, Draft>, readme: string): ProjectFile[] {
  const templateOrder = [rootGitignore().path, ...stackFiles(request).map((file) => file.path)];
  const extras = [...files.keys()].filter((path) => !templateOrder.includes(path)).sort();
  const paths = [...templateOrder.filter((path) => files.has(path)), ...extras];
  return [
    { path: "README.md", contents: readme, origin: "template" },
    ...paths.map((path) => {
      const draft = files.get(path);
      return { path, contents: draft?.contents ?? "", origin: draft?.origin ?? "template" };
    }),
  ];
}

export async function applyCodeGeneration(
  request: BuildRequest,
  analysis: ProjectAnalysis,
  config: CoachRuntime,
  fetchImpl: typeof fetch | undefined,
  deadline: number,
): Promise<{ manifest: ProjectManifest; notice?: string } | null> {
  if (!config.apiKey) return null;
  const files = baseline(request);
  let skipped = 0;
  for (const batch of batchesFor(request)) {
    const signal = budgetSignal(deadline, BATCH_TIMEOUT_MS);
    if (!signal) {
      skipped += 1;
      continue;
    }
    let text = "";
    try {
      text = await completeGemini(
        {
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
          temperature: 0.2,
          messages: batchMessages(batch, request, analysis),
          signal,
        },
        fetchImpl,
      );
    } catch (error) {
      if (fatal(error)) throw error;
      skipped += 1;
      continue;
    }
    const proposed = parseBatchPayload(text);
    if (!proposed) {
      if (batch !== "documentation") skipped += 1;
      continue;
    }
    const current = [...files.entries()].map(([path, draft]) => ({ path, contents: draft.contents }));
    const accepted = filterBatchFiles(batch, request, proposed, config.apiKey, current);
    if (batch === "documentation") continue;
    if (proposed.length > 0 && accepted.length === 0) skipped += 1;
    for (const file of accepted) files.set(file.path, { contents: file.contents, origin: "gemini" });
  }

  const acceptedSource = [...files.values()].some((file) => file.origin === "gemini");
  if (!acceptedSource) return null;
  const draftFiles = [...files.entries()].map(([path, draft]) => ({
    path,
    contents: draft.contents,
    origin: draft.origin,
  }));
  const scanned = scanProject(draftFiles, request, analysis);
  const readme = composeReadme(request, analysis, draftFiles, scanned.included, scanned.notIncluded);
  if (readme.length > LIMITS.fileChars) return null;
  const projectFiles = toProjectFiles(request, files, readme);
  if (!withinFileLimits(projectFiles)) return null;
  const notes = stackNotes(request.stack, request.database);
  return {
    notice: skipped > 0 ? "Gemini wrote some source files. Any batch it did not return stayed on the local template." : undefined,
    manifest: {
      source: "gemini",
      name: request.name,
      slug: request.slug,
      stack: request.stack,
      technologies: notes.technologies,
      objective: analysis.objective,
      functionalRequirements: analysis.functionalRequirements,
      nonFunctionalRequirements: analysis.nonFunctionalRequirements,
      modules: analysis.modules,
      included: scanned.included,
      notIncluded: scanned.notIncluded,
      dependencies: dependencyNames(projectFiles),
      setup: notes.setup,
      files: projectFiles,
    },
  };
}
