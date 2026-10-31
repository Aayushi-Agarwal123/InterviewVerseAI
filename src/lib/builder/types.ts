export const STACKS = ["react-vite", "next", "express", "fullstack"] as const;

export type StackId = (typeof STACKS)[number];

export type FrontendChoice = "react-vite" | "next" | "none";
export type BackendChoice = "express" | "none";
export type DatabaseChoice = "mongodb" | "none";

export type BuildRequest = {
  name: string;
  slug: string;
  description: string;
  extras: string;
  frontend: FrontendChoice;
  backend: BackendChoice;
  database: DatabaseChoice;
  stack: StackId;
};

export type ProjectModule = {
  name: string;
  purpose: string;
};

export type FileOrigin = "gemini" | "template";

export type ProjectFile = {
  path: string;
  contents: string;
  origin?: FileOrigin;
};

export type ProjectManifest = {
  source: "gemini" | "local";
  name: string;
  slug: string;
  stack: StackId;
  technologies: string[];
  objective: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  modules: ProjectModule[];
  included: string[];
  notIncluded: string[];
  dependencies: string[];
  setup: string[];
  files: ProjectFile[];
};

export type BuilderMode = "gemini" | "local";

export const STACK_LABELS: Record<StackId, string> = {
  "react-vite": "React + Vite + TypeScript",
  next: "Next.js + TypeScript",
  express: "Node.js + Express + TypeScript",
  fullstack: "React + Node.js + Express + MongoDB",
};
