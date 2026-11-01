import type { Metadata } from "next";
import { PersonalizedPage } from "@/features/personalized/personalized-page";

export const metadata: Metadata = { title: "Personalized interview" };

export default function Page() {
  return <PersonalizedPage />;
}
