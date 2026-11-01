"use client";

import { Suspense, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Code2,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  Library,
  Map,
  Menu,
  MessageCircle,
  MessagesSquare,
  Mic,
  MoreHorizontal,
  Sparkles,
  Video,
} from "lucide-react";
import { CoachMark } from "@/components/shell/coach-mark";
import { useCareer } from "@/components/shell/career-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const GROUPS: { label: string; links: { href: string; label: string; icon: Icon }[] }[] = [
  {
    label: "Prepare",
    links: [
      { href: "/", label: "Studio", icon: LayoutDashboard },
      { href: "/practice", label: "Question interview", icon: MessagesSquare },
      { href: "/personalized", label: "Personalized", icon: Sparkles },
      { href: "/avatar", label: "AI avatar interview", icon: Video },
      { href: "/voice", label: "Voice", icon: Mic },
    ],
  },
  {
    label: "Grow",
    links: [
      { href: "/roadmap", label: "Roadmap", icon: Map },
      { href: "/mentor", label: "Mentor", icon: MessageCircle },
      { href: "/arena", label: "Coding arena", icon: Code2 },
      { href: "/jobs", label: "Job match", icon: Briefcase },
    ],
  },
  {
    label: "Review",
    links: [
      { href: "/progress", label: "Progress", icon: LineChart },
      { href: "/memory", label: "Memory", icon: Library },
    ],
  },
  {
    label: "Build",
    links: [{ href: "/builder", label: "Project builder", icon: FolderKanban }],
  },
];

const BOTTOM = [
  { href: "/", label: "Studio", icon: LayoutDashboard },
  { href: "/practice", label: "Practice", icon: MessagesSquare },
  { href: "/progress", label: "Progress", icon: LineChart },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/practice") {
    return pathname.startsWith("/practice") || pathname.startsWith("/interview") || pathname.startsWith("/report");
  }
  return pathname.startsWith(href);
}

function pageMeta(pathname: string): { kicker: string; title: string } {
  if (pathname.startsWith("/interview")) return { kicker: "Prepare", title: "Live round" };
  if (pathname.startsWith("/avatar/")) return { kicker: "Prepare", title: "Avatar interview" };
  if (pathname.startsWith("/report")) return { kicker: "Review", title: "Debrief" };
  for (const group of GROUPS) {
    const link = group.links.find((item) => isCurrent(pathname, item.href));
    if (link) return { kicker: group.label, title: link.label };
  }
  return { kicker: "InterviewVerse", title: "Studio" };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "IV";
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary font-heading text-sm text-primary-foreground shadow-card">
        IV
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="block truncate font-heading text-lg leading-none tracking-tight">InterviewVerse</span>
          <span className="mt-1 block text-[10px] font-semibold tracking-[0.18em] text-sage uppercase">
            Career studio
          </span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[10px] font-semibold tracking-[0.18em] text-sage uppercase">{group.label}</p>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {group.links.map((link) => {
              const current = isCurrent(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                    current
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const career = useCareer();
  const meta = pageMeta(pathname);
  const profile = career.data.profile;
  const name = profile?.name?.trim() || "Guest";
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/80 bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation" onClick={onMenu}>
          <Menu />
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-sage uppercase">{meta.kicker}</p>
          <p className="truncate font-heading text-xl leading-tight tracking-tight md:text-2xl">{meta.title}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden sm:block">
          <CoachMark compact />
        </div>
        <Button className="hidden h-9 sm:inline-flex" nativeButton={false} render={<Link href="/practice" />}>
          Start a round
        </Button>
        <Link
          href={profile ? "/memory" : "/personalized"}
          className="flex items-center gap-2 rounded-full bg-card py-1 pr-3 pl-1 shadow-card ring-1 ring-foreground/8"
        >
          <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initials(name)}
          </span>
          <span className="hidden max-w-32 truncate text-sm font-medium md:block">{name}</span>
        </Link>
      </div>
    </header>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="grid grid-cols-4">
      {BOTTOM.map((link) => {
        const current = isCurrent(pathname, link.href);
        const Icon = link.icon;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[11px]",
                current ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {link.label}
            </Link>
          </li>
        );
      })}
      <li>
        <button
          type="button"
          className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
          onClick={onMore}
        >
          <MoreHorizontal className="size-4" aria-hidden />
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
      <div className="mx-auto grid min-h-dvh max-w-[1440px] md:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border/80 bg-sidebar px-4 py-5 md:flex">
          <Brand />
          <nav className="nav-scroll mt-7 min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Primary">
            <Suspense fallback={null}>
              <NavLinks />
            </Suspense>
          </nav>
          <div className="mt-4 rounded-2xl bg-card/80 px-3 py-3 shadow-card ring-1 ring-foreground/8">
            <CoachMark />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <Suspense
            fallback={
              <header className="flex items-center justify-between border-b border-border/80 px-4 py-3 md:px-8">
                <Brand compact />
              </header>
            }
          >
            <TopBar onMenu={() => setMenu(true)} />
          </Suspense>
          <main id="studio-main" className="flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-12">
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
