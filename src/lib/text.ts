export function textHas(text: string, pattern: string): boolean {
  const needle = pattern.toLowerCase().trim();
  if (!needle) return false;
  const hay = text.toLowerCase();
  const escaped = needle
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(hay);
}

export function textHasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => textHas(text, pattern));
}

export function wordCount(text: string): number {
  const words = text.trim().match(/[a-z0-9][a-z0-9'+-]*/gi);
  return words?.length ?? 0;
}

export function sentencesOf(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => wordCount(part) > 0);
}

const STOP = new Set(
  `a an the and or but if then else when while to of in on for with from by as at into over after before about than too very just your you we they i me my our their is are was were be been being it this that these those do does did doing have has had having not no nor so such only own same can will should could would may might must what which who whom how why where there here also across per via using use used within without than given assume walk through approach ship explain describe tell question answer interview wouldn shouldn couldn dont doesn isn aren`
    .split(/\s+/),
);

export function keywordsFrom(text: string): string[] {
  const found = text.toLowerCase().match(/[a-z][a-z0-9'+-]{3,}/g) ?? [];
  const unique: string[] = [];
  for (const word of found) {
    if (STOP.has(word) || unique.includes(word)) continue;
    unique.push(word);
  }
  return unique.slice(0, 16);
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
