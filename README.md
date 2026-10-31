# InterviewVerse AI

Practice a technical round or an HR conversation, then leave with a score you can compare to the last one.

InterviewVerse AI is a single-user studio. You pick an interviewer, answer in writing, and get a debrief on five dimensions: relevance, structure, specificity, depth, and communication. History stays in this browser. There is no account.

The coach can call Google Gemini or an OpenAI-compatible model from a server route. With no API key, the same screens use the local rubric. The key never ships to the browser. Gemini mode sends answers to Google's API. Nothing in this app turns on paid billing.

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
| `INTERVIEWVERSE_COACH_API_KEY` | For AI mode | Server-only secret. Leave empty for the local rubric. |
| `INTERVIEWVERSE_COACH_PROVIDER` | No | `gemini`, `openai`, or `local`. An empty value with a key still selects OpenAI. |
| `INTERVIEWVERSE_COACH_MODEL` | For Gemini | Gemini model ID from your project. OpenAI defaults to `gpt-4o-mini` when this is empty. |
| `INTERVIEWVERSE_COACH_BASE_URL` | No | Empty uses the provider default: Gemini `https://generativelanguage.googleapis.com/v1beta`, OpenAI `https://api.openai.com/v1`. |

Gemini uses the Developer API's `generateContent` request, not the OpenAI chat format. The key is sent as `x-goog-api-key` and is not put in the URL. A rate limit, quota error, rejected key, or unreadable reply is not retried. The answer is scored by the local rubric and kept. The sidebar says **Gemini AI Coach** or **Local Coach**, and says when answers are sent to Google.

## AI Project Builder

Open **AI Project Builder** in the navigation. Describe a product, pick a stack, and download a ZIP. The four starters are React + Vite + TypeScript, Next.js + TypeScript, Node.js + Express + TypeScript, and React + Express + MongoDB.

Gemini is used only when the server is already in Gemini mode with a model ID. It writes source files in checked batches: project configuration, frontend, backend, database when the stack has one, and documentation. Each file needs a relative path and is rejected if it is absolute, traverses directories, or is a secret, an API key, or `node_modules`. The preview labels the result **Gemini AI-generated project** or **Local Template-generated project**. A feature is listed as included only when that source is in the archive. If Gemini is unavailable or over quota, the **Local Template Builder** creates the starter and does not call it AI-generated. The ZIP is built in memory. It has no `node_modules` and no API key. Generated code is not installed or run on this server.

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
src/app                     routes: studio, practice, round, debrief, progress
src/components/ui           shadcn primitives
src/components/shell        navigation and the browser session store
src/features                one screen per folder
src/lib/domain.ts           session, question, and score types
src/lib/questions           prompt bank, grouped by track and topic
src/lib/engine/score.ts     rubric: signals, follow-ups, debrief
src/lib/engine/session.ts   round state machine
src/lib/coach               model provider, prompts, and the local fallback
src/app/api/coach           server route that reads the key
src/lib/storage.ts          versioned localStorage repository
```

The round state machine is pure. React only reads and writes `Session` objects. The browser calls `/api/coach` only when the server reports AI mode. The route scores with the rubric when no key is set, and again when the model request fails.

### What the coach actually does

Each prompt carries signals (phrases a strong answer tends to include), follow-up probes, and an outline of a stronger shape. Submitting an answer:

1. Scores the five dimensions from the text.
2. On Standard, asks one follow-up when a core signal is missing. Warm-up never does. Pressure does whenever a probed signal is missing.
3. At the end, averages the answers into a debrief and names the next round.

A nudge reveals one signal and caps depth slightly. The outline on the debrief is a shape, not a script to memorize.

In AI mode the model writes the follow-up from the answer you gave. Warm-up still never follows up. A follow-up that repeats the prompt is discarded, and the bank probe is used when the model does not offer a usable one. Hit and missed signals stay on the rubric, so the badges remain comparable. The overall score still uses the same weights: relevance 0.18, structure 0.20, specificity 0.18, depth 0.28, communication 0.16. A failed model call does not drop the text you typed.

## Modules in this slice

- **Studio** — open round, averages, streak, recent debriefs.
- **Practice** — technical (Arun Mehta) or HR (Leela Kapoor), topic, pressure, length, optional focus.
- **Round** — prompt, timebox, answer, follow-up, early close.
- **Debrief** — headline, dimensions, per-question notes, missed signals.
- **Progress** — score trend and history. Clear deletes only this browser.

Topics: data structures, system design, frontend, backend, behavioral, leadership, conflict, career story.

## Later phases

1. **This slice.** Practice, rubric debrief, and local history.
2. **Model coach.** Optional Gemini or OpenAI key. Same five dimensions, with the rubric as the fallback.
3. **Accounts.** Move the session repository off the device so history follows the person.
4. **Spoken rounds.** Voice in the same state machine, plus a second interviewer on one debrief.

Do not add those until this loop feels honest. A higher score should mean the signals were in the answer.
