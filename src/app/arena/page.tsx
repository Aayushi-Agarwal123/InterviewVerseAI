import type { Metadata } from "next";
import { ArenaPage } from "@/features/arena/arena-page";

export const metadata: Metadata = { title: "Coding arena" };

export default function Page() {
  return <ArenaPage />;
}
