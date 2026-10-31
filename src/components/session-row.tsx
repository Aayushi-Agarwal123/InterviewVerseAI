import Link from "next/link";
import {
  difficultyLabel,
  personaFor,
  scoreBand,
  topicById,
} from "@/lib/catalog";
import type { Session } from "@/lib/domain";
import { formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SessionRow({ session }: { session: Session }) {
  const topic = topicById(session.config.topic);
  const persona = personaFor(session.config.track);
  const href =
    session.status === "active"
      ? `/interview/${session.id}`
      : `/report/${session.id}`;
  const score = session.report?.overall;
  const band = score === undefined ? undefined : scoreBand(score);

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-card"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{topic.label}</span>
          {session.sample ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium tracking-wide text-secondary-foreground uppercase">
              Sample
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">
          {persona.name} · {difficultyLabel(session.config.difficulty)} ·{" "}
          {formatWhen(session.updatedAt)}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 font-heading text-2xl tabular-nums",
          session.status === "active" && "font-sans text-sm font-medium text-copper",
          band === "strong" && "text-score-strong",
          band === "solid" && "text-score-solid",
          band === "developing" && "text-score-developing",
          band === "thin" && "text-score-thin",
        )}
      >
        {session.status === "active" ? "Open" : score}
      </span>
    </Link>
  );
}
