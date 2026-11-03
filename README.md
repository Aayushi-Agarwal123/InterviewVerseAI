# InterviewVerse AI

**An AI-powered interview preparation studio for technical, HR, personalized, voice, and avatar-based practice.**

Practice a technical round, an HR conversation, a profile-based interview, a spoken round, or an AI avatar interview. Get a score across five dimensions and compare your performance with previous sessions.

InterviewVerse AI is an open, browser-based studio. Anyone can practice without an account. You choose an interviewer, answer in writing or by voice, and receive a debrief covering:

- Relevance
- Structure
- Specificity
- Depth
- Communication

Your interview history and learning data stay in this browser. They are not uploaded to an account, and they are not shared with the next visitor on the same site.

The coach can call Google Gemini or an OpenAI-compatible model. One server-side configuration is shared by `/api/coach`, `/api/career`, and `/api/builder`. With no usable API key, those routes stay on the local rubric, the local question bank, or local project templates. The key stays in server environment variables and is never sent to the browser. Gemini mode sends the relevant request to Google's API. Nothing in this app turns on paid billing.

---

## Features

### 1. Studio Dashboard

- View interview activity, average scores, and streaks.
- Open interview modes and the other learning modules.
- Track preparation from one dashboard at `/`.

### 2. Question-Based Interview

- Technical interviews with **Arun Mehta**.
- HR interviews with **Leela Kapoor**.
- Choose a topic, difficulty, pressure, and interview length.
- Topics cover data structures, system design, frontend, backend, behavioral, leadership, conflict, and career story.
- Receive at most one follow-up, then a final debrief.
- The live round is `/interview/:id`. The debrief is `/report/:id`. Setup starts at `/practice`.

### 3. Personalized Interview

- Build a candidate profile from experience, skills, qualification, and target role.
- Questions come from Gemini when AI mode is configured. Otherwise they come from the question bank chosen for those skills.
- A thin or strong answer can change the difficulty of the next prompt.
- Open it at `/personalized`.

### 4. AI Avatar Interview

- Separate room at `/avatar`, with the live round at `/avatar/:id`.
- Technical, HR, and mixed modes. In a mixed round, Arun Mehta and Leela Kapoor alternate.
- Illustrated avatars with idle, speaking, listening, and thinking states.
- The browser speaks the question and, when allowed, transcribes the microphone.
- Mute, replay, pause, resume, and end are in the room.
- An optional camera is a real self-view, video only.

The mouth is a CSS animation while speech synthesis is speaking. There is no real-time phoneme lip-sync and no third-party video avatar. A paid streaming avatar service is not connected.

Gemini writes the next question and can score an answer only when the server coach is already configured. Otherwise the local interviewer and Local Coach run, and the screen says so.

### 5. Voice Interview

- Browser speech synthesis reads question-bank prompts at `/voice`.
- Speech recognition captures a spoken answer when the browser allows it.
- A typed answer remains available when recognition is missing or permission is denied.
- This is the question-bank round, not the avatar room.

### 6. AI Project Builder

Open **AI Project Builder** from the navigation at `/builder`. Describe a product, choose a stack, and download a ZIP.

Supported starter stacks:

- React + Vite + TypeScript
- Next.js + TypeScript
- Node.js + Express + TypeScript
- React + Express + MongoDB

Gemini writes source only when the server is already in Gemini mode with a real model ID. It writes checked batches for project configuration, frontend, backend, database when the stack has one, and documentation. Each file needs a relative path. Absolute paths, directory traversal, secrets, API keys, and `node_modules` are rejected.

The preview labels the result **Gemini AI-generated project** or **Local Template-generated project**. A local template is never presented as AI-generated.

Express and full-stack starters register list, create, update, and delete for `/api/items`. The full-stack client calls those routes. MongoDB is used only when that database is selected and `MONGODB_URI` is set. A validation report lists Gemini files, template files, implemented features, missing features, and errors. A route counts only when it calls an imported store function. A database operation counts only when that function calls the MongoDB driver. A word in a comment does not count. `package.json` scripts and imports are checked.

Generated code is never installed or run on this server. The ZIP is built in memory. It has no `node_modules` and no API key. The report explains how to download, extract, install, and run the project locally.

A rejected key, a restricted key, a disabled Generative Language API, an unknown model, a malformed request, a rate limit, a quota error, or an unreadable reply uses the **Local Template Builder**.

### 7. Additional Learning Modules

- **Roadmap** (`/roadmap`) — daily, weekly, and skill tasks from saved scores. Checks stay in this browser.
- **Mentor** (`/mentor`) — one next action from the saved profile and rounds. Gemini when configured, otherwise a local reply.
- **Coding Arena** (`/arena`) — original problems, visible sample cases, and JavaScript in a browser worker. Other languages are saved and not run. The server does not execute solutions.
- **Job Match** (`/jobs`) — paste a description and type skills. There is no resume upload.
- **Memory** (`/memory`) — view or clear rounds, profile, roadmap checks, and learning notes separately.
- **Progress** (`/progress`) — mixed overall, with model-coach and Local Coach counts kept apart.

---

## AI Model Configuration

The coach supports Google Gemini, an OpenAI-compatible model, and the local rubric. `/api/coach`, `/api/career`, and `/api/builder` all call `readCoachConfig` on the server. The API key remains in that server configuration. It is not included in public status, and a response that would contain it is withheld.

### Setup

1. Copy `.env.example` to `.env.local`.
2. Set the provider and, for AI mode, a real key and model ID.
3. Restart `npm run dev` after changing environment variables.

Leave the key and model empty to stay on the local rubric and local templates:

```env
INTERVIEWVERSE_COACH_PROVIDER=gemini
INTERVIEWVERSE_COACH_API_KEY=
INTERVIEWVERSE_COACH_MODEL=
INTERVIEWVERSE_COACH_BASE_URL=
```

### Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `INTERVIEWVERSE_COACH_API_KEY` | For AI mode | Server-only secret. Leave it empty for the local rubric and local templates. A placeholder value is treated as no key and is not sent. |
| `INTERVIEWVERSE_COACH_PROVIDER` | No | `gemini`, `openai`, or `local`. An empty value with a usable key still selects OpenAI. |
| `INTERVIEWVERSE_COACH_MODEL` | For Gemini | A real Gemini model ID from your project. OpenAI defaults to `gpt-4o-mini` when this is empty. Gemini has no default model. |
| `INTERVIEWVERSE_COACH_BASE_URL` | No | Empty uses the provider default: Gemini `https://generativelanguage.googleapis.com/v1beta`, OpenAI `https://api.openai.com/v1`. |
| `UPSTASH_REDIS_REST_URL` | Production AI | Upstash Redis REST URL. Empty in local development. Missing in production turns AI requests off. |
| `UPSTASH_REDIS_REST_TOKEN` | Production AI | Upstash Redis REST token. Server-only. Never put it in client code. |
| `INTERVIEWVERSE_TRUSTED_IP_HEADER` | No | One trusted proxy header used to separate visitors. Empty shares one limit. |

Gemini uses the Developer API `generateContent` request, not the OpenAI chat format. The key is sent as `x-goog-api-key` and is not put in the URL. This app does not require the key to start with a particular prefix.

A placeholder key, a placeholder model such as `YOUR_MODEL_ID`, or an empty model when the provider is Gemini stays local (`missing-model` or `no-api-key`) and is not sent. The same rule keeps the Project Builder on local templates. A rejected key, a key restricted to a browser or IP address, a disabled Generative Language API, an unknown model, a malformed request, a rate limit, a quota error, or an unreadable reply is not retried. The answer is scored by the local rubric and kept. Local mode does not invent a sample answer or a model debrief.

The sidebar says **Gemini AI Coach** or **Local Coach**, and it says when answers are sent to Google. A successful mocked test is not a live Gemini call.

### Local Fallback and Error Handling

- With no usable API configuration, the application uses the Local Coach.
- Placeholder API keys and model IDs are not sent to the provider.
- Failed model requests fall back to the local rubric.
- Invalid keys, restricted keys, disabled APIs, unknown models, malformed requests, quota errors, and rate limits are not retried.
- The submitted answer is kept when a model request fails.
- The interface identifies whether the session uses Gemini AI Coach or Local Coach.

**Privacy note:** In Gemini mode, interview answers are sent to Google's API for processing. Use local mode when answers should stay on this machine.

Nothing in the application enables paid billing.

OpenAI remains available. Set `INTERVIEWVERSE_COACH_PROVIDER=openai` and a model such as `gpt-4o-mini`.

### Public access and rate limits

Visitors do not sign in. Ordinary pages are not rate-limited. `POST /api/coach`, `POST /api/career`, and `POST /api/builder` are, because those requests can call Gemini.

Limits are counted per visitor address:

| Route | Limit |
| --- | --- |
| `POST /api/coach` | 12 requests every 10 minutes |
| `POST /api/career` | 12 requests every 10 minutes |
| `POST /api/builder` | 10 requests every 10 minutes |
| Project generation inside `POST /api/builder` | 4 requests every 60 minutes, in addition to the builder limit |

A visitor who passes a limit receives HTTP 429 and a `Retry-After` value. The response does not describe the rate-limit service.

Production uses Upstash Redis REST (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`). If either value is missing, still a placeholder, the service cannot be reached, or the check does not finish within 2 seconds, production refuses AI requests with HTTP 503. It does not fall through to unlimited Gemini calls. Local `npm run dev` keeps AI available when those two values are empty, so this machine can be used without Upstash.

On Vercel Production and Preview, set `INTERVIEWVERSE_TRUSTED_IP_HEADER` to `x-vercel-forwarded-for`. Any other value, including `cf-connecting-ip`, turns AI requests off with HTTP 503. Elsewhere, the allowed names are `cf-connecting-ip`, `x-vercel-forwarded-for`, `x-real-ip`, and `x-forwarded-for`. Any other header is ignored and every visitor shares one limit. A missing or invalid address also shares that limit. Only enable a header when the application origin cannot be reached except through that host.

---

## Interview Scoring System

Each prompt carries signals a strong answer tends to include, follow-up probes, and an outline of a stronger shape. Submitting an answer:

1. Scores the five dimensions from the text.
2. Checks which signals were hit or missed. Those badges stay on the rubric, so scores remain comparable.
3. Asks at most one follow-up. Warm-up never follows up. Standard asks when a core signal is missing. Pressure asks whenever a probed signal is missing.
4. Averages the answers into a debrief and names the next round.

### Scoring Weights

| Dimension | Weight |
| --- | ---: |
| Relevance | 0.18 |
| Structure | 0.20 |
| Specificity | 0.18 |
| Depth | 0.28 |
| Communication | 0.16 |

The overall score uses these same weights for every session.

A nudge reveals one signal and caps depth slightly. The outline on the debrief is a shape, not a script to memorize.

In AI mode the model writes the follow-up from the answer you gave. Warm-up still never follows up. A follow-up that repeats the prompt is discarded, and the bank probe is used when the model does not offer a usable one. A failed model call does not drop the text you typed.

---

## Installation and Local Development

### Prerequisites

- Node.js
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/Aayushi-Agarwal123/InterviewVerseAI.git
cd InterviewVerseAI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

### 4. Optional: Configure AI Mode

Follow the environment-variable instructions above. Leave the key empty, or set the provider to `local`, to use the local rubric and local templates.

### 5. Production

```bash
npm run build
npm start
```

`npm start` listens on `PORT` when the host sets it, and on port 3000 otherwise. Local development stays on port 43123. Set the Upstash variables before starting production, or AI requests stay unavailable while the pages continue to load.

---

## Validation Commands

```bash
npm run verify
npm run lint
npm run build
```

- `npm run verify` checks rubric and session behavior.
- `npm run lint` checks code quality.
- `npm run build` creates a production build.

---

## Technology Stack

- **Next.js** — App Router and server routes
- **React** — user interface
- **TypeScript** — application logic and type safety
- **Tailwind CSS** — styling
- **shadcn/ui** — UI primitives using Base UI
- **Google Gemini API** — optional AI coach and project generation
- **OpenAI-compatible API** — optional model provider
- **Browser APIs** — speech synthesis, speech recognition, camera preview, and Web Workers
- **LocalStorage** — browser session and learning data

The rubric still runs on the device when no usable key is set. With a usable key and model, the server asks the model for the five scores, a follow-up, and a sample answer, then stores that on the same session.

---

## Project Architecture

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

### Core Architecture

- `src/lib/domain.ts` holds session, question, and score types.
- `src/lib/questions` is the prompt bank, grouped by track and topic.
- `src/lib/engine` holds the rubric and the pure round state machine. React only reads and writes `Session` objects.
- `src/lib/coach` holds the shared server config, Gemini, OpenAI, and the local fallback.
- `src/app/api/coach` scores an answer or writes a debrief when the server reports AI mode, and uses the local rubric when no usable key is set or the model request fails.
- `src/app/api/career` plans a personalized interview, answers the mentor, and chooses the next avatar question. It uses Gemini only when that same config is ready.
- `src/app/api/builder` reports whether Gemini scaffolding is available and generates files only in that case. Otherwise it returns a local template.
- `src/lib/storage.ts` stores interview rounds in `interviewverse.v1`.
- `src/components/shell` holds navigation, the session store, and the career store.

---

## Data Storage

| Storage key | Purpose |
| --- | --- |
| `interviewverse.v1` | Interview rounds and session history |
| `interviewverse.career.v1` | Profile, roadmap checks, and other learning data |

Neither store holds an API key. History stays in this browser and is not synchronized across devices.

---

## Current Limitations

- No accounts. Each visitor's interview history stays in that browser.
- AI requests are rate-limited. Pages themselves are not.
- Interview history is browser-local.
- Voice features depend on browser support and microphone permission.
- AI features require a usable provider configuration. Placeholder values stay on local mode.
- Avatar interviews use illustrated avatars. There is no paid video-avatar service and no real-time phoneme lip-sync.
- Coding Arena executes JavaScript only.
- Job Match does not upload or review a resume.
- Generated project code is validated, then packaged for local download. This server does not install or execute it.

---

**Repository:** [Aayushi-Agarwal123/InterviewVerseAI](https://github.com/Aayushi-Agarwal123/InterviewVerseAI)
