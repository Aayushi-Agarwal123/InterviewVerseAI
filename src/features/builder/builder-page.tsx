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

function Tree({ paths }: { paths: string[] }) {
  return (
    <ul className="mt-3 overflow-x-auto font-mono text-xs leading-6">
      {paths.map((path) => (
        <li key={path} style={{ paddingLeft: `${Math.max(0, path.split("/").length - 1) * 12}px` }}>
          {path.split("/").at(-1)}
        </li>
      ))}
    </ul>
  );
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
    setBusy(builder.mode === "gemini" ? "Gemini is reading this brief." : "Building a local starter.");
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
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <PageIntro
          kicker="AI Project Builder"
          title="Describe it. Take a starter home."
          lede="Write the product in plain language, pick a stack, and download a ZIP of real starter files. The archive does not pretend to be the finished product."
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

      <aside className="lg:pt-2">
        {!manifest ? (
          <div className="rounded-2xl bg-card/60 px-4 py-5 ring-1 ring-foreground/10">
            <h2 className="font-heading text-xl tracking-tight">Nothing generated yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Generate a starter to see the technologies, the file tree, and the download.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/10">
            <p className="text-[10px] font-medium tracking-[0.16em] text-copper uppercase">
              {manifest.source === "gemini" ? "Gemini Project Builder" : "Local Template Builder"}
            </p>
            <h2 className="mt-2 font-heading text-2xl tracking-tight">{manifest.name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {manifest.source === "gemini"
                ? "Gemini summarized the requirements. The files are the starter template for this stack, not a finished product."
                : "This starter came from a local template. It is not an AI-generated project."}
            </p>
            {notice ? <p className="mt-3 text-sm leading-6">{notice}</p> : null}
            <p className="mt-4 text-sm font-medium">{manifest.technologies.join(" · ")}</p>
            <p className="mt-3 text-sm leading-6">{manifest.objective}</p>
            <h3 className="mt-5 text-sm font-medium">Requirements</h3>
            <ul className="mt-2 list-disc pl-4 text-sm leading-6 text-muted-foreground">
              {manifest.functionalRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-medium">
              {manifest.files.length} files
            </h3>
            <Tree paths={[...manifest.files.map((file) => file.path)].sort()} />
            <h3 className="mt-5 text-sm font-medium">Dependencies</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{manifest.dependencies.join(", ")}</p>
            <Button type="button" className="mt-5 h-10 w-full" disabled={Boolean(busy)} onClick={() => void download()}>
              {busy === "Packing the ZIP." ? "Packing…" : "Download ZIP"}
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
