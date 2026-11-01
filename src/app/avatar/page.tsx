import type { Metadata } from "next";
import { AvatarLobby } from "@/features/avatar/avatar-lobby";

export const metadata: Metadata = { title: "AI avatar interview" };

export default function Page() {
  return <AvatarLobby />;
}
