"use client";

import { useMemo, useState } from "react";
import { Award, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Badge as BadgeData, BadgeCategory } from "@/lib/queries/badges";

type TabValue = "earned" | "in-progress" | "all";
type CategoryFilter = "all" | BadgeCategory;

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "milestone", label: "Milestones" },
  { value: "consistency", label: "Consistency" },
  { value: "cause", label: "Causes" },
  { value: "impact", label: "Impact" },
];

export function isInProgress(badge: BadgeData): boolean {
  if (badge.earned) return false;
  if (badge.target === undefined) return false;
  return (badge.progress ?? 0) > 0;
}

export function filterBadges(
  badges: BadgeData[],
  tab: TabValue,
  category: CategoryFilter
): BadgeData[] {
  return badges.filter((b) => {
    if (category !== "all" && b.category !== category) return false;
    if (tab === "earned") return b.earned;
    if (tab === "in-progress") return isInProgress(b);
    return true;
  });
}

function formatEarnedDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BadgesBoard({ badges }: { badges: BadgeData[] }) {
  const [tab, setTab] = useState<TabValue>("earned");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(
    () => filterBadges(badges, tab, category),
    [badges, tab, category]
  );

  const counts = useMemo(() => {
    const byScope = (pred: (b: BadgeData) => boolean) =>
      badges.filter(
        (b) => (category === "all" || b.category === category) && pred(b)
      ).length;
    return {
      earned: byScope((b) => b.earned),
      inProgress: byScope(isInProgress),
      all: badges.filter(
        (b) => category === "all" || b.category === category
      ).length,
    };
  }, [badges, category]);

  return (
    <div className="space-y-4">
      {/* Category pills */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter badges by category"
      >
        {CATEGORY_OPTIONS.map((opt) => {
          const active = category === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCategory(opt.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground/70 hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-none sm:inline-flex">
          <TabsTrigger value="earned">
            Earned
            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
              {counts.earned}
            </span>
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress
            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
              {counts.inProgress}
            </span>
          </TabsTrigger>
          <TabsTrigger value="all">
            All
            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
              {counts.all}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <BadgeGrid badges={filtered} tab={tab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BadgeGrid({ badges, tab }: { badges: BadgeData[]; tab: TabValue }) {
  if (badges.length === 0) {
    return (
      <EmptyState
        icon={tab === "earned" ? Award : Lock}
        title={
          tab === "earned"
            ? "No badges earned yet"
            : tab === "in-progress"
              ? "Nothing in progress"
              : "No badges match this filter"
        }
        description={
          tab === "earned"
            ? "Log donations to start unlocking badges."
            : tab === "in-progress"
              ? "Start making progress toward a milestone to see it here."
              : "Pick a different category to see more badges."
        }
      />
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="badges-grid"
    >
      {badges.map((b) => (
        <BadgeCard key={b.id} badge={b} />
      ))}
    </div>
  );
}

function BadgeCard({ badge }: { badge: BadgeData }) {
  const inProgress = isInProgress(badge);
  const locked = !badge.earned && !inProgress;
  const progressPct =
    badge.target && badge.target > 0
      ? Math.min(100, Math.round(((badge.progress ?? 0) / badge.target) * 100))
      : 0;

  const stateClasses = badge.earned
    ? "border-success/40 bg-success/10"
    : inProgress
      ? "border-chart-1/40 bg-chart-1/5"
      : "border-border bg-muted/30 opacity-70";

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-3 p-5 transition-colors",
        stateClasses
      )}
      data-state={badge.earned ? "earned" : inProgress ? "in-progress" : "locked"}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl",
            badge.earned
              ? "bg-success/20"
              : inProgress
                ? "bg-chart-1/10"
                : "bg-muted"
          )}
          aria-hidden="true"
        >
          <span className={locked ? "grayscale" : undefined}>{badge.icon}</span>
        </div>
        {badge.earned ? (
          <Badge
            variant="secondary"
            className="bg-success/20 text-success border-success/30"
          >
            Earned
          </Badge>
        ) : locked ? (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Locked
          </Badge>
        ) : null}
      </div>

      <div className="min-w-0">
        <h3
          className={cn(
            "text-base font-semibold",
            locked ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {badge.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{badge.description}</p>
      </div>

      {badge.earned && badge.earnedDate && (
        <p className="font-mono text-xs text-muted-foreground">
          Earned {formatEarnedDate(badge.earnedDate)}
        </p>
      )}

      {!badge.earned && badge.target !== undefined && (
        <div className="space-y-1">
          <Progress
            value={progressPct}
            aria-label={`${progressPct}% progress toward ${badge.name}`}
            className="h-1.5"
          />
          <p className="flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>
              {formatProgress(badge.progress ?? 0, badge.id)} /{" "}
              {formatProgress(badge.target, badge.id)}
            </span>
            <span>{progressPct}%</span>
          </p>
        </div>
      )}
    </Card>
  );
}

function formatProgress(n: number, badgeId: string): string {
  // Salary-percentage badges (*-percent-club) express progress as a %.
  if (badgeId.endsWith("-percent-club")) {
    return `${n.toFixed(1)}%`;
  }
  return n.toLocaleString("en-US");
}
