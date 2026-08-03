"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Building2,
  Home,
  List,
  Menu,
  Plus,
  Settings,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ProgressRing } from "@/components/progress-ring";
import { usePendingDonations } from "@/components/nav/pending-donations-context";
import { listGoals } from "@/lib/actions/goals";
import { cn } from "@/lib/utils";
import type { Goal, PrivacyTier } from "@/types";
import type { ShellUser } from "@/components/nav/app-shell";

type NavEntry =
  | { section: string }
  | { icon: typeof Home; label: string; href: string };

/**
 * DS sidebar IA (2026-08-02): Discover folded into Feed, Goals into
 * Settings, Recurring into My giving — so none of those get items here.
 * Sections and sentence-case labels come straight from the DS nav.
 */
const menuItems: NavEntry[] = [
  { icon: Home, label: "Overview", href: "/dashboard" },
  { icon: List, label: "My giving", href: "/donations" },
  { icon: Plus, label: "Log a donation", href: "/donations/new" },
  { section: "Community" },
  { icon: Users, label: "Feed", href: "/feed" },
  { icon: Building2, label: "Nonprofits", href: "/nonprofits" },
  { section: "You" },
  { icon: Award, label: "Milestones", href: "/badges" },
  { icon: User, label: "Profile", href: "/profile" },
];

// Admin-only entries. This is a UX gate, not a security boundary — the
// /admin/* route guard and RLS remain the enforcement.
const adminMenuItems: NavEntry[] = [
  { section: "Admin" },
  { icon: Shield, label: "Review queue", href: "/admin/review-queue" },
];

const bottomNavItems = [
  { icon: Home, label: "Overview", href: "/dashboard" },
  { icon: List, label: "My giving", href: "/donations" },
  { icon: Plus, label: "Log", href: "/donations/new" },
  { icon: Users, label: "Feed", href: "/feed" },
  { icon: User, label: "Profile", href: "/profile" },
];

// Sub-routes with their own nav entry — keeps "/donations" from lighting
// up on them. /donations/recurring intentionally lights My giving now.
const DEDICATED_SUBROUTES: Record<string, string[]> = {
  "/donations": ["/donations/new"],
};

const PRIVACY_LABELS: Record<PrivacyTier, string> = {
  private: "Private",
  friends_only: "Friends only",
  open_giver: "Open giver",
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (pathname === href) return true;
  const dedicated = DEDICATED_SUBROUTES[href];
  if (dedicated?.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return false;
  }
  return pathname.startsWith(href + "/");
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function goalRingProps(goal: Goal): {
  pct: number;
  caption: string;
  sub: string;
} {
  const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
  if (goal.type === "amount") {
    const toGo = Math.max(0, goal.target - goal.current);
    return {
      pct,
      caption: `${Math.round(Math.min(100, pct))}%`,
      sub:
        toGo > 0
          ? `$${Math.ceil(toGo).toLocaleString("en-US")} to go`
          : "Goal met",
    };
  }
  return {
    pct,
    caption: `${Math.round(Math.min(100, pct))}%`,
    sub: `${goal.current} of ${goal.target}`,
  };
}

/** DS nav row styling shared by items, Settings, and the mobile drawer. */
function navRowClass(active: boolean) {
  return cn(
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-brand-soft text-green-700 font-semibold"
      : "text-muted-foreground font-medium hover:bg-surface-sunken active:translate-y-px"
  );
}

export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pendingCount } = usePendingDonations();
  const [topGoal, setTopGoal] = useState<Goal | null>(null);

  // Surface the user's most recent goal as the DS mini-ring. Follows the
  // same client-fetch pattern as pendingCount; hides itself when the user
  // has no goals (never fake data).
  useEffect(() => {
    let cancelled = false;
    listGoals().then((result) => {
      if (!cancelled && result.data && result.data.length > 0) {
        setTopGoal(result.data[0]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = user.isAdmin ? [...menuItems, ...adminMenuItems] : menuItems;

  const handleNavigation = () => {
    setIsMobileMenuOpen(false);
  };

  const navList = (
    <nav className="flex-1 overflow-y-auto">
      <div className="grid gap-0.5 content-start">
        {navItems.map((item) => {
          if ("section" in item) {
            return (
              <div
                key={item.section}
                className="mt-3.5 mb-1.5 mx-3 text-xs font-semibold uppercase tracking-[0.06em] text-text-faint"
              >
                {item.section}
              </div>
            );
          }
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const showBadge = item.href === "/donations" && pendingCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavigation}
              className={navRowClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span
                  className={cn(
                    "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5",
                    "font-mono text-xs font-semibold tabular-nums text-white",
                    active ? "bg-brand" : "bg-honey"
                  )}
                  aria-label={`${pendingCount} pending donation${pendingCount === 1 ? "" : "s"}`}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const footer = (
    <div className="grid gap-2.5 pt-3 border-t border-border">
      {topGoal &&
        (() => {
          const ring = goalRingProps(topGoal);
          return (
            <Link
              href="/goals"
              onClick={handleNavigation}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-brand-soft hover:bg-brand-soft-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${topGoal.title}: ${ring.sub}`}
            >
              <ProgressRing
                value={ring.pct}
                caption={ring.caption}
                size={44}
                thickness={5}
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-green-700 truncate">
                  {topGoal.title}
                </span>
                <span className="block text-[11px] text-green-700/75 font-mono">
                  {ring.sub}
                </span>
              </span>
            </Link>
          );
        })()}
      <Link
        href="/settings"
        onClick={handleNavigation}
        className={navRowClass(isActive(pathname, "/settings"))}
      >
        <Settings className="w-[18px] h-[18px]" />
        <span>Settings</span>
      </Link>
      <Link
        href="/profile"
        onClick={handleNavigation}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-8">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback className="bg-brand-soft text-green-700 text-xs font-semibold">
            {initialsOf(user.displayName)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-text-strong truncate">
            {user.displayName}
          </span>
          <span className="block text-xs text-text-faint">
            {PRIVACY_LABELS[user.privacyTier]}
          </span>
        </span>
      </Link>
    </div>
  );

  return (
    <>
      {/* ── Mobile header ─────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Logo size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>

      {/* ── Mobile overlay ────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "color-mix(in srgb, var(--ink-900) 42%, transparent)" }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop fixed + mobile drawer) ───────────── */}
      <aside
        className={cn(
          "fixed top-0 h-screen w-[260px] bg-sidebar border-r border-border z-40",
          "flex flex-col gap-4 p-4",
          "lg:left-0",
          isMobileMenuOpen ? "left-0" : "-left-[260px]",
          "transition-[left] duration-300 ease-in-out"
        )}
      >
        <div className="flex items-center justify-between px-1.5 pt-1.5">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {navList}
        {footer}
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border">
        <div className="grid grid-cols-5 gap-1 p-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const showBadge = item.href === "/donations" && pendingCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "text-green-700"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-sunken"
                )}
                aria-label={
                  showBadge
                    ? `${item.label} (${pendingCount} pending)`
                    : item.label
                }
                aria-current={active ? "page" : undefined}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "w-6 h-6",
                      active ? "stroke-[2.5]" : "stroke-2"
                    )}
                  />
                  {showBadge && (
                    <span
                      className="absolute -top-1 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-honey px-1 text-[10px] font-semibold tabular-nums font-mono text-white"
                      aria-hidden="true"
                    >
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    active ? "font-semibold" : "font-normal"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
