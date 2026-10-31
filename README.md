# InterviewVerse AI

Practice a technical round or an HR conversation, then leave with a score you can compare to the last one.

InterviewVerse AI is a single-user studio. You pick an interviewer, answer in writing, and get a debrief on five dimensions: relevance, structure, specificity, depth, and communication. History stays in this browser. There is no account and no model API.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

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

The coach is local on purpose. A hosted model can be added later behind the same scoring functions without changing the room.

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
src/lib/storage.ts          versioned localStorage repository
```

The round state machine is pure. React only reads and writes `Session` objects. Scoring does not call the network.

### What the coach actually does

Each prompt carries signals (phrases a strong answer tends to include), follow-up probes, and an outline of a stronger shape. Submitting an answer:

1. Scores the five dimensions from the text.
2. On Standard, asks one follow-up when a core signal is missing. Warm-up never does. Pressure does whenever a probed signal is missing.
3. At the end, averages the answers into a debrief and names the next round.

A nudge reveals one signal and caps depth slightly. The outline on the debrief is a shape, not a script to memorize.

## Modules in this slice

- **Studio** — open round, averages, streak, recent debriefs.
- **Practice** — technical (Arun Mehta) or HR (Leela Kapoor), topic, pressure, length, optional focus.
- **Round** — prompt, timebox, answer, follow-up, early close.
- **Debrief** — headline, dimensions, per-question notes, missed signals.
- **Progress** — score trend and history. Clear deletes only this browser.

Topics: data structures, system design, frontend, backend, behavioral, leadership, conflict, career story.

## Later phases

1. **This slice.** Practice, rubric debrief, and local history.
2. **Model coach.** Implement the same score, follow-up, and debrief functions with an optional API key. Keep the rubric as the fallback when no key is set.
3. **Accounts.** Move the session repository off the device so history follows the person.
4. **Spoken rounds.** Voice in the same state machine, plus a second interviewer on one debrief.

Do not add those until this loop feels honest. A higher score should mean the signals were in the answer.
