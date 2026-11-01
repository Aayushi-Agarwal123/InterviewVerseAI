"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { CoachMark } from "@/components/shell/coach-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Prepare",
    links: [
      { href: "/", label: "Studio" },
      { href: "/practice", label: "Question interview" },
      { href: "/personalized", label: "Personalized" },
      { href: "/voice", label: "Voice" },
    ],
  },
  {
    label: "Grow",
    links: [
      { href: "/roadmap", label: "Roadmap" },
      { href: "/mentor", label: "Mentor" },
      { href: "/arena", label: "Coding arena" },
      { href: "/jobs", label: "Job match" },
    ],
  },
  {
    label: "Review",
    links: [
      { href: "/progress", label: "Progress" },
      { href: "/memory", label: "Memory" },
    ],
  },
  {
    label: "Build",
    links: [{ href: "/builder", label: "Project builder" }],
  },
];

const BOTTOM = [
  { href: "/", label: "Studio" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/practice") {
    return pathname.startsWith("/practice") || pathname.startsWith("/interview") || pathname.startsWith("/report");
  }
  return pathname.startsWith(href);
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg bg-primary font-heading text-sm text-primary-foreground">
        IV
      </span>
      <span>
        <span className="block font-heading text-lg leading-none tracking-tight">InterviewVerse</span>
        <span className="mt-1 block text-[10px] font-medium tracking-[0.18em] text-copper uppercase">
          Career studio
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[10px] font-medium tracking-[0.18em] text-copper uppercase">{group.label}</p>
          <div className="mt-1 flex flex-col gap-1">
            {group.links.map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    current
                      ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-foreground/10"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="grid grid-cols-4">
      {BOTTOM.map((link) => {
        const current = isCurrent(pathname, link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-16 items-center justify-center px-1 text-center text-[11px] leading-tight",
                current ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
      <li>
        <button
          type="button"
          className="flex h-16 w-full items-center justify-center px-1 text-[11px] text-muted-foreground"
          onClick={onMore}
        >
          More
        </button>
      </li>
    </ul>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="min-h-full">
      <a
        href="#studio-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-full max-w-6xl md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border/80 px-5 py-7 md:flex">
          <Brand />
          <nav className="mt-8 flex-1 overflow-y-auto pr-1" aria-label="Primary">
            <Suspense fallback={null}>
              <NavLinks />
            </Suspense>
          </nav>
          <div className="mt-6 mb-2">
            <CoachMark />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-4 md:hidden">
            <Brand />
            <div className="flex items-center gap-2">
              <CoachMark compact />
              <Button variant="outline" size="icon" aria-label="Open navigation" onClick={() => setMenu(true)}>
                <Menu />
              </Button>
            </div>
          </header>
          <main id="studio-main" className="flex-1 px-5 py-8 pb-28 md:px-10 md:py-10 md:pb-16">
            {children}
          </main>
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <Suspense
          fallback={
            <ul className="grid grid-cols-4" aria-hidden>
              {BOTTOM.map((link) => (
                <li key={link.href} className="flex h-16 items-center justify-center text-[11px] text-muted-foreground">
                  {link.label}
                </li>
              ))}
              <li className="flex h-16 items-center justify-center text-[11px] text-muted-foreground">More</li>
            </ul>
          }
        >
          <BottomNav onMore={() => setMenu(true)} />
        </Suspense>
      </nav>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>InterviewVerse</DialogTitle>
          </DialogHeader>
          <nav aria-label="More">
            <Suspense fallback={null}>
              <NavLinks onNavigate={() => setMenu(false)} />
            </Suspense>
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
