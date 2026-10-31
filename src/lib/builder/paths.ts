import type { ProjectFile } from "@/lib/builder/types";

export const LIMITS = {
  description: 4_000,
  extras: 800,
  name: 48,
  files: 32,
  fileChars: 20_000,
  totalChars: 160_000,
  pathChars: 140,
};

const DOTFILES = new Set([".gitignore", ".env.example"]);
const BLOCKED = new Set(["node_modules", ".git", ".env", ".env.local"]);
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function safeRelativePath(input: string): string | null {
  if (typeof input !== "string") return null;
  const path = input.trim();
  if (!path || path.length > LIMITS.pathChars) return null;
  if (path.includes("\\") || path.includes("\0") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
    return null;
  }
  const parts = path.split("/");
  if (parts.length > 8) return null;
  for (const part of parts) {
    if (!part || part === "." || part === "..") return null;
    if (BLOCKED.has(part)) return null;
    if (DOTFILES.has(part)) continue;
    if (part.startsWith(".") || !FILE_NAME.test(part)) return null;
  }
  return parts.join("/");
}

export function redactSecrets(text: string, apiKey: string | null = null): string {
  let next = text
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, "[redacted]")
    .replace(/sk-[A-Za-z0-9_\-]{12,}/g, "[redacted]")
    .replace(/AKIA[0-9A-Z]{16}/g, "[redacted]");
  if (apiKey && apiKey.length >= 8) next = next.split(apiKey).join("[redacted]");
  return next;
}

export function withinFileLimits(files: ProjectFile[]): boolean {
  if (files.length === 0 || files.length > LIMITS.files) return false;
  let total = 0;
  const seen = new Set<string>();
  for (const file of files) {
    if (!safeRelativePath(file.path)) return false;
    if (seen.has(file.path)) return false;
    seen.add(file.path);
    if (typeof file.contents !== "string" || file.contents.length > LIMITS.fileChars) return false;
    total += file.contents.length;
    if (total > LIMITS.totalChars) return false;
  }
  return true;
}
