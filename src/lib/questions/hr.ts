import type { Question } from "@/lib/domain";

export const HR: Question[] = [
  {
    id: "behavioral-deadline",
    track: "hr",
    topic: "behavioral",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "Tell me about a time a deadline was going to slip and the people waiting could not move it.",
    setup: "Leela wants the constraint, what you personally changed, and how it ended.",
    signals: [
      {
        id: "behavioral-deadline-constraint",
        label: "the real constraint",
        hint: "Name the date, the customer, or the launch. ‘We were busy’ is not a constraint.",
        patterns: ["deadline", "launch", "date", "friday", "customer", "release", "hours"],
      },
      {
        id: "behavioral-deadline-owned",
        label: "what you owned",
        hint: "Use I, and name the decision that was yours.",
        patterns: ["i owned", "i decided", "i cut", "i was responsible", "my call", "i told"],
      },
      {
        id: "behavioral-deadline-result",
        label: "a result you can check",
        hint: "Ship, slip, or a reduced scope, with a number or a named outcome.",
        patterns: ["shipped", "on time", "cut scope", "deferred", "reduced", "percent", "days"],
      },
    ],
    followUps: [
      {
        signalId: "behavioral-deadline-owned",
        prompt: "What did you personally stop doing so the date could hold?",
      },
      {
        signalId: "behavioral-deadline-result",
        prompt: "Who was unhappy with the cut, and how did you tell them?",
      },
    ],
    outline: [
      "Name the date and who was blocked.",
      "Say the scope you cut or the help you asked for, in the first person.",
      "End with what shipped, what slipped, and what you would repeat.",
    ],
  },
  {
    id: "behavioral-mistake",
    track: "hr",
    topic: "behavioral",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt: "Tell me about a mistake you made that other people felt.",
    setup: "A tidy ‘I work too hard’ story will not count. She wants the repair.",
    signals: [
      {
        id: "behavioral-mistake-specific",
        label: "a specific miss",
        hint: "Name the bug, the email, the wrong call. Not a personality trait.",
        patterns: ["bug", "outage", "wrong", "missed", "broke", "shipped a", "email"],
      },
      {
        id: "behavioral-mistake-repair",
        label: "the repair, not only the apology",
        hint: "What did you change in the system or the process after?",
        patterns: ["fixed", "test", "rollback", "apolog", "changed", "added", "process"],
      },
      {
        id: "behavioral-mistake-cost",
        label: "the cost to someone else",
        hint: "Who waited, who was paged, or what number moved the wrong way.",
        patterns: ["customer", "teammate", "paged", "hours", "users", "delayed"],
      },
    ],
    followUps: [
      {
        signalId: "behavioral-mistake-repair",
        prompt: "What would catch this the next time, without you in the room?",
      },
      {
        signalId: "behavioral-mistake-cost",
        prompt: "Who did you tell, and how long after you knew?",
      },
    ],
    outline: [
      "State the mistake in one sentence.",
      "Name who felt it.",
      "Describe the repair and the guard you added. Skip the moral.",
    ],
  },
  {
    id: "behavioral-ambiguous",
    track: "hr",
    topic: "behavioral",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "Describe a project where the requirements were still moving when you had to start.",
    setup: "She is listening for how you made progress without pretending you had certainty.",
    signals: [
      {
        id: "behavioral-ambiguous-unknown",
        label: "what was actually unknown",
        hint: "Separate the open question from the work you could already do.",
        patterns: ["unknown", "unclear", "assumption", "we did not know", "open question"],
      },
      {
        id: "behavioral-ambiguous-slice",
        label: "a thin slice you shipped anyway",
        hint: "Name the first version and who used it.",
        patterns: ["slice", "prototype", "first version", "shipped", "draft", "pilot"],
      },
      {
        id: "behavioral-ambiguous-check",
        label: "how you checked the assumption",
        hint: "A user, a metric, or a decision meeting. Not ‘we synced’.",
        patterns: ["asked", "user", "metric", "reviewed", "decision", "feedback"],
      },
    ],
    followUps: [
      {
        signalId: "behavioral-ambiguous-unknown",
        prompt: "Which assumption turned out to be wrong, and when did you find out?",
      },
      {
        signalId: "behavioral-ambiguous-slice",
        prompt: "What did you refuse to build until the requirement settled?",
      },
    ],
    outline: [
      "Name the unknown and the date you still had to move.",
      "Ship a slice that tests one assumption.",
      "Say what you learned and what you threw away.",
    ],
  },
  {
    id: "behavioral-feedback",
    track: "hr",
    topic: "behavioral",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt: "Tell me about feedback you did not want to hear, and what you did with it.",
    setup: "The feedback has to be specific. A promotion story is the wrong shape.",
    signals: [
      {
        id: "behavioral-feedback-quote",
        label: "the feedback itself",
        hint: "Paraphrase what they said, not how it made you feel first.",
        patterns: ["told me", "said", "feedback", "pointed out", "review"],
      },
      {
        id: "behavioral-feedback-change",
        label: "a behavior you changed",
        hint: "Name the old habit and the new one.",
        patterns: ["started", "stopped", "changed", "now i", "instead"],
      },
      {
        id: "behavioral-feedback-proof",
        label: "evidence it stuck",
        hint: "A later review, a metric, or a person who noticed.",
        patterns: ["next", "later", "noticed", "review", "month", "teammate"],
      },
    ],
    followUps: [
      {
        signalId: "behavioral-feedback-change",
        prompt: "What did you stop doing in the first week, specifically?",
      },
      {
        signalId: "behavioral-feedback-proof",
        prompt: "How would your critic know the change lasted?",
      },
    ],
    outline: [
      "Quote the feedback.",
      "Name the behavior you changed.",
      "Give one later proof. Leave the gratitude speech out.",
    ],
  },
  {
    id: "behavioral-disagree",
    track: "hr",
    topic: "behavioral",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "Tell me about a technical disagreement with a teammate where you did not get your way.",
    setup: "She wants the argument and the relationship after it. Not a win story.",
    signals: [
      {
        id: "behavioral-disagree-point",
        label: "both positions",
        hint: "State your proposal and theirs in concrete terms.",
        patterns: ["i wanted", "they wanted", "proposal", "alternative", "approach"],
      },
      {
        id: "behavioral-disagree-commit",
        label: "how you committed after the decision",
        hint: "Disagree, then build the chosen path. Say what you did next.",
        patterns: ["committed", "went with", "their approach", "i built", "decision"],
      },
      {
        id: "behavioral-disagree-after",
        label: "what you learned or would still argue",
        hint: "Either the outcome proved them right, or you still hold a narrower objection.",
        patterns: ["turned out", "learned", "still think", "right", "wrong"],
      },
    ],
    followUps: [
      {
        signalId: "behavioral-disagree-commit",
        prompt: "What would have been disloyal after the decision, and did you avoid it?",
      },
      {
        signalId: "behavioral-disagree-point",
        prompt: "What evidence would have changed your mind in the room?",
      },
    ],
    outline: [
      "State both proposals without a villain.",
      "Say who decided and how you executed their path.",
      "Close with what the result taught you.",
    ],
  },
  {
    id: "behavioral-priority",
    track: "hr",
    topic: "behavioral",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt:
      "Two managers asked you for work in the same week and both called it urgent. What did you do?",
    setup: "A story about working all night is a weaker answer than a story about a trade.",
    signals: [
      {
        id: "behavioral-priority-criteria",
        label: "the criteria you used",
        hint: "Customer impact, deadline, or reversibility. Pick real ones.",
        patterns: ["impact", "deadline", "customer", "reversible", "cost", "criteria"],
      },
      {
        id: "behavioral-priority-told",
        label: "you told the person who would wait",
        hint: "Priority is a conversation, not a silent choice.",
        patterns: ["told", "i said", "explained", "pushed back", "negotiated"],
      },
      {
        id: "behavioral-priority-result",
        label: "what slipped and what did not",
        hint: "Name both outcomes.",
        patterns: ["slipped", "waited", "shipped", "deferred", "first"],
      },
    ],
    followUps: [
      {
        signalId: "behavioral-priority-told",
        prompt: "What did you say to the manager whose work moved?",
      },
      {
        signalId: "behavioral-priority-criteria",
        prompt: "Which criterion would you drop if both tasks had the same customer impact?",
      },
    ],
    outline: [
      "Name the two asks.",
      "State the criterion and the conversation with the person who had to wait.",
      "End with what shipped and what moved.",
    ],
  },
  {
    id: "leadership-quality",
    track: "hr",
    topic: "leadership",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "Tell me about a time you raised the quality bar for work you did not officially own.",
    setup: "Influence without a title. She will ask what changed for other people.",
    signals: [
      {
        id: "leadership-quality-gap",
        label: "the gap you saw",
        hint: "A missing test, a review habit, an outage pattern. Be concrete.",
        patterns: ["review", "test", "bug", "outage", "standard", "quality"],
      },
      {
        id: "leadership-quality-influence",
        label: "how you brought other people with you",
        hint: "A doc, a review, an example you did first. Not a mandate.",
        patterns: ["showed", "wrote", "example", "paired", "proposed", "doc"],
      },
      {
        id: "leadership-quality-stuck",
        label: "evidence the bar stayed up",
        hint: "A check that still runs, or a habit other people kept.",
        patterns: ["still", "adopted", "checklist", "ci", "team now", "kept"],
      },
    ],
    followUps: [
      {
        signalId: "leadership-quality-influence",
        prompt: "Who disagreed, and what did you change in your pitch?",
      },
      {
        signalId: "leadership-quality-stuck",
        prompt: "What happens to this bar when you are on leave?",
      },
    ],
    outline: [
      "Name the quality gap and why it was costing the team.",
      "Show the example you did first, then how others adopted it.",
      "Point at something that still enforces it without you.",
    ],
  },
  {
    id: "leadership-unblock",
    track: "hr",
    topic: "leadership",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt: "Describe a project that was stuck, and how you got it moving.",
    setup: "Stuck means a decision, a dependency, or a fear. Not ‘we were busy’.",
    signals: [
      {
        id: "leadership-unblock-cause",
        label: "why it was stuck",
        hint: "Name the missing decision or the dependency.",
        patterns: ["stuck", "blocked", "waiting", "decision", "dependency", "unclear"],
      },
      {
        id: "leadership-unblock-move",
        label: "the move you made",
        hint: "A meeting with a decision, a smaller scope, or an escalation with a proposal.",
        patterns: ["i proposed", "i called", "i wrote", "smaller", "escalat", "decided"],
      },
      {
        id: "leadership-unblock-motion",
        label: "motion afterward",
        hint: "What shipped in the following days.",
        patterns: ["shipped", "unblocked", "next day", "that week", "merged", "started"],
      },
    ],
    followUps: [
      {
        signalId: "leadership-unblock-cause",
        prompt: "Why had the team been unable to make that decision themselves?",
      },
      {
        signalId: "leadership-unblock-move",
        prompt: "What did you explicitly not take on, so the original owners kept the work?",
      },
    ],
    outline: [
      "Name the block in one sentence.",
      "Describe the smallest action that created a decision.",
      "Say what moved in the next few days, and what you handed back.",
    ],
  },
  {
    id: "leadership-mentor",
    track: "hr",
    topic: "leadership",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "Tell me about someone you helped get better at the work. What did they do differently afterward?",
    setup: "A mentee, a new teammate, or a peer. The change has to be visible.",
    signals: [
      {
        id: "leadership-mentor-start",
        label: "where they started",
        hint: "A skill gap, not a compliment.",
        patterns: ["new", "struggling", "had not", "first time", "gap", "junior"],
      },
      {
        id: "leadership-mentor-method",
        label: "how you taught",
        hint: "Pairing, a review ritual, a dry run. Not ‘I supported them’.",
        patterns: ["paired", "reviewed", "practice", "showed", "walked through", "feedback"],
      },
      {
        id: "leadership-mentor-after",
        label: "what they did without you",
        hint: "A review they led, a system they owned, a result with their name on it.",
        patterns: ["on their own", "led", "owned", "without me", "later", "shipped"],
      },
    ],
    followUps: [
      {
        signalId: "leadership-mentor-method",
        prompt: "What did you stop doing so they had to take the next one?",
      },
      {
        signalId: "leadership-mentor-after",
        prompt: "How do you know it was your help and not just time passing?",
      },
    ],
    outline: [
      "Name the starting gap.",
      "Describe the practice you ran together.",
      "End on something they now do without you.",
    ],
  },
  {
    id: "leadership-no",
    track: "hr",
    topic: "leadership",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt: "Tell me about a time you said no to a request from someone senior.",
    setup: "She wants the no, the reason, and the relationship after.",
    signals: [
      {
        id: "leadership-no-ask",
        label: "the ask",
        hint: "What they wanted, in concrete terms.",
        patterns: ["asked", "wanted", "request", "roadmap", "feature", "deadline"],
      },
      {
        id: "leadership-no-reason",
        label: "the reason, tied to a cost",
        hint: "Risk, capacity, or a user. Not ‘I was uncomfortable’.",
        patterns: ["because", "risk", "capacity", "customer", "cost", "tradeoff", "trade-off"],
      },
      {
        id: "leadership-no-offer",
        label: "what you offered instead",
        hint: "A no with a smaller yes is stronger than a flat refusal.",
        patterns: ["instead", "offered", "alternative", "later", "smaller"],
      },
    ],
    followUps: [
      {
        signalId: "leadership-no-reason",
        prompt: "What evidence did you put in front of them?",
      },
      {
        signalId: "leadership-no-offer",
        prompt: "How did the relationship look a month later?",
      },
    ],
    outline: [
      "State the request.",
      "Give the cost of saying yes.",
      "Offer the alternative you actually delivered.",
    ],
  },
  {
    id: "leadership-align",
    track: "hr",
    topic: "leadership",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "Two teams had different plans for the same user problem. How did you get them onto one plan?",
    setup: "You may not have been the manager of either team.",
    signals: [
      {
        id: "leadership-align-conflict",
        label: "the actual disagreement",
        hint: "Two plans, named. Not ‘there was misalignment’.",
        patterns: ["team", "plan", "disagreed", "different", "both wanted"],
      },
      {
        id: "leadership-align-shared",
        label: "a shared fact you put in the middle",
        hint: "A user, a metric, a date, a constraint both sides accepted.",
        patterns: ["user", "metric", "data", "constraint", "we agreed", "fact"],
      },
      {
        id: "leadership-align-plan",
        label: "one plan with an owner",
        hint: "Who owned the outcome after the meeting.",
        patterns: ["one plan", "owner", "decided", "roadmap", "shipped"],
      },
    ],
    followUps: [
      {
        signalId: "leadership-align-shared",
        prompt: "What fact would have made you choose the other team’s plan?",
      },
      {
        signalId: "leadership-align-plan",
        prompt: "What did the team that ‘lost’ still own?",
      },
    ],
    outline: [
      "Name both plans.",
      "Put one shared fact in the middle.",
      "Leave with a single owner and a date.",
    ],
  },
  {
    id: "leadership-incident",
    track: "hr",
    topic: "leadership",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "Walk me through an incident where you were the person others looked at, even if you did not cause it.",
    setup: "Coordination, communication, and the repair. Skip the heroics.",
    signals: [
      {
        id: "leadership-incident-role",
        label: "your role in the room",
        hint: "Incident lead, communicator, or the person on the fix. Pick one.",
        patterns: ["i coordinated", "i led", "i updated", "i was", "my role"],
      },
      {
        id: "leadership-incident-comms",
        label: "who you updated, and on what cadence",
        hint: "Stakeholders waiting in silence is the failure mode.",
        patterns: ["updated", "every", "status", "stakeholders", "customer", "slack"],
      },
      {
        id: "leadership-incident-after",
        label: "the follow-up that survived the incident",
        hint: "A fix, a test, or a change in paging. Not only a retrospective mood.",
        patterns: ["postmortem", "retro", "action", "test", "alert", "fixed"],
      },
    ],
    followUps: [
      {
        signalId: "leadership-incident-comms",
        prompt: "What did you tell people when you still did not know the cause?",
      },
      {
        signalId: "leadership-incident-after",
        prompt: "Which action item actually shipped, and which one died?",
      },
    ],
    outline: [
      "State your role and the user impact.",
      "Describe the update cadence while the cause was unknown.",
      "End with the change that is still in the system.",
    ],
  },
  {
    id: "conflict-manager",
    track: "hr",
    topic: "conflict",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt: "Tell me about a disagreement with your manager that you did not drop.",
    setup: "Respect and a point of view can coexist. She wants both.",
    signals: [
      {
        id: "conflict-manager-issue",
        label: "the issue, separated from the person",
        hint: "A decision, a priority, or a process. Not their personality.",
        patterns: ["decision", "priority", "disagreed", "direction", "approach"],
      },
      {
        id: "conflict-manager-how",
        label: "how you raised it",
        hint: "A private conversation, a written option, a proposed experiment.",
        patterns: ["i told", "1:1", "one on one", "wrote", "private", "asked"],
      },
      {
        id: "conflict-manager-outcome",
        label: "the outcome and how you lived with it",
        hint: "You may have lost. Say what you did after.",
        patterns: ["we changed", "they decided", "i accepted", "experiment", "result"],
      },
    ],
    followUps: [
      {
        signalId: "conflict-manager-how",
        prompt: "What did you avoid saying, on purpose?",
      },
      {
        signalId: "conflict-manager-outcome",
        prompt: "If they had said no again, what would you have done next?",
      },
    ],
    outline: [
      "State the decision you disagreed with.",
      "Describe the private, specific conversation.",
      "Close with the outcome and your behavior after it.",
    ],
  },
  {
    id: "conflict-credit",
    track: "hr",
    topic: "conflict",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt:
      "Someone presented your work as theirs. What did you do?",
    setup: "She is watching whether you can be direct without a public scene.",
    signals: [
      {
        id: "conflict-credit-fact",
        label: "what actually happened",
        hint: "The meeting, the doc, the decision. Keep it factual.",
        patterns: ["meeting", "doc", "presented", "said they", "my work", "wrote"],
      },
      {
        id: "conflict-credit-direct",
        label: "a direct conversation",
        hint: "You talked to them, or to the room, with a specific correction.",
        patterns: ["i told", "i said", "talked", "corrected", "private"],
      },
      {
        id: "conflict-credit-next",
        label: "what you changed so it is harder next time",
        hint: "Authorship, a shared update, a review. A system, not a grudge.",
        patterns: ["author", "next time", "shared", "update", "review", "visible"],
      },
    ],
    followUps: [
      {
        signalId: "conflict-credit-direct",
        prompt: "What sentence did you use when you raised it?",
      },
      {
        signalId: "conflict-credit-next",
        prompt: "What would you do differently if the person was a level above you?",
      },
    ],
    outline: [
      "Describe the moment plainly.",
      "Say the sentence you used to correct it.",
      "Name the habit that makes ownership visible without a fight.",
    ],
  },
  {
    id: "conflict-blame",
    track: "hr",
    topic: "conflict",
    difficulties: ["warmup", "standard"],
    minutes: 6,
    prompt:
      "After an incident, blame started to settle on one person. How did you handle the room?",
    setup: "You might have been that person, or the person next to them.",
    signals: [
      {
        id: "conflict-blame-focus",
        label: "you moved the room to the system",
        hint: "Timeline, guard, or missing check. Not a speech about kindness.",
        patterns: ["timeline", "system", "blameless", "what failed", "check", "process"],
      },
      {
        id: "conflict-blame-person",
        label: "you still treated the person as a person",
        hint: "A private check-in or a public correction of the pile-on.",
        patterns: ["private", "checked in", "i said", "not their fault", "defended"],
      },
      {
        id: "conflict-blame-change",
        label: "a change that reduces repeat blame",
        hint: "An owner for an action, a test, an on-call change.",
        patterns: ["action", "owner", "test", "runbook", "changed", "alert"],
      },
    ],
    followUps: [
      {
        signalId: "conflict-blame-focus",
        prompt: "What did you say in the moment the pile-on started?",
      },
      {
        signalId: "conflict-blame-change",
        prompt: "Who owned the fix, and how did you keep it from becoming ‘everyone’?",
      },
    ],
    outline: [
      "Name the incident and the person blame found.",
      "Redirect to the timeline and the missing guard.",
      "Leave with an owner for the change, and a private word with the person.",
    ],
  },
  {
    id: "conflict-dependency",
    track: "hr",
    topic: "conflict",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt:
      "A team you depended on missed a date your launch needed. How did you handle it with them?",
    setup: "Slack pressure and a surprise escalation are the failure modes.",
    signals: [
      {
        id: "conflict-dependency-impact",
        label: "the impact, said plainly",
        hint: "What slips for your user if their date slips.",
        patterns: ["launch", "user", "slips", "blocked", "date", "impact"],
      },
      {
        id: "conflict-dependency-ask",
        label: "a specific ask, not a vent",
        hint: "A smaller deliverable, a date, or a workaround you proposed.",
        patterns: ["asked for", "workaround", "smaller", "can you", "proposed", "by friday"],
      },
      {
        id: "conflict-dependency-tone",
        label: "you kept the working relationship",
        hint: "You talked to them before you talked about them.",
        patterns: ["talked to them", "directly", "before i escalated", "we agreed", "partner"],
      },
    ],
    followUps: [
      {
        signalId: "conflict-dependency-ask",
        prompt: "What workaround did you prepare in case they still missed?",
      },
      {
        signalId: "conflict-dependency-tone",
        prompt: "When would you escalate, and to whom, with what already tried?",
      },
    ],
    outline: [
      "State the impact on your user.",
      "Make one specific ask, after talking to them directly.",
      "Have a workaround. Escalate with the history, not the frustration.",
    ],
  },
  {
    id: "conflict-process",
    track: "hr",
    topic: "conflict",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt:
      "You and a peer wanted different processes for the same team ritual. How did you resolve it?",
    setup: "Code review, stand-up, planning, or on-call. Pick one.",
    signals: [
      {
        id: "conflict-process-cost",
        label: "the cost of each process",
        hint: "Time, quality, or delay. Both sides have a cost.",
        patterns: ["cost", "time", "slower", "quality", "overhead", "tradeoff", "trade-off"],
      },
      {
        id: "conflict-process-trial",
        label: "a trial with an end date",
        hint: "An experiment beats a philosophical win.",
        patterns: ["tried", "experiment", "two weeks", "trial", "pilot"],
      },
      {
        id: "conflict-process-decide",
        label: "how you decided to keep or drop it",
        hint: "A signal you agreed on before the trial.",
        patterns: ["decided", "kept", "dropped", "metric", "retro", "agreed"],
      },
    ],
    followUps: [
      {
        signalId: "conflict-process-trial",
        prompt: "What signal, agreed in advance, would have made you drop your own idea?",
      },
      {
        signalId: "conflict-process-cost",
        prompt: "Whose time was the process actually spending?",
      },
    ],
    outline: [
      "Name both rituals and their costs.",
      "Run a time-boxed trial.",
      "Decide from a signal you named before the trial started.",
    ],
  },
  {
    id: "conflict-values",
    track: "hr",
    topic: "conflict",
    difficulties: ["standard", "pressure"],
    minutes: 6,
    prompt:
      "Tell me about a time you thought the team was about to do something you could not stand behind.",
    setup: "A user harm, a dark pattern, a fake metric, a skipped safety check. Be specific.",
    signals: [
      {
        id: "conflict-values-line",
        label: "the line you would not cross",
        hint: "Say what the user or the teammate would have suffered.",
        patterns: ["user", "harm", "unsafe", "misleading", "skip", "privacy", "honest"],
      },
      {
        id: "conflict-values-raise",
        label: "how you raised it",
        hint: "In the room, with an alternative, not a leak or a sulk.",
        patterns: ["i raised", "i said", "alternative", "meeting", "wrote"],
      },
      {
        id: "conflict-values-end",
        label: "how it ended",
        hint: "The decision changed, or you documented your dissent and lived with the call.",
        patterns: ["changed", "stopped", "dissent", "documented", "we did not", "shipped without"],
      },
    ],
    followUps: [
      {
        signalId: "conflict-values-raise",
        prompt: "Who did you talk to first, and who did you deliberately not surprise?",
      },
      {
        signalId: "conflict-values-end",
        prompt: "What would have made you leave the project?",
      },
    ],
    outline: [
      "Name the line and the person who would have been hurt.",
      "Raise it with an alternative, to the people who can change it.",
      "Say how it ended, including if you lost and what you did then.",
    ],
  },
  {
    id: "career-yourself",
    track: "hr",
    topic: "career",
    difficulties: ["warmup", "standard"],
    minutes: 4,
    prompt: "Walk me through the work you want me to remember. Two minutes.",
    setup: "This is not a biography. It is a case for the role in front of you.",
    signals: [
      {
        id: "career-yourself-now",
        label: "what you do now, in one line",
        hint: "Role, domain, and the kind of problem. Then stop the résumé.",
        patterns: ["i work", "i build", "currently", "engineer", "my team"],
      },
      {
        id: "career-yourself-proof",
        label: "one proof, with a result",
        hint: "A system, a launch, or a number. One, not five.",
        patterns: ["shipped", "reduced", "built", "led", "percent", "users"],
      },
      {
        id: "career-yourself-why",
        label: "why this conversation",
        hint: "Connect the proof to the work you want next.",
        patterns: ["next", "looking for", "this role", "want to", "because"],
      },
    ],
    followUps: [
      {
        signalId: "career-yourself-proof",
        prompt: "If I called your teammate, what would they say you actually did on that project?",
      },
      {
        signalId: "career-yourself-why",
        prompt: "What kind of work are you trying to do less of?",
      },
    ],
    outline: [
      "One sentence on the present.",
      "One project with a result.",
      "One sentence on why that leads to this role.",
    ],
  },
  {
    id: "career-why-role",
    track: "hr",
    topic: "career",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt: "Why this kind of role, and why now?",
    setup: "Leela has heard ‘I love learning’. She wants a reason that could be false, and is not.",
    signals: [
      {
        id: "career-why-role-work",
        label: "the work itself",
        hint: "Name the problems this role spends its weeks on.",
        patterns: ["users", "system", "product", "problem", "team", "domain"],
      },
      {
        id: "career-why-role-fit",
        label: "why you, specifically",
        hint: "A past project that resembles the work, not a value statement.",
        patterns: ["because i", "last", "similar", "i have", "experience", "built"],
      },
      {
        id: "career-why-role-now",
        label: "why now",
        hint: "A change in your current work, or a skill you have outgrown the room for.",
        patterns: ["now", "ready", "outgrown", "this year", "looking", "change"],
      },
    ],
    followUps: [
      {
        signalId: "career-why-role-fit",
        prompt: "What part of this role have you not done, and how are you honest about that?",
      },
      {
        signalId: "career-why-role-now",
        prompt: "What would make you stay in your current seat another year?",
      },
    ],
    outline: [
      "Name the weekly work of the role.",
      "Match one piece of your past to it.",
      "Say what changed so that this is the moment.",
    ],
  },
  {
    id: "career-leave",
    track: "hr",
    topic: "career",
    difficulties: ["warmup", "standard"],
    minutes: 5,
    prompt: "Why are you leaving your current role?",
    setup: "No contempt for the employer. A real reason. A forward look.",
    signals: [
      {
        id: "career-leave-reason",
        label: "a reason about the work",
        hint: "Scope, domain, or the kind of problem. Not a boss villain.",
        patterns: ["scope", "work", "domain", "growth", "product", "technical"],
      },
      {
        id: "career-leave-fair",
        label: "a fair description of where you are",
        hint: "Something the current place did well, so the story is believable.",
        patterns: ["learned", "grateful", "good", "team", "proud", "stayed"],
      },
      {
        id: "career-leave-next",
        label: "what you want more of",
        hint: "The next sentence is about the work ahead, not the complaint.",
        patterns: ["next", "want", "looking", "more", "this role"],
      },
    ],
    followUps: [
      {
        signalId: "career-leave-reason",
        prompt: "What have you already tried to change in the current role?",
      },
      {
        signalId: "career-leave-fair",
        prompt: "What will you miss?",
      },
    ],
    outline: [
      "Give a work reason, without a villain.",
      "Credit something real about the current place.",
      "Point at the work you want more of.",
    ],
  },
  {
    id: "career-strength",
    track: "hr",
    topic: "career",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt:
      "What is a strength of yours that becomes a problem when you overuse it?",
    setup: "She will not accept ‘I care too much’ unless you show the damage.",
    signals: [
      {
        id: "career-strength-name",
        label: "the strength, named tightly",
        hint: "Clarity, speed, thoroughness, ownership. One.",
        patterns: ["strength", "i tend", "i am good", "thorough", "fast", "ownership", "direct"],
      },
      {
        id: "career-strength-damage",
        label: "the damage when it runs hot",
        hint: "A person who was steamrolled, a delay, a review that became a bottleneck.",
        patterns: ["slowed", "frustrated", "bottleneck", "too much", "teammate", "over"],
      },
      {
        id: "career-strength-guard",
        label: "the guard you use now",
        hint: "A habit that catches the overuse. A question you ask, a person you check.",
        patterns: ["now i", "i ask", "check", "limit", "pause", "delegate"],
      },
    ],
    followUps: [
      {
        signalId: "career-strength-damage",
        prompt: "Tell me about the last time the strength still got away from you.",
      },
      {
        signalId: "career-strength-guard",
        prompt: "Who on your team is allowed to tell you that you are doing it again?",
      },
    ],
    outline: [
      "Name the strength in a few words.",
      "Show a time it cost someone else.",
      "Describe the guard you actually use.",
    ],
  },
  {
    id: "career-horizon",
    track: "hr",
    topic: "career",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt: "Where do you want the work to be in three years, and what are you doing about it this year?",
    setup: "A title is a weak answer. A shape of work is a strong one.",
    signals: [
      {
        id: "career-horizon-shape",
        label: "the shape of the work",
        hint: "Systems, people, a domain. Not ‘staff engineer’ as a sticker.",
        patterns: ["systems", "mentor", "domain", "product", "technical", "scope"],
      },
      {
        id: "career-horizon-year",
        label: "what this year is for",
        hint: "A skill or a kind of project you are already in.",
        patterns: ["this year", "currently", "i am", "learning", "leading", "building"],
      },
      {
        id: "career-horizon-check",
        label: "how you will know you are on the way",
        hint: "A signal that is not a promotion letter.",
        patterns: ["signal", "know", "if i", "measure", "feedback", "owned"],
      },
    ],
    followUps: [
      {
        signalId: "career-horizon-shape",
        prompt: "What title would you refuse if the work underneath it was wrong?",
      },
      {
        signalId: "career-horizon-year",
        prompt: "What are you practicing this quarter that you are still bad at?",
      },
    ],
    outline: [
      "Describe the work, not the title.",
      "Name what this year is already building toward it.",
      "Give a signal you can check without a promotion committee.",
    ],
  },
  {
    id: "career-gap",
    track: "hr",
    topic: "career",
    difficulties: ["standard", "pressure"],
    minutes: 5,
    prompt:
      "What is a skill this role needs that you do not have yet? How are you closing it?",
    setup: "Honesty plus a plan. A claim of no gaps ends the conversation.",
    signals: [
      {
        id: "career-gap-name",
        label: "the gap, named",
        hint: "A real skill. Distributed systems, product sense, people management, a domain.",
        patterns: ["gap", "have not", "not yet", "weak", "less experience", "learning"],
      },
      {
        id: "career-gap-plan",
        label: "what you are already doing",
        hint: "A project, a book is not enough, a person you are learning from, a rep.",
        patterns: ["project", "practic", "course", "mentor", "reading", "building", "asking"],
      },
      {
        id: "career-gap-honest",
        label: "what you will need from the team",
        hint: "Support you are asking for, without handing them the whole job.",
        patterns: ["need", "support", "ramp", "pair", "first months", "help"],
      },
    ],
    followUps: [
      {
        signalId: "career-gap-plan",
        prompt: "What have you done in the last month, not the last year?",
      },
      {
        signalId: "career-gap-honest",
        prompt: "What would you not want this team to assume you can do on day one?",
      },
    ],
    outline: [
      "Name the gap without a cushion.",
      "Say what you have already started.",
      "Say what you will need in the first months, and what you will not pretend.",
    ],
  },
];
