import { Suspense } from "react";
import type { Metadata } from "next";
import { InterviewRoom } from "@/features/interview/interview-room";
import { RoomSkeleton } from "@/features/interview/room-skeleton";

export const metadata: Metadata = {
  title: "Round",
};

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InterviewRoom id={id} />;
}
