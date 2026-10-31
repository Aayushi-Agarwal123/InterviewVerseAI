import { Button } from "@/components/ui/button";

export function StorageError({
  message,
  onReset,
}: {
  message?: string;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-card px-6 py-8 ring-1 ring-foreground/10">
      <p className="text-xs font-medium tracking-[0.18em] text-copper uppercase">
        Local history
      </p>
      <h1 className="mt-2 text-3xl tracking-tight">
        This browser’s saved rounds could not be opened.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {message ?? "The saved file is unreadable."} Reset clears only this
        browser. Nothing is stored on a server.
      </p>
      <Button className="mt-6 h-10 px-4" onClick={onReset}>
        Reset local history
      </Button>
    </div>
  );
}

export function MissingRound({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-medium tracking-[0.18em] text-copper uppercase">
        Not on this device
      </p>
      <h1 className="mt-2 text-4xl tracking-tight">{title}</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">{body}</p>
    </div>
  );
}
