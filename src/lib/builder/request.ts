import { redactSecrets } from "@/lib/builder/paths";
import { LIMITS } from "@/lib/builder/paths";
import {
  STACK_LABELS,
  type BackendChoice,
  type BuildRequest,
  type DatabaseChoice,
  type FrontendChoice,
  type StackId,
} from "@/lib/builder/types";

const FRONTENDS = new Set<FrontendChoice>(["react-vite", "next", "none"]);
const BACKENDS = new Set<BackendChoice>(["express", "none"]);
const DATABASES = new Set<DatabaseChoice>(["mongodb", "none"]);

export function slugify(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return slug;
}

export function resolveStack(
  frontend: FrontendChoice,
  backend: BackendChoice,
  database: DatabaseChoice,
): { ok: true; stack: StackId; label: string } | { ok: false; error: string } {
  if (frontend === "next") {
    if (backend !== "none" || database !== "none") {
      return {
        ok: false,
        error: "The Next.js starter is one app. Clear Express and MongoDB, or switch the frontend.",
      };
    }
    return { ok: true, stack: "next", label: STACK_LABELS.next };
  }
  if (frontend === "react-vite" && backend === "none" && database === "none") {
    return { ok: true, stack: "react-vite", label: STACK_LABELS["react-vite"] };
  }
  if (frontend === "none" && backend === "express") {
    return { ok: true, stack: "express", label: STACK_LABELS.express };
  }
  if (frontend === "react-vite" && backend === "express" && database === "mongodb") {
    return { ok: true, stack: "fullstack", label: STACK_LABELS.fullstack };
  }
  if (frontend === "react-vite" && database === "mongodb") {
    return { ok: false, error: "MongoDB is connected from the Express server. Add Express, or drop the database." };
  }
  if (frontend === "react-vite" && backend === "express") {
    return {
      ok: false,
      error: "The full-stack starter includes MongoDB. Select it, or generate the Vite app and the API separately.",
    };
  }
  return { ok: false, error: "Choose a React app, a Next.js app, an Express API, or the full stack." };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseBuildRequest(
  value: unknown,
): { ok: true; value: BuildRequest } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: "The builder expected an object." };
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,47}$/.test(name) || name.length > LIMITS.name) {
    return { ok: false, error: "Use a project name of 2–48 letters, numbers, spaces, or hyphens." };
  }
  const slug = slugify(name);
  if (!slug) return { ok: false, error: "That name does not make a safe folder name." };
  const description = typeof value.description === "string" ? value.description.trim() : "";
  if (description.length < 12) return { ok: false, error: "Describe the project in at least a sentence." };
  if (description.length > LIMITS.description) {
    return { ok: false, error: "That description is too long to scaffold." };
  }
  const extras = typeof value.extras === "string" ? value.extras.trim().slice(0, LIMITS.extras) : "";
  if (!FRONTENDS.has(value.frontend as FrontendChoice)) return { ok: false, error: "Choose a frontend." };
  if (!BACKENDS.has(value.backend as BackendChoice)) return { ok: false, error: "Choose a backend." };
  if (!DATABASES.has(value.database as DatabaseChoice)) return { ok: false, error: "Choose a database." };
  const stack = resolveStack(
    value.frontend as FrontendChoice,
    value.backend as BackendChoice,
    value.database as DatabaseChoice,
  );
  if (!stack.ok) return stack;
  return {
    ok: true,
    value: {
      name,
      slug,
      description: redactSecrets(description),
      extras: redactSecrets(extras),
      frontend: value.frontend as FrontendChoice,
      backend: value.backend as BackendChoice,
      database: value.database as DatabaseChoice,
      stack: stack.stack,
    },
  };
}
