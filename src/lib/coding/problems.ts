export type CodingLevel = "easy" | "medium" | "hard";

export type CodingCase = {
  args: unknown[];
  expected: unknown;
};

export type CodingProblem = {
  id: string;
  title: string;
  level: CodingLevel;
  topic: string;
  prompt: string;
  signature: string;
  starter: string;
  cases: CodingCase[];
};

export const PROBLEMS: CodingProblem[] = [
  {
    id: "seat-pair",
    title: "Two seats that fill the row",
    level: "easy",
    topic: "Arrays",
    prompt:
      "A row of seat numbers is given as an array of integers. Return the indices of two different seats whose numbers add up to target. Return an empty array when no pair exists. Do not use the same index twice.",
    signature: "function solve(seats, target)",
    starter: "function solve(seats, target) {\n  \n}\n",
    cases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[1], 2], expected: [] },
    ],
  },
  {
    id: "badge-stack",
    title: "Badge scanner",
    level: "easy",
    topic: "Stacks",
    prompt:
      "A door scanner reads a string of badges. Round badges use (), square badges use [], and curly badges use {}. Return true only when every badge closes in the right order.",
    signature: "function solve(badges)",
    starter: "function solve(badges) {\n  \n}\n",
    cases: [
      { args: ["()[]{}"], expected: true },
      { args: ["([)]"], expected: false },
      { args: ["("], expected: false },
    ],
  },
  {
    id: "slot-overlap",
    title: "Overlapping interview slots",
    level: "medium",
    topic: "Intervals",
    prompt:
      "Each interview slot is [start, end) in minutes. Return how many slots overlap with at least one other slot. Touching at an endpoint does not overlap.",
    signature: "function solve(slots)",
    starter: "function solve(slots) {\n  \n}\n",
    cases: [
      { args: [[[0, 30], [5, 10], [15, 20]]], expected: 3 },
      { args: [[[0, 10], [10, 20]]], expected: 0 },
      { args: [[[1, 4]]], expected: 0 },
    ],
  },
  {
    id: "unique-window",
    title: "Longest stretch without a repeat",
    level: "medium",
    topic: "Windows",
    prompt:
      "A proctor log is a string. Return the length of the longest contiguous stretch that contains no repeated character.",
    signature: "function solve(log)",
    starter: "function solve(log) {\n  \n}\n",
    cases: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbb"], expected: 1 },
      { args: [""], expected: 0 },
    ],
  },
  {
    id: "course-order",
    title: "Course unlock order",
    level: "hard",
    topic: "Graphs",
    prompt:
      "There are n courses, numbered from 0. prerequisites is a list of [course, required] pairs, meaning required must be taken first. Return any valid order, or an empty array if the requirements loop.",
    signature: "function solve(n, prerequisites)",
    starter: "function solve(n, prerequisites) {\n  \n}\n",
    cases: [
      { args: [2, [[1, 0]]], expected: [0, 1] },
      { args: [2, [[1, 0], [0, 1]]], expected: [] },
    ],
  },
  {
    id: "merge-slots",
    title: "Merge the panel's calendar",
    level: "hard",
    topic: "Intervals",
    prompt:
      "Merge overlapping interview slots. Each slot is [start, end). Return the merged slots sorted by start. Slots that only touch at an endpoint stay separate.",
    signature: "function solve(slots)",
    starter: "function solve(slots) {\n  \n}\n",
    cases: [
      {
        args: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]],
      },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 4], [4, 5]] },
    ],
  },
];

export function problemById(id: string): CodingProblem | undefined {
  return PROBLEMS.find((problem) => problem.id === id);
}
