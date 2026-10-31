"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Studio" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/practice") {
    return (
      pathname.startsWith("/practice") ||
      pathname.startsWith("/interview") ||
      pathname.startsWith("/report")
    );
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
        <span className="block font-heading text-lg leading-none tracking-tight">
          InterviewVerse
        </span>
        <span className="mt-1 block text-[10px] font-medium tracking-[0.18em] text-copper uppercase">
          AI studio
        </span>
      </span>
    </Link>
  );
}

function PrimaryNav({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();
  if (variant === "bottom") {
    return (
      <ul className="grid grid-cols-3">
        {LINKS.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center justify-center text-sm",
                  current ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <nav className="mt-10 flex flex-col gap-1" aria-label="Primary">
      {LINKS.map((link) => {
        const current = isCurrent(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
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
    </nav>
  );
}

function SideNavFallback() {
  return (
    <nav className="mt-10 flex flex-col gap-1" aria-hidden>
      {LINKS.map((link) => (
        <span key={link.href} className="rounded-lg px-3 py-2 text-sm text-muted-foreground">
          {link.label}
        </span>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <a
        href="#studio-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-full max-w-6xl md:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border/80 px-6 py-7 md:flex">
          <Brand />
          <Suspense fallback={<SideNavFallback />}>
            <PrimaryNav variant="side" />
          </Suspense>
          <p className="mt-auto mb-6 text-xs leading-5 text-muted-foreground">
            Rubric coach, on this device. Rounds stay in this browser.
          </p>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="flex items-center border-b border-border/80 px-5 py-4 md:hidden">
            <Brand />
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
            <ul className="grid grid-cols-3" aria-hidden>
              {LINKS.map((link) => (
                <li
                  key={link.href}
                  className="flex h-14 items-center justify-center text-sm text-muted-foreground"
                >
                  {link.label}
                </li>
              ))}
            </ul>
          }
        >
          <PrimaryNav variant="bottom" />
        </Suspense>
      </nav>
    </div>
  );
}
