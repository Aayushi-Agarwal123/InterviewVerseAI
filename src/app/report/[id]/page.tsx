import { Suspense } from "react";
import type { Metadata } from "next";
import { RoomSkeleton } from "@/features/interview/room-skeleton";
import { ReportPage } from "@/features/report/report-page";

export const metadata: Metadata = {
  title: "Debrief",
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
  return <ReportPage id={id} />;
}
