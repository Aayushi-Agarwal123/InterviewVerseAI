import { Suspense } from "react";
import type { Metadata } from "next";
import { PracticePage } from "@/features/practice/practice-page";

export const metadata: Metadata = {
  title: "Practice",
};

export default function Page() {
  return (
    <Suspense
      fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />}
    >
      <PracticePage />
    </Suspense>
  );
}
