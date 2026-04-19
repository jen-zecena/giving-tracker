"use client";

import CountUp from "react-countup";
import {
  DollarSign,
  Building2,
  CalendarDays,
  Flame,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  icon: React.ReactNode;
  bgClass: string;
}

function MetricCard({ label, value, prefix, icon, bgClass }: MetricCardProps) {
  return (
    <Card className={`${bgClass} border-0`}>
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div className="rounded-lg bg-card/60 p-2.5">{icon}</div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xl sm:text-2xl font-semibold text-foreground font-mono tracking-tight">
            {prefix}
            <CountUp end={value} duration={1.2} separator="," decimals={prefix === "$" ? 0 : 0} />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardsProps {
  ytdTotal: number;
  organizationsCount: number;
  thisMonthTotal: number;
  streakMonths: number;
}

export function MetricCards({
  ytdTotal,
  organizationsCount,
  thisMonthTotal,
  streakMonths,
}: MetricCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Donated"
        value={ytdTotal}
        prefix="$"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        bgClass="bg-metric-purple"
      />
      <MetricCard
        label="Organizations"
        value={organizationsCount}
        icon={<Building2 className="h-5 w-5 text-info" />}
        bgClass="bg-metric-blue"
      />
      <MetricCard
        label="This Month"
        value={thisMonthTotal}
        prefix="$"
        icon={<CalendarDays className="h-5 w-5 text-success" />}
        bgClass="bg-metric-green"
      />
      <MetricCard
        label="Giving Streak"
        value={streakMonths}
        icon={<Flame className="h-5 w-5 text-warning" />}
        bgClass="bg-metric-yellow"
      />
    </div>
  );
}
