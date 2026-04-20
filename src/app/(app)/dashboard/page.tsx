import Link from "next/link";
import { format } from "date-fns";
import {
  Award,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";

import { InsightsCard } from "@/components/insights-card";
import { PageHeader } from "@/components/nav/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WelcomeChecklist } from "@/components/welcome-checklist";

import { getDashboardData } from "@/lib/queries/dashboard";
import { getChecklistStatus } from "@/lib/queries/welcome-checklist";
import type { CauseBreakdown, Donation, MoMComparison } from "@/types";

import { MetricCards } from "./metric-cards";
import { MonthlyChart, ScopeChart } from "./charts";

// ── Constants ─────────────────────────────────────────────

const CAUSE_LABELS: Record<string, string> = {
  education: "Education",
  health: "Health",
  environment: "Environment",
  poverty: "Poverty",
  animal_welfare: "Animal Welfare",
  arts_culture: "Arts & Culture",
  disaster_relief: "Disaster Relief",
  human_rights: "Human Rights",
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

// ── Page ──────────────────────────────────────────────────

export default async function DashboardPage() {
  const [data, checklistStatus] = await Promise.all([
    getDashboardData(),
    getChecklistStatus(),
  ]);
  const isEmpty = data.summary.ytd_count === 0 && data.recent.length === 0;

  return (
    <>
      <PageHeader title="Overview" subtitle="Your giving dashboard" />

      <div className="p-4 sm:p-6 lg:p-8">
        {isEmpty ? (
          <div className="space-y-6">
            <WelcomeChecklist status={checklistStatus} />
            <EmptyState />
          </div>
        ) : (
          <div className="space-y-6">
            <WelcomeChecklist status={checklistStatus} />

            {/* Metric Cards */}
            <MetricCards
              ytdTotal={data.summary.ytd_total}
              organizationsCount={data.summary.organizations_count}
              thisMonthTotal={data.summary.this_month_total}
              streakMonths={data.summary.streak_current}
            />

            {/* Charts + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Charts */}
              <div className="lg:col-span-2 space-y-6">
                <MonthlyChart data={data.monthly} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ScopeChart data={data.scope} />
                  <CauseBreakdownCard
                    data={data.cause}
                    ytdTotal={data.summary.ytd_total}
                  />
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                <InsightsCard />
                <MoMCard
                  mom={data.mom}
                  earnedBadges={data.summary.earned_badges_count}
                  totalBadges={data.summary.total_badges_count}
                />
                <RecentActivityCard donations={data.recent} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Cause Breakdown ───────────────────────────────────────

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
        <CardTitle className="text-base font-medium">By Cause</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {top6.map((cause, i) => {
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
              <Progress
                value={pct}
                className="h-2"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── MoM Comparison ────────────────────────────────────────

function MoMCard({
  mom,
  earnedBadges,
  totalBadges,
}: {
  mom: MoMComparison;
  earnedBadges: number;
  totalBadges: number;
}) {
  const trend =
    mom.percentage_change === null
      ? "neutral"
      : mom.percentage_change > 0
        ? "up"
        : mom.percentage_change < 0
          ? "down"
          : "neutral";

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="text-base font-medium">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">This month</p>
          <p className="text-2xl font-semibold font-mono tracking-tight">
            {formatCurrency(mom.current_month_total)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trend === "up" && (
            <TrendingUp className="h-4 w-4 text-success" />
          )}
          {trend === "down" && (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          {trend === "neutral" && (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {mom.percentage_change !== null
              ? `${mom.percentage_change > 0 ? "+" : ""}${Math.round(mom.percentage_change)}% vs last month`
              : "No data last month"}
          </span>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last month</p>
          <p className="text-lg font-medium font-mono">
            {formatCurrency(mom.previous_month_total)}
          </p>
        </div>
        <div className="flex items-center gap-2 border-t border-primary/10 pt-3">
          <Award className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm text-muted-foreground">Badges earned</span>
          <span className="ml-auto text-sm font-mono font-medium text-foreground">
            {earnedBadges}
            <span className="text-muted-foreground">/{totalBadges}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Recent Activity ───────────────────────────────────────

function RecentActivityCard({ donations }: { donations: Donation[] }) {
  if (donations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/donations" />}
          className="text-xs"
        >
          View all
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {donations.map((d) => (
          <div key={d.id} className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
              <Heart className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {d.organization_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(d.donation_date + "T00:00:00"), "MMM d, yyyy")}
              </p>
            </div>
            <span className="text-sm font-mono font-medium text-foreground shrink-0">
              {formatCurrency(Number(d.amount))}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Empty State ───────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Welcome to your giving dashboard
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Start tracking your charitable giving to see insights, trends, and the
          impact of your generosity over time.
        </p>
        <Button render={<Link href="/donations/new" />} size="lg">
          Log your first donation
        </Button>
      </CardContent>
    </Card>
  );
}
