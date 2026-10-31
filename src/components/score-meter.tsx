import { bandLabel, scoreBand, type ScoreBand } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const FILL: Record<ScoreBand, string> = {
  strong: "bg-score-strong",
  solid: "bg-score-solid",
  developing: "bg-score-developing",
  thin: "bg-score-thin",
};

export function ScoreMeter({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail?: string;
}) {
  const band = scoreBand(score);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {score}
          <span className="mx-1.5 text-border">/</span>
          {bandLabel(band)}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${score}`}
      >
        <div
          className={cn("h-full rounded-full", FILL[band])}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      {detail ? (
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

export function ScoreFigure({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <span className={cn("font-heading text-5xl tabular-nums leading-none", {
      "text-score-strong": band === "strong",
      "text-score-solid": band === "solid",
      "text-score-developing": band === "developing",
      "text-score-thin": band === "thin",
    })}>
      {score}
    </span>
  );
}
