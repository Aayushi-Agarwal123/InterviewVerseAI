import { personaFor, roleLabel, topicById } from "@/lib/catalog";
import type { Question } from "@/lib/domain";
import { answerText } from "@/lib/coach/local";
import type { DebriefInput, EvaluateInput } from "@/lib/coach/schema";

export type ChatMessage = { role: "system" | "user"; content: string };

function personaBrief(track: Question["track"]): string {
  const persona = personaFor(track);
  if (track === "hr") {
    return [
      `You are ${persona.name}, a talent partner running a realistic HR interview.`,
      "You are friendly and professional.",
      "You listen for ownership, leadership, conflict, teamwork, and career judgment.",
      "You want what the candidate personally did, and the result.",
      "Do not turn a mood into a story they did not tell.",
    ].join(" ");
  }
  return [
    `You are ${persona.name}, a staff engineer running a realistic technical interview.`,
    "You focus on data structures, system design, frontend, and backend.",
    "You are direct, calm, and specific.",
    "Ask challenging questions a hiring panel would actually ask.",
    "Do not praise fluff, and do not invent companies or metrics the candidate did not say.",
  ].join(" ");
}

const SCORE_RULES = [
  "Score each dimension as an integer from 0 to 100.",
  "100 is a strong onsite answer. A one-line answer is thin. Do not inflate.",
  "relevance: answers the prompt that was asked.",
  "structure: ordered, with a beginning and a consequence.",
  "specificity: names, numbers, constraints, or tradeoffs.",
  "depth: failure modes, alternatives, and why this rather than that.",
  "communication: clear sentences, little filler, a length a panel can follow.",
  "Do not subtract points for a nudge. The server applies that penalty.",
  "Return JSON only.",
].join(" ");

export function evaluationMessages(question: Question, input: EvaluateInput): ChatMessage[] {
  const topic = topicById(question.topic).label;
  const signals = question.signals
    .map((signal) => `- ${signal.label}: ${signal.hint}`)
    .join("\n");
  const shape = question.outline.map((line, index) => `${index + 1}. ${line}`).join("\n");
  const asked = [question.prompt, ...input.asked].filter(Boolean).join("\n- ");
  return [
    {
      role: "system",
      content: [
        personaBrief(question.track),
        SCORE_RULES,
        "followUp is null, or one next question based on what they actually said.",
        "Ask it only when the answer is vague, incomplete, or misses a signal.",
        "Never repeat the original prompt or any earlier question.",
        "On a warm-up, followUp must be null.",
        "If this message is already a follow-up, followUp must be null.",
        "sampleAnswer is a stronger first-person answer the candidate could have given. It is not a claim about what they said.",
        'JSON shape: {"dimensions":{"relevance":0,"structure":0,"specificity":0,"depth":0,"communication":0},"strengths":[""],"improvements":[""],"tips":[""],"sampleAnswer":"","followUp":null}',
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Role: ${roleLabel(input.role)}`,
        `Topic: ${topic}`,
        `Pressure: ${input.difficulty}`,
        input.focus ? `Focus they asked for: ${input.focus}` : "",
        input.hintUsed ? "They used a nudge before answering." : "",
        `Prompt: ${question.prompt}`,
        `Setup: ${question.setup}`,
        `Signals a strong answer tends to cover:\n${signals}`,
        `A stronger shape:\n${shape}`,
        `Already asked:\n- ${asked}`,
        input.phase === "followup"
          ? `First answer:\n${input.priorAnswer}\n\nFollow-up they were asked:\n${input.followUpPrompt ?? ""}\n\nTheir follow-up answer:\n${input.answer}`
          : `Their answer:\n${answerText(input)}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}

export function debriefMessages(input: DebriefInput): ChatMessage[] {
  const persona = personaFor(input.track);
  const topic = topicById(input.topic).label;
  const turns = input.turns
    .map((turn, index) =>
      [
        `Answer ${index + 1} (${turn.overall}/100)`,
        `Prompt: ${turn.prompt}`,
        `Said: ${turn.answer}`,
        turn.followUpPrompt ? `Follow-up: ${turn.followUpPrompt}` : "",
        turn.followUpAnswer ? `Follow-up answer: ${turn.followUpAnswer}` : "",
        turn.strengths.length ? `Held: ${turn.strengths.join(" ")}` : "",
        turn.improvements.length ? `Change: ${turn.improvements.join(" ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  return [
    {
      role: "system",
      content: [
        personaBrief(input.track),
        `You are ${persona.name} writing the debrief after the round.`,
        "Do not invent a new overall score. The numbers are already decided.",
        "narrative is two to four sentences about this candidate's answers.",
        "recommendations are specific things to practice next, not slogans.",
        'JSON shape: {"narrative":"","recommendations":[""]}',
        "Return JSON only.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Role: ${roleLabel(input.role)}`,
        `Topic: ${topic}`,
        `Pressure: ${input.difficulty}`,
        input.focus ? `Focus they asked for: ${input.focus}` : "",
        turns,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}
