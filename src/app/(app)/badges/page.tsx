import { redirect } from "next/navigation";

import { PageHeader } from "@/components/nav/page-header";
import { ProgressRing } from "@/components/progress-ring";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { getBadges, type Badge } from "@/lib/queries/badges";

import { BadgesBoard } from "./badges-board";
import { formatProgress, isInProgress } from "./badges-utils";

type StatCounts = {
  earned: number;
  inProgress: number;
  locked: number;
};

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const badges = await getBadges();
  const earnedBadges = badges.filter((b) => b.earned);
  const inProgressBadges = badges.filter(isInProgress);
  const counts: StatCounts = {
    earned: earnedBadges.length,
    inProgress: inProgressBadges.length,
    locked: badges.length - earnedBadges.length - inProgressBadges.length,
  };

  // "Closest to unlocking" = the in-progress milestone with the highest
  // completion ratio.
  const next = inProgressBadges.reduce<Badge | null>((best, b) => {
    const ratio = (b.progress ?? 0) / (b.target || 1);
    const bestRatio = best ? (best.progress ?? 0) / (best.target || 1) : -1;
    return ratio > bestRatio ? b : best;
  }, null);

  return (
    <>
      <PageHeader
        title="Milestones"
        subtitle={`${counts.earned} of ${badges.length} earned`}
      />

      <div className="space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
        <MilestonesHero next={next} counts={counts} />
        <BadgesBoard badges={badges} />
      </div>
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────

function MilestonesHero({
  next,
  counts,
}: {
  next: Badge | null;
  counts: StatCounts;
}) {
  // No milestone underway — collapse the hero to just the stat row.
  if (!next || next.target === undefined) {
    return (
      <Card className="p-8">
        <StatRow counts={counts} />
      </Card>
    );
  }

  const pct = Math.min(
    100,
    Math.round(((next.progress ?? 0) / next.target) * 100)
  );
  const progressLabel = `${formatProgress(next.progress ?? 0, next.id)} / ${formatProgress(next.target, next.id)}`;

  return (
    <Card className="grid items-center gap-6 p-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
      <div className="grid min-w-0 gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-faint">
            Closest to unlocking
          </span>
          <h2 className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight">
            {next.name}
          </h2>
          <p className="mt-1.5 text-base text-muted-foreground">
            {next.description}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Progress</span>
            <span className="font-mono text-xs text-muted-foreground">
              {progressLabel}
            </span>
          </div>
          <Progress
            value={pct}
            aria-label={`${pct}% toward ${next.name}`}
            className="[&_[data-slot=progress-track]]:h-2.5"
          />
        </div>

        <StatRow counts={counts} />
      </div>

      <ProgressRing
        value={pct}
        caption={formatProgress(next.progress ?? 0, next.id)}
        sublabel={`of ${formatProgress(next.target, next.id)}`}
        size={150}
        className="justify-self-center md:justify-self-end"
      />
    </Card>
  );
}

function StatRow({ counts }: { counts: StatCounts }) {
  const stats: [label: string, value: number][] = [
    ["Earned", counts.earned],
    ["In progress", counts.inProgress],
    ["Locked", counts.locked],
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {stats.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-semibold text-text-strong">
            {value}
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
