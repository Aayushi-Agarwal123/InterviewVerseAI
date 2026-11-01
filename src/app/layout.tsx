import type { Metadata } from "next";
import { Figtree, Newsreader } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { SessionProvider } from "@/components/shell/session-provider";
import "./globals.css";

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: {
    default: "InterviewVerse AI",
    template: "%s · InterviewVerse AI",
  },
  description:
    "Practice question, personalized, and voice interviews, then track scores, a roadmap, and coding work in this browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
