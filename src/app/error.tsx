"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-medium tracking-[0.18em] text-copper uppercase">
        Interrupted
      </p>
      <h1 className="mt-2 text-4xl tracking-tight">The studio hit a snag.</h1>
      <p className="mt-3 text-muted-foreground">
        The round data on this page did not render. Try again. Your other saved rounds are still in this browser.
      </p>
      <Button className="mt-6 h-10" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
