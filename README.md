# InterviewVerse AI

Practice a technical round or an HR conversation, then leave with a score you can compare to the last one.

InterviewVerse AI is a single-user studio. You pick an interviewer, answer in writing, and get a debrief on five dimensions: relevance, structure, specificity, depth, and communication. History stays in this browser. There is no account.

The coach can call an OpenAI-compatible model from a server route. With no API key, the same screens use the local rubric. The key never ships to the browser.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Model coach

Copy `.env.example` to `.env.local` and set the key. Restart `npm run dev` after changing it.

```bash
INTERVIEWVERSE_COACH_PROVIDER=openai
INTERVIEWVERSE_COACH_API_KEY=sk-...
INTERVIEWVERSE_COACH_MODEL=gpt-4o-mini
INTERVIEWVERSE_COACH_BASE_URL=https://api.openai.com/v1
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `INTERVIEWVERSE_COACH_API_KEY` | For AI mode | Server-only secret. Leave empty for the local rubric. |
| `INTERVIEWVERSE_COACH_PROVIDER` | No | `openai` when a key is set, or `local` to force the rubric. Add another id in `src/lib/coach/providers.ts`. |
| `INTERVIEWVERSE_COACH_MODEL` | No | Defaults to `gpt-4o-mini`. |
| `INTERVIEWVERSE_COACH_BASE_URL` | No | OpenAI-compatible host. Defaults to `https://api.openai.com/v1`. |

`BASE_URL` is how you point the same provider at another OpenAI-compatible host. A different request shape needs a new entry in `MODEL_PROVIDERS`.

The sidebar says **AI Coach** or **Local Coach**. Local mode does not invent a sample answer or a model debrief. If a model call fails, the answer is scored on the rubric and kept.

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
2. **Model coach.** Optional OpenAI-compatible key. Same five dimensions, with the rubric as the fallback.
3. **Accounts.** Move the session repository off the device so history follows the person.
4. **Spoken rounds.** Voice in the same state machine, plus a second interviewer on one debrief.

Do not add those until this loop feels honest. A higher score should mean the signals were in the answer.
