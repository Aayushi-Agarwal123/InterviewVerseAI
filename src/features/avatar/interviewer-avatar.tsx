import type { AvatarVisualState } from "@/lib/avatar/provider";

const COPY: Record<AvatarVisualState, string> = {
  idle: "Idle",
  speaking: "Speaking",
  listening: "Listening",
  thinking: "Thinking",
};

export function InterviewerAvatar({
  who,
  state,
}: {
  who: "arun" | "leela";
  state: AvatarVisualState;
}) {
  const name = who === "arun" ? "Arun Mehta" : "Leela Kapoor";
  const role = who === "arun" ? "Technical interviewer" : "HR interviewer";
  return (
    <figure className={`avatar-${state} relative mx-auto w-full max-w-md`} data-state={state}>
      <div className="avatar-ring pointer-events-none absolute inset-8 rounded-full border border-primary-foreground/30" />
      <svg viewBox="0 0 320 400" role="img" aria-label={`${name}, ${COPY[state].toLowerCase()}`} className="relative w-full">
        <title>{name}</title>
        <rect width="320" height="400" rx="28" fill={who === "arun" ? "#1f3d32" : "#243f38"} />
        <ellipse cx="160" cy="168" rx="78" ry="92" fill={who === "arun" ? "#c48a62" : "#e0b08a"} />
        {who === "arun" ? (
          <path d="M82 150c8-70 148-78 160-8 4 28-8 36-18 28-18-16-104-18-124 0-8 8-22 2-18-20z" fill="#1c1915" />
        ) : (
          <path d="M78 168c6-92 164-96 176-6-8 18-22 8-28-6-16-28-96-30-118-4-10 12-24 18-30 16z" fill="#2a211c" />
        )}
        <ellipse cx="128" cy="168" rx="8" ry="6" fill="#1c1915" />
        <ellipse cx="192" cy="168" rx="8" ry="6" fill="#1c1915" />
        <path className="avatar-lid" d="M112 160h32M176 160h32" stroke={who === "arun" ? "#c48a62" : "#e0b08a"} strokeWidth="10" />
        {who === "arun" ? <path d="M118 206c18 16 66 16 84 0" fill="#8d5a42" /> : null}
        <ellipse className="avatar-mouth" cx="160" cy="228" rx="18" ry="8" fill="#6b3a3a" />
        <path d="M48 318c28-48 196-48 224 0v82H48z" fill={who === "arun" ? "#143028" : "#f3efe4"} />
        <path d="M136 300h48l10 36h-68z" fill={who === "arun" ? "#efe7d6" : "#1f3d32"} />
      </svg>
      <figcaption className="absolute right-4 bottom-4 left-4 rounded-2xl bg-background/90 px-4 py-3 text-foreground shadow-card">
        <p className="font-heading text-2xl tracking-tight">{name}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
        <p className="mt-1 text-[11px] font-semibold tracking-[0.16em] text-sage uppercase">{COPY[state]}</p>
      </figcaption>
    </figure>
  );
}
