import { withinFileLimits } from "@/lib/builder/paths";
import { rootGitignore, stackFiles, stackNotes } from "@/lib/builder/templates";
import {
  STACKS,
  type BuildRequest,
  type ProjectFile,
  type ProjectManifest,
  type ProjectModule,
  type StackId,
} from "@/lib/builder/types";

export type ProjectAnalysis = {
  objective: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  modules: ProjectModule[];
};

function sentences(text: string): string[] {
  return text
    .split(/[\n.]+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 12 && part.length <= 200)
    .slice(0, 6);
}

export function localAnalysis(request: BuildRequest): ProjectAnalysis {
  const notes = stackNotes(request.stack, request.database);
  const functional = sentences(`${request.description}\n${request.extras}`);
  return {
    objective: request.description.replace(/\s+/g, " ").trim().slice(0, 280),
    functionalRequirements: functional.length > 0 ? functional : ["See the project brief in this file."],
    nonFunctionalRequirements: [
      "Runs on a local machine after npm install.",
      "The archive contains no API keys and no node_modules.",
    ],
    modules: notes.modules,
  };
}

function readmeFile(request: BuildRequest, analysis: ProjectAnalysis, source: ProjectManifest["source"]): ProjectFile {
  const notes = stackNotes(request.stack, request.database);
  const contents = [
    `# ${request.name}`,
    "",
    notes.technologies.join(" · "),
    "",
    source === "gemini"
      ? "This is a Gemini AI-generated project. A feature is listed as included only when its source is in this archive."
      : "The local template builder wrote this archive. It is not an AI-generated project.",
    "",
    "## Objective",
    "",
    analysis.objective,
    "",
    "## What this starter includes",
    "",
    ...notes.included.map((item) => `- ${item}`),
    "",
    "## What this starter does not include",
    "",
    ...notes.notIncluded.map((item) => `- ${item}`),
    "",
    "## Requirements from the brief",
    "",
    "These are notes about what you asked for. They are not implemented unless they also appear above.",
    "",
    ...analysis.functionalRequirements.map((item) => `- ${item}`),
    "",
    "## Suggested modules",
    "",
    "These names describe the brief. They are not extra source files, and they are not implemented unless the section above says so.",
    "",
    ...analysis.modules.map((item) => `- ${item.name}: ${item.purpose}`),
    "",
    "## Run it",
    "",
    ...notes.setup.map((item, index) => `${index + 1}. ${item}`),
    "",
    "No API keys are included. Copy `.env.example` to `.env` only when that example file is in this archive.",
    "",
  ].join("\n");
  return { path: "README.md", contents };
}

export function dependencyNames(files: ProjectFile[]): string[] {
  const names = new Set<string>();
  for (const file of files) {
    if (!file.path.endsWith("package.json")) continue;
    const parsed = JSON.parse(file.contents) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    for (const name of Object.keys(parsed.dependencies ?? {})) names.add(name);
    for (const name of Object.keys(parsed.devDependencies ?? {})) names.add(name);
  }
  return [...names].sort();
}

export function assembleManifest(
  request: BuildRequest,
  analysis: ProjectAnalysis,
  source: ProjectManifest["source"],
): ProjectManifest {
  const notes = stackNotes(request.stack, request.database);
  const files = [readmeFile(request, analysis, source), rootGitignore(), ...stackFiles(request)];
  return {
    source,
    name: request.name,
    slug: request.slug,
    stack: request.stack,
    technologies: notes.technologies,
    objective: analysis.objective,
    functionalRequirements: analysis.functionalRequirements,
    nonFunctionalRequirements: analysis.nonFunctionalRequirements,
    modules: analysis.modules,
    included: notes.included,
    notIncluded: notes.notIncluded,
    dependencies: dependencyNames(files),
    setup: notes.setup,
    files,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStack(value: unknown): value is StackId {
  return typeof value === "string" && (STACKS as readonly string[]).includes(value);
}

export function sealManifest(value: unknown): ProjectManifest | null {
  if (!isRecord(value)) return null;
  if (value.source !== "gemini" && value.source !== "local") return null;
  if (!isStack(value.stack)) return null;
  if (typeof value.name !== "string" || typeof value.slug !== "string" || typeof value.objective !== "string") {
    return null;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) return null;
  if (!Array.isArray(value.files)) return null;
  const files: ProjectFile[] = [];
  for (const file of value.files) {
    if (!isRecord(file) || typeof file.path !== "string" || typeof file.contents !== "string") return null;
    const origin = file.origin === "gemini" || file.origin === "template" ? file.origin : undefined;
    files.push(origin ? { path: file.path, contents: file.contents, origin } : { path: file.path, contents: file.contents });
  }
  if (!withinFileLimits(files)) return null;
  const manifest = value as ProjectManifest;
  return { ...manifest, files };
}
