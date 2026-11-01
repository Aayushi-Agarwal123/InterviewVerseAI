# InterviewVerse AI

**An AI-powered interview preparation studio for technical, HR, personalized, voice, and avatar-based practice.**

Practice a technical round, an HR conversation, a profile-based interview, a spoken round, or an AI avatar interview. Get a score across five dimensions and compare your performance with previous sessions.

InterviewVerse AI is a single-user, browser-based interview practice studio. Choose an interviewer, answer questions in writing or by voice, and receive a debrief covering:

- Relevance
- Structure
- Specificity
- Depth
- Communication

Your interview history and learning data stay in your browser. No account or registration is required.

---

## Features

### 1. Studio Dashboard
- View interview activity, average scores, and streaks.
- Access interview modes and other learning modules.
- Track your preparation from one dashboard.

### 2. Question-Based Interview
- Technical interviews with **Arun Mehta**.
- HR interviews with **Leela Kapoor**.
- Choose topics, difficulty, pressure mode, and interview length.
- Get follow-up questions and a final performance debrief.

### 3. Personalized Interview
- Build a candidate profile using your experience, skills, qualification, and target role.
- Get questions based on your profile.
- Adjust difficulty based on answer performance.
- Use Gemini-generated questions when AI mode is configured; otherwise, the local question bank is used.

### 4. AI Avatar Interview
- Dedicated interview room at `/avatar`.
- Technical, HR, and mixed interview modes.
- Illustrated interviewer avatars with speaking, listening, thinking, and idle states.
- Browser-based speech synthesis and microphone transcription.
- Mute, replay, pause, resume, and end controls.
- Optional camera-based self-view.

**Current limitations:** The avatars use CSS-based mouth animation during speech synthesis. Real-time phoneme lip-sync and third-party streaming video avatars are not implemented.

### 5. Voice Interview
- Browser speech synthesis for interview questions.
- Speech recognition for spoken answers when supported.
- Typed-answer fallback when speech recognition is unavailable or permission is denied.

### 6. AI Project Builder
Open **AI Project Builder** from the navigation.

Describe a project, choose a technology stack, and generate a downloadable ZIP.

Supported starter stacks:
- React + Vite + TypeScript
- Next.js + TypeScript
- Node.js + Express + TypeScript
- React + Express + MongoDB

When Gemini is configured, it generates project source files in validated batches. Otherwise, the application uses local project templates.

The builder includes:
- Project configuration and source generation.
- Frontend and backend starter files.
- Database integration for supported stacks.
- Generated-file validation.
- Implemented and missing feature reports.
- ZIP download.

Generated code is not installed or executed on the InterviewVerse AI server. The ZIP does not contain `node_modules` or API keys.

### 7. Additional Learning Modules
- **Roadmap:** Daily, weekly, and skill-based preparation tasks.
- **Mentor:** Suggested next actions based on saved profile and interview performance.
- **Coding Arena:** Original coding problems with visible sample test cases. JavaScript solutions run in a browser worker; other languages are saved but not executed.
- **Job Match:** Compare skills with a pasted job description. No resume upload is required.
- **Memory:** View or clear interview rounds, profile, roadmap checks, and learning notes separately.
- **Progress:** Track overall performance and compare AI Coach and Local Coach results separately.

---

## AI Model Configuration

The coach supports Google Gemini, OpenAI-compatible models, and a local rubric-based fallback.

The API key is read by the server and is never sent to the browser.

### Setup

1. Copy `.env.example` to `.env.local`.
2. Add your provider configuration.
3. Restart the development server after changing environment variables.

Example:

```env
INTERVIEWVERSE_COACH_PROVIDER=gemini
INTERVIEWVERSE_COACH_API_KEY=your_api_key
INTERVIEWVERSE_COACH_MODEL=your_model_id
INTERVIEWVERSE_COACH_BASE_URL=
```

### Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `INTERVIEWVERSE_COACH_API_KEY` | For AI mode | Server-only API secret. Leave empty to use the local rubric. |
| `INTERVIEWVERSE_COACH_PROVIDER` | No | `gemini`, `openai`, or `local`. |
| `INTERVIEWVERSE_COACH_MODEL` | For Gemini | Gemini model ID. OpenAI defaults to `gpt-4o-mini` when empty. |
| `INTERVIEWVERSE_COACH_BASE_URL` | No | Optional provider base URL. Empty uses the provider default. |

Default provider URLs:

- Gemini: `https://generativelanguage.googleapis.com/v1beta`
- OpenAI: `https://api.openai.com/v1`

Gemini uses the Developer API's `generateContent` request format and sends the key through the `x-goog-api-key` header.

### Local Fallback and Error Handling

- With no valid API configuration, the application uses the Local Coach.
- Placeholder API keys and model IDs are not sent to the provider.
- Failed model requests fall back to the local rubric.
- Invalid keys, restricted keys, disabled APIs, unknown models, malformed requests, quota errors, and rate limits are not automatically retried.
- The user's submitted answer is retained even when a model request fails.
- The interface identifies whether the session uses Gemini AI Coach or Local Coach.

**Privacy note:** In Gemini mode, interview answers are sent to Google's API for processing. Use the local mode if you do not want answers sent to an external model provider.

Nothing in the application automatically enables paid billing.

---

## Interview Scoring System

Each interview prompt includes:
- Signals that indicate a strong answer.
- Follow-up probes.
- An outline describing a stronger answer structure.

When an answer is submitted:

1. The five scoring dimensions are evaluated.
2. The system checks whether important answer signals are missing.
3. A follow-up may be generated according to the selected interview mode.
4. The final debrief averages the answers and recommends the next round.

### Scoring Weights

| Dimension | Weight |
|---|---:|
| Relevance | 0.18 |
| Structure | 0.20 |
| Specificity | 0.18 |
| Depth | 0.28 |
| Communication | 0.16 |

The overall score uses the same weights for comparable results across sessions.

A nudge reveals one answer signal and slightly caps the depth score. The debrief outline is intended as guidance, not a script to memorize.

In AI mode, the model can generate follow-up questions based on the submitted answer. If a generated follow-up repeats the original prompt or is unusable, the question bank's probe is used instead.

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

Open:

[http://127.0.0.1:43123](http://127.0.0.1:43123)

### 4. Optional: Configure AI Mode

Follow the environment-variable instructions above to configure Gemini or an OpenAI-compatible provider.

---

## Validation Commands

Run the following commands to verify the project:

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
- **React** — User interface
- **TypeScript** — Application logic and type safety
- **Tailwind CSS** — Styling
- **shadcn/ui** — UI primitives using Base UI
- **Google Gemini API** — Optional AI coach and project generation
- **OpenAI-compatible API** — Optional model provider
- **Browser APIs** — Speech synthesis, speech recognition, camera preview, and Web Workers
- **LocalStorage** — Browser-based session and learning data

---

## Project Architecture

```text
src/
├── app/
│   ├── studio/
│   ├── practice/
│   ├── round/
│   ├── debrief/
│   ├── progress/
│   └── api/
│       └── coach/
│
├── components/
│   ├── ui/
│   └── shell/
│
├── features/
│
└── lib/
    ├── domain.ts
    ├── questions/
    ├── engine/
    │   ├── score.ts
    │   └── session.ts
    ├── coach/
    └── storage.ts
```

### Core Architecture

- `src/lib/domain.ts` — Session, question, and scoring types.
- `src/lib/questions` — Question bank grouped by track and topic.
- `src/lib/engine/score.ts` — Rubric signals, follow-ups, and debrief logic.
- `src/lib/engine/session.ts` — Pure interview round state machine.
- `src/lib/coach` — Model provider, prompts, and local fallback.
- `src/app/api/coach` — Server route that reads the API key and handles coach requests.
- `src/lib/storage.ts` — Versioned LocalStorage repository.
- `src/components/shell` — Navigation and browser session store.

The interview round state machine is independent of React. React reads and updates `Session` objects, while the browser calls `/api/coach` only when the server reports AI mode.

When no key is configured, the local rubric handles scoring. If a model request fails, the local rubric is used again.

---

## Data Storage

InterviewVerse AI uses browser-based storage:

| Storage Key | Purpose |
|---|---|
| `interviewverse.v1` | Interview rounds and session history |
| `interviewverse.career.v1` | Learning data and career-related information |

Neither store holds an API key.

History is stored locally in the browser and is not automatically synchronized across devices.

---

## Current Limitations

- Single-user application; no account or authentication system.
- Interview history is browser-local.
- Voice features depend on browser support and microphone permissions.
- AI features require a valid provider configuration.
- AI avatar interviews use illustrated avatars, not third-party real-time video avatars.
- Coding Arena executes JavaScript only.
- Job Match does not include resume upload.
- Generated project code is validated but not installed or executed on the server.

---

## Project Status

InterviewVerse AI is developed as a **Project Scaffolding-based application**, with modular features, reusable components, separate interview logic, server-side AI integration, and local fallback functionality.

The application is designed to support interview practice, performance tracking, and structured technical and HR preparation in one browser-based studio.

---

**Repository:** [Aayushi-Agarwal123/InterviewVerseAI](https://github.com/Aayushi-Agarwal123/InterviewVerseAI)
