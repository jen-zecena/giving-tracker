"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  List,
  Plus,
  Repeat,
  Users,
  Compass,
  User,
  Building2,
  Target,
  Award,
  Settings,
  Heart,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePendingDonations } from "@/components/nav/pending-donations-context";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: Home, label: "Overview", href: "/dashboard" },
  { icon: List, label: "My Donations", href: "/donations" },
  { icon: Plus, label: "Add Donation", href: "/donations/new" },
  { icon: Repeat, label: "Recurring", href: "/donations/recurring" },
  { icon: Users, label: "Feed", href: "/feed" },
  { icon: Compass, label: "Discover", href: "/discover" },
  { icon: User, label: "Profile", href: "/profile" },
  { icon: Building2, label: "Nonprofits", href: "/nonprofits" },
  { icon: Target, label: "Personal Goals", href: "/goals" },
  { icon: Award, label: "Milestones", href: "/badges" },
];

const bottomNavItems = [
  { icon: Home, label: "Overview", href: "/dashboard" },
  { icon: List, label: "Donations", href: "/donations" },
  { icon: Plus, label: "Add", href: "/donations/new" },
  { icon: Users, label: "Feed", href: "/feed" },
  { icon: User, label: "Profile", href: "/profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pendingCount } = usePendingDonations();

  const handleNavigation = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* ── Mobile header ─────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-chart-2 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Giving Tracker
            </h1>
          </div>
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop fixed + mobile drawer) ───────────── */}
      <aside
        className={cn(
          "fixed top-0 h-screen w-[260px] bg-card border-r border-border flex flex-col z-40",
          "lg:left-0",
          isMobileMenuOpen ? "left-0" : "-left-[260px]",
          "transition-[left] duration-300 ease-in-out"
        )}
      >
        {/* Logo — desktop only */}
        <div className="hidden lg:block p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-chart-2 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Giving Tracker
            </h1>
          </div>
        </div>

        {/* Logo — mobile drawer header */}
        <div className="lg:hidden p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-chart-2 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">
                Giving Tracker
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              const showBadge = item.href === "/donations" && pendingCount > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigation}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:bg-muted active:scale-[0.98]"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {showBadge && (
                    <span
                      className={cn(
                        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums font-mono",
                        active
                          ? "bg-primary-foreground text-primary"
                          : "bg-destructive text-destructive-foreground"
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

        {/* Bottom section — Settings */}
        <div className="p-4 border-t border-border">
          <Link
            href="/settings"
            onClick={handleNavigation}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive(pathname, "/settings")
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-muted"
            )}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </div>
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
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      className="absolute -top-1 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold tabular-nums font-mono text-destructive-foreground"
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
