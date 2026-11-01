# InterviewVerse AI

Practice a technical round, an HR conversation, a profile-based interview, a spoken round, or an AI avatar interview, then leave with a score you can compare to the last one.

InterviewVerse AI is a single-user studio. You pick an interviewer, answer in writing, and get a debrief on five dimensions: relevance, structure, specificity, depth, and communication. History stays in this browser. There is no account.

The coach can call Google Gemini or an OpenAI-compatible model. One server-side configuration is shared by `/api/coach`, `/api/career`, and `/api/builder`. With no usable API key, those routes stay on the local rubric, the local question bank, or local project templates. The key stays in server environment variables and is never sent to the browser. Gemini mode sends the relevant request to Google's API. Nothing in this app turns on paid billing.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Model coach

Copy `.env.example` to `.env.local` and set the key. Restart `npm run dev` after changing it.

```bash
INTERVIEWVERSE_COACH_PROVIDER=gemini
INTERVIEWVERSE_COACH_API_KEY=
INTERVIEWVERSE_COACH_MODEL=
INTERVIEWVERSE_COACH_BASE_URL=
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `INTERVIEWVERSE_COACH_API_KEY` | For AI mode | Server-only secret. Leave empty for the local rubric and local templates. A placeholder value is treated as no key. |
| `INTERVIEWVERSE_COACH_PROVIDER` | No | `gemini`, `openai`, or `local`. An empty value with a usable key still selects OpenAI. |
| `INTERVIEWVERSE_COACH_MODEL` | For Gemini | A real Gemini model ID from your project. OpenAI defaults to `gpt-4o-mini` when this is empty. Gemini has no default model. |
| `INTERVIEWVERSE_COACH_BASE_URL` | No | Empty uses the provider default: Gemini `https://generativelanguage.googleapis.com/v1beta`, OpenAI `https://api.openai.com/v1`. |

Gemini uses the Developer API's `generateContent` request, not the OpenAI chat format. The key is sent as `x-goog-api-key` and is not put in the URL. This app does not require the key to start with a particular prefix. A placeholder key, a placeholder model such as `YOUR_MODEL_ID`, or an empty model when the provider is Gemini stays local (`missing-model` or `no-api-key`) and is not sent. The same rule keeps the Project Builder on local templates. A rejected key, a key restricted to a browser or IP address, a disabled Generative Language API, an unknown model, a malformed request, a rate limit, a quota error, or an unreadable reply is not retried. The answer is scored by the local rubric and kept. The sidebar says **Gemini AI Coach** or **Local Coach**, and says when answers are sent to Google. A successful mocked test is not a live Gemini call.

## AI Project Builder

Open **AI Project Builder** in the navigation. Describe a product, pick a stack, and download a ZIP. The four starters are React + Vite + TypeScript, Next.js + TypeScript, Node.js + Express + TypeScript, and React + Express + MongoDB.

Gemini is used only when the server is already in Gemini mode with a model ID. It writes source files in checked batches: project configuration, frontend, backend, database when the stack has one, and documentation. Each file needs a relative path and is rejected if it is absolute, traverses directories, or is a secret, an API key, or `node_modules`. The preview labels the result **Gemini AI-generated project** or **Local Template-generated project**.

Express and full-stack starters register list, create, update, and delete for `/api/items`. The full-stack client calls those routes. MongoDB is used only when that database is selected and `MONGODB_URI` is set. A validation report lists Gemini files, template files, implemented features, missing features, and errors. A route counts only when it calls an imported store function. A database operation counts only when that function calls the MongoDB driver. A word in a comment does not count. `package.json` scripts and imports are checked, and generated code is never installed or run on this server. The report tells you how to download, extract, install, and run the project locally. A rejected key, a restricted key, a disabled Generative Language API, an unknown model, a malformed request, a rate limit, a quota error, or an unreadable reply uses the **Local Template Builder** and does not call the starter AI-generated. The ZIP is built in memory. It has no `node_modules` and no API key.

OpenAI remains available. Set `INTERVIEWVERSE_COACH_PROVIDER=openai` and a model such as `gpt-4o-mini`. Local mode does not invent a sample answer or a model debrief.

```bash
npm run verify   # rubric and session checks
npm run lint
npm run build
```

## Stack

- Next.js (App Router) and React
- TypeScript
- Tailwind CSS
- shadcn/ui primitives (Base UI)

The rubric still runs on the device when no key is set. With a key, the server asks the model for the five scores, a follow-up, and a sample answer, then stores that on the same session.

## Architecture

```
src/app/page.tsx            Studio                          /
src/app/practice            Question interview              /practice
src/app/interview/[id]      Live round                      /interview/:id
src/app/report/[id]         Debrief                         /report/:id
src/app/personalized        Profile interview               /personalized
src/app/voice               Spoken question-bank round      /voice
src/app/avatar              Avatar lobby                    /avatar
src/app/avatar/[id]         Avatar room                     /avatar/:id
src/app/roadmap             Roadmap                         /roadmap
src/app/mentor              Mentor                          /mentor
src/app/arena               Coding arena                    /arena
src/app/jobs                Job match                       /jobs
src/app/progress            Progress                        /progress
src/app/memory              Memory                          /memory
src/app/builder             Project builder                 /builder
src/app/api/coach           evaluate, evaluate-custom, debrief, public status
src/app/api/career          personalize, mentor, avatar-next
src/app/api/builder         status, generate, download
src/components/ui           shadcn primitives
src/components/shell        navigation, session store, career store
src/features                studio, practice, interview, report, personalized,
                            avatar, roadmap, mentor, arena, jobs, progress,
                            memory, builder
src/lib/domain.ts           session, question, and score types
src/lib/questions           prompt bank, grouped by track and topic
src/lib/engine              rubric and the round state machine
src/lib/coach               shared server config, Gemini, OpenAI, local fallback
src/lib/career              profile, plan, mentor, match, roadmap, memory, analytics
src/lib/avatar              illustrated interviewer and question turns
src/lib/voice               browser speech support
src/lib/coding              arena problems and the JavaScript worker
src/lib/builder             templates, Gemini batches, validation, in-memory ZIP
src/lib/storage.ts          interview rounds in interviewverse.v1
```

`/api/coach`, `/api/career`, and `/api/builder` all call `readCoachConfig` on the server. The API key remains in that server configuration. It is not included in public status, and a response that would contain it is withheld. Do not put the key in browser code.

The round state machine is pure. React only reads and writes `Session` objects. The browser asks `/api/coach` for a score or debrief when the server reports AI mode. That route scores with the local rubric when no usable key is set, and again when the model request fails. `/api/career` plans a personalized interview, answers the mentor, and chooses the next avatar question, using Gemini only when that same config is ready and otherwise the local bank or a local reply. `/api/builder` reports whether Gemini scaffolding is available and generates files only in that case. Otherwise it returns a local template.

### What the coach actually does

Each prompt carries signals (phrases a strong answer tends to include), follow-up probes, and an outline of a stronger shape. Submitting an answer:

1. Scores the five dimensions from the text.
2. On Standard, asks one follow-up when a core signal is missing. Warm-up never does. Pressure does whenever a probed signal is missing.
3. At the end, averages the answers into a debrief and names the next round.

A nudge reveals one signal and caps depth slightly. The outline on the debrief is a shape, not a script to memorize.

In AI mode the model writes the follow-up from the answer you gave. Warm-up still never follows up. A follow-up that repeats the prompt is discarded, and the bank probe is used when the model does not offer a usable one. Hit and missed signals stay on the rubric, so the badges remain comparable. The overall score still uses the same weights: relevance 0.18, structure 0.20, specificity 0.18, depth 0.28, communication 0.16. A failed model call does not drop the text you typed.

## Modules

- **Studio** — open round, averages, streak, and the paths into the rest of the studio.
- **Question interview** — technical (Arun Mehta) or HR (Leela Kapoor), topic, pressure, length, timer, follow-up, debrief.
- **Personalized interview** — profile fields, Gemini questions when configured, otherwise the question bank chosen for those skills. Difficulty can swap the next prompt after a thin or strong answer.
- **AI avatar interview** — a separate room at `/avatar`. Arun Mehta (technical) and Leela Kapoor (HR) are illustrated. The browser speaks the question and, when allowed, transcribes the microphone. Mute, replay, pause, resume, and end are in the room. An optional camera is a real self-view, video only. There is no third-party video avatar and no phoneme lip-sync: the mouth is a CSS animation while speech synthesis is speaking. Gemini writes the next question and can score an answer only when the server coach is already configured. Otherwise the local interviewer and Local Coach run, and the screen says so. A paid streaming avatar (Simli, HeyGen, or D-ID) is not connected; those services bill per minute and would need their own key behind `src/lib/avatar/provider.ts`.
- **Voice** — browser speech synthesis and speech recognition on the question-bank round, with a typed answer when either is missing or permission is denied. This is not the avatar room.
- **Roadmap** — daily, weekly, and skill tasks from saved scores. Checks stay in this browser.
- **Mentor** — one next action from the saved profile and rounds. Gemini when configured, otherwise a local reply.
- **Coding arena** — original problems, visible sample cases, JavaScript in a browser worker. Other languages are saved and not run. The server does not execute solutions.
- **Job match** — paste a description and type skills. No resume upload.
- **Memory** — view or clear rounds, profile, roadmap checks, and learning notes separately.
- **Progress** — mixed overall, plus model-coach and Local Coach counts kept apart.
- **Project builder** — four starter stacks, Gemini source when configured, local template fallback, validation, and ZIP download.

Topics: data structures, system design, frontend, backend, behavioral, leadership, conflict, career story.

Learning data uses `interviewverse.career.v1`. Interview rounds stay in `interviewverse.v1`. Neither store holds an API key.
