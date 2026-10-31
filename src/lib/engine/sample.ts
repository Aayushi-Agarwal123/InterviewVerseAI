import type { Session } from "@/lib/domain";
import { createSession, submitAnswer } from "@/lib/engine/session";

const SAMPLE_ID = "sample-behavioral-round";

const ANSWERS = [
  `Last March our launch for the billing rewrite was fixed to a Friday because a customer migration could not move. I owned the cut list. I decided we would ship the invoice path and defer the admin export, and I told the waiting team that afternoon. We shipped on time. The export slipped nine days. I would make the same cut again.`,
  `I shipped a migration that locked the orders table and the checkout timed out for about forty minutes. Customers felt it, and the on-call teammate was paged. I rolled it back, then added a test that refuses a migration without a lock timeout. I told the channel as soon as I knew it was my change.`,
  `In my review my manager told me my design docs arrived too late for anyone to change them. I had been writing them the night before. I stopped doing that. I now send a one-page draft a week earlier and ask for the objection first. The next review, she noticed the draft had comments from two teammates before the meeting.`,
];

export function buildSampleSession(now = new Date().toISOString()): Session {
  let session = createSession(
    {
      track: "hr",
      topic: "behavioral",
      difficulty: "standard",
      role: "fullstack",
      questionCount: 3,
      focus: "ownership with a number",
    },
    {
      id: SAMPLE_ID,
      now,
      sample: true,
      questionIds: [
        "behavioral-deadline",
        "behavioral-mistake",
        "behavioral-feedback",
      ],
    },
  );

  for (const answer of ANSWERS) {
    session = submitAnswer(session, answer, now);
    if (session.phase === "followup") {
      session = submitAnswer(
        session,
        "I wrote the decision down the same day and named the owner for the piece we deferred.",
        now,
      );
    }
  }

  return session;
}

export const SAMPLE_SESSION_ID = SAMPLE_ID;
