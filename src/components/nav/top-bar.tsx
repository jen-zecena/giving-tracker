"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsDropdown } from "@/components/nav/notifications-dropdown";
import { signOut } from "@/lib/actions/auth";
import type { ShellUser } from "@/components/nav/app-shell";

/**
 * Breadcrumb titles by route prefix; longest prefix wins. Discover and
 * Goals keep entries although they left the sidebar (IA decision
 * 2026-08-02) — the pages still exist and deserve a correct crumb.
 */
const ROUTE_TITLES: [prefix: string, title: string][] = [
  ["/dashboard", "Overview"],
  ["/donations/new", "Log a donation"],
  ["/donations/recurring", "Recurring"],
  ["/donations", "My giving"],
  ["/feed", "Feed"],
  ["/discover", "Find people"],
  ["/nonprofits", "Nonprofits"],
  ["/badges", "Milestones"],
  ["/goals", "Goals"],
  ["/profile", "Profile"],
  ["/settings", "Settings"],
  ["/admin/review-queue", "Review queue"],
];

function titleFor(pathname: string): string {
  let best: string | null = null;
  let bestLen = -1;
  for (const [prefix, title] of ROUTE_TITLES) {
    if (
      (pathname === prefix || pathname.startsWith(prefix + "/")) &&
      prefix.length > bestLen
    ) {
      best = title;
      bestLen = prefix.length;
    }
  }
  return best ?? "Overview";
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * Sticky app top bar (DS app shell): breadcrumb trail, notifications, and
 * the account menu on a blurred sand surface. Desktop only — the mobile
 * fixed header in the sidebar covers small screens. The DS's global search
 * box is intentionally omitted until a real search backend exists.
 */
export function TopBar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <header
      className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-4 px-8 border-b border-border"
      style={{
        background: "color-mix(in srgb, var(--sand-50) 88%, transparent)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Giving Tracker</span>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="font-semibold text-text-strong">
          {titleFor(pathname)}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationsDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Account menu"
          >
            <Avatar className="size-8">
              {user.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt="" />
              )}
              <AvatarFallback className="bg-brand-soft text-green-700 text-xs font-semibold">
                {initialsOf(user.displayName)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem render={<Link href="/profile" />}>
              <User className="w-4 h-4" />
              Your profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => startTransition(() => signOut())}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
