import type { Metadata } from "next";
import { BuilderPage } from "@/features/builder/builder-page";

export const metadata: Metadata = {
  title: "AI Project Builder",
};

export default function Page() {
  return <BuilderPage />;
}
