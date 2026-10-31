"use client";

import { useState, useSyncExternalStore } from "react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBuilderSnapshot,
  getServerBuilderSnapshot,
  subscribeBuilderMode,
} from "@/lib/builder/status";
import { resolveStack } from "@/lib/builder/request";
import type { BackendChoice, DatabaseChoice, FrontendChoice, ProjectManifest } from "@/lib/builder/types";
import { STACK_LABELS } from "@/lib/builder/types";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "Create an online interview preparation platform with React, Node.js, Express, and MongoDB. Include authentication, interview practice, an admin dashboard, and performance tracking.";

function Choice({
  pressed,
  label,
  detail,
  onClick,
}: {
  pressed: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-3 text-left ring-1",
        pressed ? "bg-card ring-primary" : "bg-card/40 ring-foreground/10 hover:ring-foreground/20",
      )}
    >
      <span className="block text-sm font-medium">{label}</span>
      {detail ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{detail}</span> : null}
    </button>
  );
}

function fileLabel(path: string, origin: "gemini" | "template" | undefined) {
  if (path === "README.md") return "Notes";
  return origin === "gemini" ? "Gemini" : "Template";
}

export function BuilderPage() {
  const builder = useSyncExternalStore(subscribeBuilderMode, getBuilderSnapshot, getServerBuilderSnapshot);
  const [name, setName] = useState("Interview Prep");
  const [description, setDescription] = useState("");
  const [extras, setExtras] = useState("");
  const [frontend, setFrontend] = useState<FrontendChoice>("react-vite");
  const [backend, setBackend] = useState<BackendChoice>("none");
  const [database, setDatabase] = useState<DatabaseChoice>("none");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [manifest, setManifest] = useState<ProjectManifest | null>(null);

  const stack = resolveStack(frontend, backend, database);

  function applyPreset(next: "web" | "api" | "fullstack") {
    if (next === "web") {
      setFrontend("react-vite");
      setBackend("none");
      setDatabase("none");
    } else if (next === "api") {
      setFrontend("none");
      setBackend("express");
      setDatabase("none");
    } else {
      setFrontend("react-vite");
      setBackend("express");
      setDatabase("mongodb");
    }
  }

  const preset =
    frontend === "react-vite" && backend === "none" && database === "none"
      ? "web"
      : frontend === "none" && backend === "express" && database === "none"
        ? "api"
        : frontend === "react-vite" && backend === "express" && database === "mongodb"
          ? "fullstack"
          : "";

  async function generate() {
    setError("");
    setNotice("");
    setBusy(builder.mode === "gemini" ? "Gemini is writing source files." : "Building a local starter.");
    try {
      const response = await fetch("/api/builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate", name, description, extras, frontend, backend, database }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        notice?: string;
        manifest?: ProjectManifest;
      } | null;
      if (!response.ok || !body?.manifest) {
        setManifest(null);
        setError(body?.error || "The starter could not be built.");
        return;
      }
      setManifest(body.manifest);
      setNotice(body.notice ?? "");
    } catch {
      setManifest(null);
      setError("The builder could not be reached. Nothing was downloaded.");
    } finally {
      setBusy("");
    }
  }

  async function download() {
    if (!manifest) return;
    setError("");
    setBusy("Packing the ZIP.");
    try {
      const response = await fetch("/api/builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "download", manifest }),
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("zip")) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "The ZIP could not be built.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${manifest.slug}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("The ZIP could not be downloaded.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
      <div className="min-w-0">
        <PageIntro
          kicker="AI Project Builder"
          title="Describe it. Take a starter home."
          lede="Describe the product and pick a stack. Gemini writes source files when it is configured. Otherwise the download is a local template, and the preview says which one you received."
        />

        <div className="mt-6 rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
          <p className="text-[10px] font-medium tracking-[0.16em] text-copper uppercase">
            {builder.ready ? builder.label : "Checking the builder"}
          </p>
          {builder.ready ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{builder.detail}</p> : null}
        </div>

        <form
          className="mt-8 flex flex-col gap-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && stack.ok) void generate();
          }}
        >
          <div>
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              className="mt-2 h-10"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={48}
              required
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Project type</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Choice pressed={preset === "web"} label="Web app" detail="A browser starter." onClick={() => applyPreset("web")} />
              <Choice pressed={preset === "api"} label="API" detail="An Express service." onClick={() => applyPreset("api")} />
              <Choice
                pressed={preset === "fullstack"}
                label="Full stack"
                detail="React, Express, and MongoDB."
                onClick={() => applyPreset("fullstack")}
              />
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-3">
            <fieldset>
              <legend className="text-sm font-medium">Frontend</legend>
              <div className="mt-3 flex flex-col gap-2">
                <Choice pressed={frontend === "react-vite"} label="React + Vite" onClick={() => setFrontend("react-vite")} />
                <Choice pressed={frontend === "next"} label="Next.js" onClick={() => setFrontend("next")} />
                <Choice pressed={frontend === "none"} label="None" onClick={() => setFrontend("none")} />
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Backend</legend>
              <div className="mt-3 flex flex-col gap-2">
                <Choice pressed={backend === "express"} label="Express" onClick={() => setBackend("express")} />
                <Choice pressed={backend === "none"} label="None" onClick={() => setBackend("none")} />
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Database</legend>
              <div className="mt-3 flex flex-col gap-2">
                <Choice pressed={database === "mongodb"} label="MongoDB" onClick={() => setDatabase("mongodb")} />
                <Choice pressed={database === "none"} label="None" onClick={() => setDatabase("none")} />
              </div>
            </fieldset>
          </div>

          <p className={cn("text-sm", stack.ok ? "text-muted-foreground" : "text-destructive")}>
            {stack.ok ? STACK_LABELS[stack.stack] : stack.error}
          </p>

          <div>
            <Label htmlFor="project-brief">Project description</Label>
            <Textarea
              id="project-brief"
              className="mt-2 min-h-36"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={PLACEHOLDER}
              maxLength={4000}
              required
            />
          </div>

          <div>
            <Label htmlFor="project-extras">Additional requirements</Label>
            <Textarea
              id="project-extras"
              className="mt-2 min-h-20"
              value={extras}
              onChange={(event) => setExtras(event.target.value)}
              placeholder="Optional. Tests, deployment notes, or a constraint."
              maxLength={800}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {busy ? <p className="text-sm text-muted-foreground">{busy}</p> : null}

          <Button type="submit" className="h-10 w-full sm:w-auto" disabled={Boolean(busy) || !stack.ok}>
            {busy ? "Working…" : "Generate Project"}
          </Button>
        </form>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto lg:pt-2">
        {!manifest ? (
          <div className="rounded-2xl bg-card/60 px-4 py-5 ring-1 ring-foreground/10">
            <h2 className="font-heading text-xl tracking-tight">Nothing generated yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Generate a project to see the architecture, the file tree, the file contents, and the download.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/10">
            <p className="text-[10px] font-medium tracking-[0.16em] text-copper uppercase">
              {manifest.source === "gemini" ? "Gemini AI-generated project" : "Local Template-generated project"}
            </p>
            <h2 className="mt-2 font-heading text-2xl tracking-tight">{manifest.name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {manifest.source === "gemini"
                ? "Gemini wrote the files marked Gemini. Files marked Template stayed on the local starter. A feature is listed only when its source is in the archive."
                : "This is a Local Template-generated project. It is not an AI-generated project."}
            </p>
            {notice ? <p className="mt-3 text-sm leading-6">{notice}</p> : null}
            <h3 className="mt-5 text-sm font-medium">Project architecture</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{manifest.technologies.join(" · ")}</p>
            <p className="mt-2 text-sm leading-6">{manifest.objective}</p>
            <ul className="mt-2 list-disc pl-4 text-sm leading-6 text-muted-foreground">
              {manifest.modules.map((item) => (
                <li key={item.name}>
                  {item.name}: {item.purpose}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-medium">Validation report</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Imports, package.json, routes, and client calls were checked. The project was not run. A feature name in the source is not treated as an implementation.
            </p>
            <h3 className="mt-4 text-sm font-medium">Files generated by Gemini</h3>
            <ul className="mt-2 list-disc pl-4 text-sm leading-6 text-muted-foreground">
              {(manifest.validation?.geminiFiles.length ? manifest.validation.geminiFiles : ["None."]).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-medium">Files generated by local templates</h3>
            <ul className="mt-2 list-disc pl-4 text-sm leading-6 text-muted-foreground">
              {(manifest.validation?.templateFiles.length ? manifest.validation.templateFiles : ["None."]).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-medium">Requested features implemented</h3>
            <ul className="mt-2 list-disc pl-4 text-sm leading-6 text-muted-foreground">
              {(manifest.validation?.implemented.length ? manifest.validation.implemented : ["None."]).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-medium">Features missing or incomplete</h3>
            <ul className="mt-2 list-disc pl-4 text-sm leading-6 text-muted-foreground">
              {(manifest.validation?.missing.length ? manifest.validation.missing : ["None."]).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-medium">Validation errors</h3>
            <ul className="mt-2 list-disc pl-4 text-sm leading-6 text-muted-foreground">
              {(manifest.validation?.errors.length ? manifest.validation.errors : ["None."]).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-medium">Run it locally</h3>
            <ol className="mt-2 list-decimal pl-4 text-sm leading-6 text-muted-foreground">
              {manifest.setup.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <h3 className="mt-5 text-sm font-medium">{manifest.files.length} files</h3>
            <ul className="mt-3 overflow-x-auto font-mono text-xs leading-6">
              {[...manifest.files].sort((a, b) => a.path.localeCompare(b.path)).map((file) => (
                <li key={file.path} className="flex gap-2" style={{ paddingLeft: `${Math.max(0, file.path.split("/").length - 1) * 12}px` }}>
                  <span className="min-w-0 flex-1 truncate">{file.path.split("/").at(-1)}</span>
                  <span className="shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">
                    {fileLabel(file.path, file.origin)}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-medium">File contents</h3>
            <div className="mt-2 flex flex-col gap-2">
              {[...manifest.files].sort((a, b) => a.path.localeCompare(b.path)).map((file) => (
                <details key={file.path} className="rounded-lg bg-background px-3 py-2 ring-1 ring-foreground/10">
                  <summary className="cursor-pointer font-mono text-xs">
                    {file.path}
                    <span className="ml-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                      {fileLabel(file.path, file.origin)}
                    </span>
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5">
                    {file.contents}
                  </pre>
                </details>
              ))}
            </div>
            <h3 className="mt-5 text-sm font-medium">Dependencies</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{manifest.dependencies.join(", ") || "None listed."}</p>
            <Button type="button" className="mt-5 h-10 w-full" disabled={Boolean(busy)} onClick={() => void download()}>
              {busy === "Packing the ZIP." ? "Packing…" : "Download ZIP"}
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
