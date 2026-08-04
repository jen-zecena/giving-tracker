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
import type { Badge as BadgeData } from "@/lib/queries/badges";

import {
  filterBadges,
  formatEarnedDate,
  formatProgress,
  isInProgress,
  type CategoryFilter,
  type TabValue,
} from "./badges-utils";

// Re-exported for tests (tests/badges-board.test.ts) and prior callers.
export { filterBadges, isInProgress };

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "milestone", label: "Milestones" },
  { value: "consistency", label: "Consistency" },
  { value: "cause", label: "Causes" },
  { value: "impact", label: "Impact" },
];

export function BadgesBoard({ badges }: { badges: BadgeData[] }) {
  // DS default: show the full board first (Screens.jsx Milestones()).
  const [tab, setTab] = useState<TabValue>("all");
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
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as TabValue)}
      className="w-full gap-4"
    >
      {/* Controls row: category pills left, status tabs right */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter milestones by category"
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
                  "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px",
                  active
                    ? "border-brand bg-brand-soft text-green-700"
                    : "border-border-strong bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <TabsList className="max-sm:grid max-sm:w-full max-sm:grid-cols-3">
          <TabsTrigger value="earned">
            Earned
            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
              {counts.earned}
            </span>
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In progress
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
      </div>

      <TabsContent value={tab}>
        <BadgeGrid badges={filtered} tab={tab} />
      </TabsContent>
    </Tabs>
  );
}

function BadgeGrid({ badges, tab }: { badges: BadgeData[]; tab: TabValue }) {
  if (badges.length === 0) {
    return (
      <EmptyState
        icon={tab === "earned" ? Award : Lock}
        title={
          tab === "earned"
            ? "No milestones earned yet"
            : tab === "in-progress"
              ? "Nothing in progress"
              : "No milestones match this filter"
        }
        description={
          tab === "earned"
            ? "Log donations to start unlocking milestones."
            : tab === "in-progress"
              ? "Start making progress toward a milestone to see it here."
              : "Pick a different category to see more milestones."
        }
        className="border-2 border-dashed border-border-strong bg-transparent shadow-none ring-0"
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

  return (
    <Card
      className={cn(
        "gap-3 p-6",
        badge.earned && "bg-success-soft ring-brand/25",
        locked && "bg-surface-sunken opacity-85"
      )}
      data-state={badge.earned ? "earned" : inProgress ? "in-progress" : "locked"}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl",
            badge.earned
              ? "bg-brand-soft-hover"
              : inProgress
                ? "bg-info-soft"
                : "bg-border"
          )}
          aria-hidden="true"
        >
          <span className={locked ? "grayscale" : undefined}>{badge.icon}</span>
        </span>
        {badge.earned ? (
          <Badge variant="secondary">Earned</Badge>
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
            locked ? "text-muted-foreground" : "text-text-strong"
          )}
        >
          {badge.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{badge.description}</p>
      </div>

      {badge.earned && badge.earnedDate && (
        <p className="font-mono text-xs text-text-faint">
          Earned {formatEarnedDate(badge.earnedDate)}
        </p>
      )}

      {!badge.earned && badge.target !== undefined && (
        <div className="space-y-1.5">
          <Progress
            value={progressPct}
            aria-label={`${progressPct}% progress toward ${badge.name}`}
            className={cn(
              "[&_[data-slot=progress-track]]:h-1.5",
              inProgress && "[&_[data-slot=progress-indicator]]:bg-info"
            )}
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
