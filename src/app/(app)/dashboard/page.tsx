import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Clock, Heart, List, Plus } from "lucide-react";

import { InsightsCard } from "@/components/insights-card";
import { ProgressRing } from "@/components/progress-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WelcomeChecklist } from "@/components/welcome-checklist";

import { getDashboardData } from "@/lib/queries/dashboard";
import { getChecklistStatus } from "@/lib/queries/welcome-checklist";
import { createClient } from "@/lib/supabase/server";
import type {
  CauseBreakdown,
  DashboardSummary,
  Donation,
  MoMComparison,
} from "@/types";

import { GivingGrid, MonthlyChart, ScopeDonut } from "./charts";

// ── Constants ─────────────────────────────────────────────

const CAUSE_LABELS: Record<string, string> = {
  education: "Education",
  health: "Health",
  environment: "Environment",
  poverty: "Poverty",
  animal_welfare: "Animal welfare",
  arts_culture: "Arts & culture",
  disaster_relief: "Disaster relief",
  human_rights: "Human rights",
  community: "Community",
  religious: "Religious",
  uncategorized: "Uncategorized",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ── Page ──────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const [data, checklistStatus, { data: auth }] = await Promise.all([
    getDashboardData(),
    getChecklistStatus(),
    supabase.auth.getUser(),
  ]);

  let firstName: string | null = null;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", auth.user.id)
      .single();
    firstName = profile?.display_name?.split(/\s+/)[0] ?? null;
  }

  const isEmpty = data.summary.ytd_count === 0 && data.recent.length === 0;

  return (
    <div>
      <HeroBand summary={data.summary} firstName={firstName} />

      <div className="px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <WelcomeChecklist status={checklistStatus} />

        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {data.summary.pending_count > 0 && (
              <PendingDonationsAlert count={data.summary.pending_count} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
              {/* Main column */}
              <div className="space-y-6 min-w-0">
                <MonthlyChart data={data.monthly} />
                <GivingGrid
                  data={data.monthly}
                  streakMonths={data.summary.streak_current}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ScopeDonut data={data.scope} />
                  <CauseBreakdownCard
                    data={data.cause}
                    ytdTotal={data.summary.ytd_total}
                  />
                </div>
              </div>

              {/* Side rail */}
              <div className="space-y-6 min-w-0">
                <InsightsCard />
                <QuickStatsCard
                  mom={data.mom}
                  earnedBadges={data.summary.earned_badges_count}
                  totalBadges={data.summary.total_badges_count}
                />
                <RecentActivityCard donations={data.recent} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Hero band ─────────────────────────────────────────────

function HeroBand({
  summary,
  firstName,
}: {
  summary: DashboardSummary;
  firstName: string | null;
}) {
  const now = new Date();
  const pct = summary.salary_percentage;
  const target = summary.salary_milestone_target ?? 1;
  const goalLine =
    pct !== null
      ? pct >= target
        ? "You've closed the ring this year."
        : `You're at ${pct.toFixed(2)}% of your ${target}% goal.`
      : "Here's how your giving is going.";

  return (
    <div
      className="px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-6"
      style={{
        background:
          "linear-gradient(180deg, var(--green-50), var(--sand-50) 88%)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-faint">
            {format(now, "EEEE, MMMM d · yyyy")}
          </span>
          <h1 className="mt-2 text-2xl lg:text-[34px] font-semibold tracking-tight leading-tight">
            {greetingFor(now.getHours())}
            {firstName ? `, ${firstName}.` : "."}
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">{goalLine}</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" render={<Link href="/donations" />}>
            <List className="w-[18px] h-[18px]" />
            History
          </Button>
          <Button render={<Link href="/donations/new" />}>
            <Plus className="w-[18px] h-[18px]" />
            Log a donation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 items-stretch">
        <TotalCard summary={summary} />
        <GoalRingCard summary={summary} />
      </div>
    </div>
  );
}

function TotalCard({ summary }: { summary: DashboardSummary }) {
  const streakSub =
    summary.streak_current > 0 &&
    summary.streak_current >= summary.streak_longest
      ? "Personal best"
      : "months in a row";

  const stats: [label: string, value: string, sub: string][] = [
    ["Organizations", String(summary.organizations_count), "this year"],
    ["This month", formatCurrency(summary.this_month_total), "so far"],
    ["Streak", `${summary.streak_current} mo`, streakSub],
  ];

  return (
    <Card className="grid content-center gap-5">
      <CardContent>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-faint">
          Given this year
        </span>
        <div className="mt-2 font-mono text-5xl lg:text-[56px] font-semibold tracking-[-0.04em] leading-none text-text-strong">
          {formatCurrency(summary.ytd_total)}
        </div>
      </CardContent>
      <CardContent>
        <div className="grid grid-cols-3">
          {stats.map(([label, value, sub], i) => (
            <div
              key={label}
              className={i > 0 ? "px-5 border-l border-border" : "pr-5"}
            >
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-text-strong">
                {value}
              </div>
              <div className="text-[11px] text-text-faint">{sub}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GoalRingCard({ summary }: { summary: DashboardSummary }) {
  const pct = summary.salary_percentage;
  const target = summary.salary_milestone_target ?? 1;

  return (
    <Card className="bg-brand-soft ring-brand/15 grid content-center justify-items-center text-center gap-4">
      <CardContent className="grid justify-items-center gap-4">
        {pct !== null ? (
          <>
            <ProgressRing
              value={(pct / target) * 100}
              caption={`${pct.toFixed(2)}%`}
              sublabel={`of your ${target}% goal`}
              size={148}
            />
            <p className="text-sm text-green-900 max-w-[260px]">
              {pct >= target
                ? "The ring is closed — every gift from here is a bonus."
                : "Keep logging gifts to close the ring this year."}
            </p>
            <Button
              variant="secondary"
              size="sm"
              render={<Link href="/badges" />}
            >
              See milestones
            </Button>
          </>
        ) : (
          <>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-green-700/80">
              Your 1% goal
            </span>
            <p className="text-sm text-green-900 max-w-[280px]">
              Add your income to see the share you give. It&apos;s encrypted
              before it&apos;s saved and never shown to anyone.
            </p>
            <Button
              variant="secondary"
              size="sm"
              render={<Link href="/goals" />}
            >
              Set up your goal
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Pending donations alert ───────────────────────────────

function PendingDonationsAlert({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-md bg-card text-warning shrink-0">
          <Clock className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-text-strong">
            {count} recurring gift{count === 1 ? " is" : "s are"} waiting for
            you
          </p>
          <p className="text-sm text-muted-foreground">
            Recurring donations wait for your confirmation before they count
            toward your totals.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        render={<Link href="/donations#pending" />}
        className="shrink-0"
      >
        Review
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

// ── Cause breakdown ───────────────────────────────────────

function CauseBreakdownCard({
  data,
  ytdTotal,
}: {
  data: CauseBreakdown[];
  ytdTotal: number;
}) {
  const top6 = data.slice(0, 6);
  if (top6.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>By cause</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {top6.map((cause) => {
          const pct = ytdTotal > 0 ? (cause.total / ytdTotal) * 100 : 0;
          return (
            <div key={cause.cause_tag} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {CAUSE_LABELS[cause.cause_tag] ?? cause.cause_tag}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatCurrency(cause.total)}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Quick stats ───────────────────────────────────────────

function QuickStatsCard({
  mom,
  earnedBadges,
  totalBadges,
}: {
  mom: MoMComparison;
  earnedBadges: number;
  totalBadges: number;
}) {
  const change = mom.percentage_change;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">This month</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-text-strong">
            {formatCurrency(mom.current_month_total)}
          </p>
          <p className="text-[11px] text-text-faint font-mono">
            {change !== null
              ? `${change > 0 ? "+" : ""}${Math.round(change)}% vs last month`
              : "No data last month"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last month</p>
          <p className="mt-1 font-mono text-lg font-semibold text-text-strong">
            {formatCurrency(mom.previous_month_total)}
          </p>
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-3.5 text-sm">
          <span className="text-muted-foreground">Milestones earned</span>
          <span className="ml-auto font-mono font-semibold text-text-strong">
            {earnedBadges}
            <span className="text-muted-foreground font-normal">
              /{totalBadges}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Recent activity ───────────────────────────────────────

function RecentActivityCard({ donations }: { donations: Donation[] }) {
  if (donations.length === 0) return null;

  return (
    <Card className="gap-0 pb-2">
      <CardHeader className="pb-2">
        <CardTitle>Recent activity</CardTitle>
        <div className="col-start-2 row-start-1 justify-self-end">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/donations" />}
            className="text-xs"
          >
            View all
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <div>
        {donations.map((d, i) => (
          <div
            key={d.id}
            className={`flex items-center gap-3.5 px-6 py-3.5 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <span className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-md bg-brand-soft text-brand">
              <Heart className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-strong truncate">
                {d.organization_name}
              </p>
              <p className="font-mono text-xs text-text-faint">
                {format(new Date(d.donation_date + "T00:00:00"), "MMM d, yyyy")}
              </p>
            </div>
            <span className="font-mono text-[15px] font-semibold text-text-strong tabular-nums shrink-0">
              {formatCurrency(Number(d.amount))}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-border-strong bg-transparent">
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-soft text-brand mb-4">
          <Heart className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="text-xl font-semibold text-text-strong mb-2">
          Start your giving record
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Log your first donation to see trends, streaks, and the causes you
          care about take shape here.
        </p>
        <Button render={<Link href="/donations/new" />} size="lg">
          Log your first donation
        </Button>
      </div>
    </div>
  );
}
