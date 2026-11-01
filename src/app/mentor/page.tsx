import type { Metadata } from "next";
import { MentorPage } from "@/features/mentor/mentor-page";

export const metadata: Metadata = { title: "Mentor" };

export default function Page() {
  return <MentorPage />;
}
