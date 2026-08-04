"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const LINKS = [
  { label: "Why 1%", href: "#why" },
  { label: "How it works", href: "#how" },
  { label: "Privacy", href: "#privacy" },
  { label: "Pricing", href: "#pricing" },
];

/**
 * DS marketing floating island nav: a pill that sits over the hero and
 * solidifies (stronger blur/shadow) once the page scrolls.
 */
export function IslandNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-40 flex justify-center px-5 py-4 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-full py-2 pl-4 pr-2"
        style={{
          background: solid
            ? "rgba(255,255,255,0.88)"
            : "rgba(255,255,255,0.6)",
          backdropFilter: "blur(14px)",
          boxShadow: solid
            ? "var(--shadow-hairline), var(--shadow-md)"
            : "var(--shadow-hairline)",
          transition:
            "box-shadow var(--dur-base) var(--ease-standard), background-color var(--dur-base) var(--ease-standard)",
        }}
      >
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo size="sm" />
        </Link>
        <span className="mx-2.5 h-[22px] w-px bg-border hidden md:block" aria-hidden />
        <nav className="hidden md:flex gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <span className="mx-2.5 h-[22px] w-px bg-border hidden md:block" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/login" />}
          className="hidden sm:inline-flex"
        >
          Sign in
        </Button>
        <Button size="sm" render={<Link href="/register" />}>
          Start free
        </Button>
      </div>
    </div>
  );
}
