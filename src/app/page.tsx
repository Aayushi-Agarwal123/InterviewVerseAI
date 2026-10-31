import type { Metadata } from "next";
import { StudioPage } from "@/features/studio/studio-page";

export const metadata: Metadata = {
  title: "Studio",
};

export default function HomePage() {
  return <StudioPage />;
}
