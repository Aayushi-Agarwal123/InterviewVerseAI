import type { BuildRequest, ProjectFile, StackId } from "@/lib/builder/types";

function file(path: string, contents: string): ProjectFile {
  return { path, contents: contents.endsWith("\n") ? contents : `${contents}\n` };
}

const GITIGNORE = `node_modules
dist
.next
coverage
.env
.env.local
*.log
`;

function packageJson(name: string, body: Record<string, unknown>): string {
  return `${JSON.stringify({ name, private: true, version: "0.1.0", ...body }, null, 2)}\n`;
}

const REACT_APP = (name: string) => `import { useState } from "react";

const title = ${JSON.stringify(name)};

export function App() {
  const [note, setNote] = useState("Read README.md before adding product features.");
  return (
    <main>
      <p>Starter</p>
      <h1>{title}</h1>
      <label htmlFor="note">Note</label>
      <input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
      <p>{note}</p>
    </main>
  );
}
`;

const REACT_MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

const REACT_CSS = `body {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  background: #f6f1e8;
  color: #1d1a16;
}

main {
  max-width: 40rem;
  margin: 0 auto;
  padding: 3rem 1.25rem;
}

input {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.6rem 0.7rem;
}
`;

function viteFiles(name: string, slug: string, prefix = ""): ProjectFile[] {
  const path = (value: string) => (prefix ? `${prefix}/${value}` : value);
  return [
    file(
      path("package.json"),
      packageJson(prefix ? `${slug}-client` : slug, {
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "19.3.0", "react-dom": "19.3.0" },
        devDependencies: {
          "@types/react": "^19",
          "@types/react-dom": "^19",
          "@vitejs/plugin-react": "^5",
          typescript: "^5",
          vite: "^7",
        },
      }),
    ),
    file(
      path("tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            useDefineForClassFields: true,
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
          },
          include: ["src"],
        },
        null,
        2,
      ),
    ),
    file(
      path("vite.config.ts"),
      `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:4000" } },
});
`,
    ),
    file(
      path("index.html"),
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name.replace(/[<>&"]/g, "")}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    ),
    file(path("src/main.tsx"), REACT_MAIN),
    file(path("src/App.tsx"), REACT_APP(name)),
    file(path("src/styles.css"), REACT_CSS),
  ];
}

function nextFiles(name: string, slug: string): ProjectFile[] {
  return [
    file(
      "package.json",
      packageJson(slug, {
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { next: "16.4.3", react: "19.3.0", "react-dom": "19.3.0" },
        devDependencies: {
          "@types/node": "^20",
          "@types/react": "^19",
          "@types/react-dom": "^19",
          typescript: "^5",
        },
      }),
    ),
    file(
      "tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2017",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "react-jsx",
            incremental: true,
            plugins: [{ name: "next" }],
          },
          include: ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx"],
          exclude: ["node_modules"],
        },
        null,
        2,
      ),
    ),
    file("next-env.d.ts", `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`),
    file(
      "next.config.ts",
      `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`,
    ),
    file(
      "src/app/layout.tsx",
      `import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: ${JSON.stringify(name)} };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    ),
    file(
      "src/app/page.tsx",
      `export default function HomePage() {
  return (
    <main>
      <h1>${name.replace(/[<>&"]/g, "")}</h1>
      <p>This Next.js starter renders. Read README.md before adding product features.</p>
    </main>
  );
}
`,
    ),
    file(
      "src/app/globals.css",
      `body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f6f1e8; color: #1d1a16; }
main { max-width: 40rem; margin: 0 auto; padding: 3rem 1.25rem; }
`,
    ),
  ];
}

function expressFiles(slug: string, database: BuildRequest["database"], prefix = ""): ProjectFile[] {
  const path = (value: string) => (prefix ? `${prefix}/${value}` : value);
  const mongo = database === "mongodb";
  const dependencies: Record<string, string> = { express: "^4.21.2" };
  if (mongo) dependencies.mongodb = "^6.16.0";
  return [
    file(
      path("package.json"),
      packageJson(prefix ? `${slug}-server` : slug, {
        type: "module",
        scripts: {
          dev: "tsx watch src/index.ts",
          start: "tsx src/index.ts",
          typecheck: "tsc --noEmit",
        },
        dependencies,
        devDependencies: {
          "@types/express": "^4.17.21",
          "@types/node": "^20",
          tsx: "^4.20.5",
          typescript: "^5",
        },
      }),
    ),
    file(
      path("tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            types: ["node"],
          },
          include: ["src"],
        },
        null,
        2,
      ),
    ),
    file(
      path(".env.example"),
      mongo ? "PORT=4000\nMONGODB_URI=\n" : "PORT=4000\n",
    ),
    file(path("src/db.ts"), mongo ? MONGO_DB : MEMORY_DB),
    file(path("src/index.ts"), EXPRESS_INDEX),
  ];
}

const MEMORY_DB = `export type Item = { id: string; name: string };

const memory: Item[] = [];

export function databaseConfigured(): boolean {
  return false;
}

export async function getItems(): Promise<Item[]> {
  return memory;
}

export async function saveItem(name: string): Promise<Item> {
  const item = { id: String(memory.length + 1), name };
  memory.push(item);
  return item;
}

export async function updateItem(id: string, name: string): Promise<Item | null> {
  const item = memory.find((entry) => entry.id === id);
  if (!item) return null;
  item.name = name;
  return item;
}

export async function deleteItem(id: string): Promise<boolean> {
  const index = memory.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  memory.splice(index, 1);
  return true;
}
`;

const MONGO_DB = `import { MongoClient, ObjectId } from "mongodb";

export type Item = { id: string; name: string };

const memory: Item[] = [];
const uri = process.env.MONGODB_URI?.trim() ?? "";
let client: MongoClient | null = null;

export function databaseConfigured(): boolean {
  return uri.length > 0;
}

async function collection() {
  if (!uri) return null;
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db().collection<{ name: string }>("items");
}

export async function getItems(): Promise<Item[]> {
  const items = await collection();
  if (!items) return memory;
  const docs = await items.find().limit(50).toArray();
  return docs.map((doc) => ({ id: String(doc._id as ObjectId), name: doc.name }));
}

export async function saveItem(name: string): Promise<Item> {
  const items = await collection();
  if (!items) {
    const item = { id: String(memory.length + 1), name };
    memory.push(item);
    return item;
  }
  const inserted = await items.insertOne({ name });
  return { id: String(inserted.insertedId), name };
}

export async function updateItem(id: string, name: string): Promise<Item | null> {
  const items = await collection();
  if (!items) {
    const item = memory.find((entry) => entry.id === id);
    if (!item) return null;
    item.name = name;
    return item;
  }
  if (!ObjectId.isValid(id)) return null;
  const result = await items.updateOne({ _id: new ObjectId(id) }, { $set: { name } });
  if (result.matchedCount === 0) return null;
  return { id, name };
}

export async function deleteItem(id: string): Promise<boolean> {
  const items = await collection();
  if (!items) {
    const index = memory.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    memory.splice(index, 1);
    return true;
  }
  if (!ObjectId.isValid(id)) return false;
  const result = await items.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
`;

const EXPRESS_INDEX = `import express from "express";
import { databaseConfigured, deleteItem, getItems, saveItem, updateItem } from "./db.ts";

const app = express();
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true, database: databaseConfigured() });
});

app.get("/api/items", async (_request, response) => {
  response.json({ items: await getItems(), database: databaseConfigured() });
});

app.post("/api/items", async (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim().slice(0, 80) : "";
  if (!name) {
    response.status(400).json({ error: "Name is required." });
    return;
  }
  response.status(201).json({ item: await saveItem(name) });
});

app.put("/api/items/:id", async (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim().slice(0, 80) : "";
  const id = typeof request.params.id === "string" ? request.params.id : "";
  if (!name) {
    response.status(400).json({ error: "Name is required." });
    return;
  }
  const item = await updateItem(id, name);
  if (!item) {
    response.status(404).json({ error: "Item was not found." });
    return;
  }
  response.json({ item });
});

app.delete("/api/items/:id", async (request, response) => {
  const id = typeof request.params.id === "string" ? request.params.id : "";
  const removed = await deleteItem(id);
  if (!removed) {
    response.status(404).json({ error: "Item was not found." });
    return;
  }
  response.status(204).end();
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(\`API listening on \${port}\`);
});
`;

const ITEMS_APP = (name: string) => `import { useEffect, useState } from "react";

type Item = { id: string; name: string };

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/items");
    if (!response.ok) {
      setError("The API did not respond. Start the server on port 4000.");
      return;
    }
    const body = (await response.json()) as { items?: Item[] };
    setItems(body.items ?? []);
    setError("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main>
      <p>Starter</p>
      <h1>${name.replace(/[<>&"]/g, "")}</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void fetch("/api/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name }),
          }).then((response) => {
            if (!response.ok) {
              setError("The item was not saved.");
              return;
            }
            setName("");
            void load();
          });
        }}
      >
        <label htmlFor="item-name">Item name</label>
        <input id="item-name" value={name} onChange={(event) => setName(event.target.value)} />
        <button type="submit">Add item</button>
      </form>
      {error ? <p>{error}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <button
              type="button"
              onClick={() => {
                const next = item.name.endsWith(" updated") ? item.name : item.name + " updated";
                void fetch(\`/api/items/\${item.id}\`, {
                  method: "PUT",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ name: next }),
                }).then((response) => {
                  if (!response.ok) {
                    setError("The item was not updated.");
                    return;
                  }
                  void load();
                });
              }}
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                void fetch(\`/api/items/\${item.id}\`, { method: "DELETE" }).then((response) => {
                  if (!response.ok && response.status !== 204) {
                    setError("The item was not deleted.");
                    return;
                  }
                  void load();
                });
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
`;

export function stackFiles(request: BuildRequest): ProjectFile[] {
  if (request.stack === "react-vite") return viteFiles(request.name, request.slug);
  if (request.stack === "next") return nextFiles(request.name, request.slug);
  if (request.stack === "express") return expressFiles(request.slug, request.database);
  const client = viteFiles(request.name, request.slug, "client").map((entry) =>
    entry.path === "client/src/App.tsx" ? file("client/src/App.tsx", ITEMS_APP(request.name)) : entry,
  );
  return [...client, ...expressFiles(request.slug, "mongodb", "server")];
}

export function stackNotes(stack: StackId, database: BuildRequest["database"]): {
  included: string[];
  notIncluded: string[];
  setup: string[];
  modules: { name: string; purpose: string }[];
  technologies: string[];
} {
  if (stack === "react-vite") {
    return {
      technologies: ["React", "Vite", "TypeScript"],
      modules: [{ name: "App shell", purpose: "Renders the project name and a local note field." }],
      included: ["A Vite + React + TypeScript app with one working screen.", "Scripts to install, run, and build."],
      notIncluded: [
        "Authentication, a database, and an API.",
        "Any product feature named in the brief that is not listed above.",
      ],
      setup: [
        "Download the ZIP and extract it.",
        "cd into the extracted project",
        "npm install",
        "npm run dev",
        "Open the URL Vite prints.",
      ],
    };
  }
  if (stack === "next") {
    return {
      technologies: ["Next.js", "React", "TypeScript"],
      modules: [{ name: "Home page", purpose: "Renders a starter page with the App Router." }],
      included: ["A Next.js + TypeScript app with one route.", "Scripts to install, run, and build."],
      notIncluded: [
        "Authentication, a database, and a separate API server.",
        "Any product feature named in the brief that is not listed above.",
      ],
      setup: [
        "Download the ZIP and extract it.",
        "cd into the extracted project",
        "npm install",
        "npm run dev",
        "Open http://localhost:3000",
      ],
    };
  }
  if (stack === "express") {
    const mongo = database === "mongodb";
    return {
      technologies: mongo
        ? ["Node.js", "Express", "TypeScript", "MongoDB"]
        : ["Node.js", "Express", "TypeScript"],
      modules: [
        { name: "Health check", purpose: "GET /health reports that the process is up." },
        {
          name: "Item API",
          purpose: mongo
            ? "Lists, creates, updates, and deletes items. Uses MongoDB when MONGODB_URI is set, and memory otherwise."
            : "Lists, creates, updates, and deletes items in memory for the life of the process.",
        },
      ],
      included: [
        "An Express + TypeScript server.",
        "GET /health.",
        mongo
          ? "GET, POST, PUT, and DELETE /api/items, with MongoDB when MONGODB_URI is set and an in-memory list otherwise."
          : "GET, POST, PUT, and DELETE /api/items stored in memory.",
      ],
      notIncluded: [
        "A browser app, accounts, and passwords.",
        "Any product feature named in the brief that is not listed above.",
      ],
      setup: [
        "Download the ZIP and extract it.",
        "cd into the extracted project",
        "npm install",
        "Copy .env.example to .env and leave secrets empty unless you have a database.",
        "npm run dev",
        "Open http://127.0.0.1:4000/health",
      ],
    };
  }
  return {
    technologies: ["React", "Vite", "TypeScript", "Node.js", "Express", "MongoDB"],
    modules: [
      { name: "Web client", purpose: "Lists items and calls the API to create, update, and delete them." },
      { name: "API server", purpose: "Serves /health and the item routes." },
      {
        name: "Item store",
        purpose: "Uses MongoDB when MONGODB_URI is set, and memory otherwise.",
      },
    ],
    included: [
      "A Vite + React client that loads items and calls create, update, and delete.",
      "An Express + TypeScript API with GET /health and GET, POST, PUT, and DELETE /api/items.",
      "MongoDB operations used only when MONGODB_URI is set. An empty value keeps items in memory.",
    ],
    notIncluded: [
      "Accounts, passwords, and an admin role.",
      "Any product feature named in the brief that is not listed above.",
    ],
    setup: [
      "Download the ZIP and extract it.",
      "cd server, npm install, copy .env.example to .env, then npm run dev",
      "In another terminal, cd client, npm install, then npm run dev",
      "Open the URL Vite prints. The client proxies /api to port 4000.",
    ],
  };
}

export function rootGitignore(): ProjectFile {
  return file(".gitignore", GITIGNORE);
}
