import { Suspense } from "react";
import type { Metadata } from "next";
import { AvatarRoom } from "@/features/avatar/avatar-room";

export const metadata: Metadata = { title: "Avatar interview" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AvatarRoom id={id} />;
}
