import type { Question, Topic } from "@/lib/domain";
import { QUESTIONS } from "@/lib/questions";

const SKILLS: { name: string; aliases: string[]; topic: Topic }[] = [
  { name: "JavaScript", aliases: ["javascript", "js"], topic: "frontend" },
  { name: "TypeScript", aliases: ["typescript", "ts"], topic: "frontend" },
  { name: "React", aliases: ["react"], topic: "frontend" },
  { name: "Next.js", aliases: ["next.js", "nextjs"], topic: "frontend" },
  { name: "CSS", aliases: ["css", "tailwind"], topic: "frontend" },
  { name: "Node.js", aliases: ["node.js", "nodejs", "node"], topic: "backend" },
  { name: "Express", aliases: ["express"], topic: "backend" },
  { name: "MongoDB", aliases: ["mongodb", "mongo"], topic: "backend" },
  { name: "SQL", aliases: ["sql", "postgres", "mysql"], topic: "backend" },
  { name: "Python", aliases: ["python"], topic: "backend" },
  { name: "Java", aliases: ["java"], topic: "backend" },
  { name: "APIs", aliases: ["api", "rest", "graphql"], topic: "backend" },
  { name: "System design", aliases: ["system design", "distributed", "scalability"], topic: "system-design" },
  { name: "Data structures", aliases: ["data structures", "algorithms", "dsa"], topic: "dsa" },
  { name: "Testing", aliases: ["testing", "jest", "unit test"], topic: "backend" },
  { name: "Docker", aliases: ["docker", "kubernetes"], topic: "system-design" },
  { name: "Communication", aliases: ["communication", "stakeholder"], topic: "behavioral" },
  { name: "Leadership", aliases: ["leadership", "mentoring"], topic: "leadership" },
];

export type SkillMatch = {
  required: string[];
  matching: string[];
  missing: string[];
  gapPercent: number;
  topics: Topic[];
  questions: { id: string; prompt: string; topic: Topic }[];
  note: string;
};

function normalizeSkill(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchJob(description: string, skills: string[]): SkillMatch {
  const haystack = description.toLowerCase();
  const required = SKILLS.filter((skill) => skill.aliases.some((alias) => haystack.includes(alias))).map(
    (skill) => skill.name,
  );
  const entered = skills.map(normalizeSkill).filter((skill) => skill.length >= 2);
  const matching = required.filter((name) => {
    const skill = SKILLS.find((item) => item.name === name);
    return skill?.aliases.some((alias) => entered.some((item) => item.includes(alias) || alias.includes(item)));
  });
  const missing = required.filter((name) => !matching.includes(name));
  const gapPercent = required.length === 0 ? 0 : Math.round((missing.length / required.length) * 100);
  const topics = [
    ...new Set(
      missing
        .map((name) => SKILLS.find((skill) => skill.name === name)?.topic)
        .filter((topic): topic is Topic => Boolean(topic)),
    ),
  ];
  const questions = QUESTIONS.filter((question) => topics.includes(question.topic))
    .slice(0, 4)
    .map((question: Question) => ({ id: question.id, prompt: question.prompt, topic: question.topic }));
  const note =
    required.length === 0
      ? "No listed skill was recognized in that description. Name the tools it asks for, then compare again."
      : "Compared on this device from the description you pasted and the skills you typed. This is not a resume review.";
  return { required, matching, missing, gapPercent, topics, questions, note };
}
