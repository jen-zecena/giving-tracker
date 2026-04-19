"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parse } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyTotal, ScopeBreakdown } from "@/types";

// ── Monthly Area Chart ───────────────────────────────────

const CHART_COLORS = {
  area: "var(--chart-1)",
  areaFill: "var(--chart-1)",
  grid: "var(--border)",
  text: "var(--muted-foreground)",
};

function formatMonthLabel(month: string): string {
  const date = parse(month, "yyyy-MM", new Date());
  return format(date, "MMM");
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

export function MonthlyChart({ data }: { data: MonthlyTotal[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Monthly Donations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.areaFill} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART_COLORS.areaFill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_COLORS.grid}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Donated"]}
                labelFormatter={(label) => formatMonthLabel(String(label))}
                contentStyle={{
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: "0.875rem",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={CHART_COLORS.area}
                strokeWidth={2}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Scope Donut Chart ────────────────────────────────────

const SCOPE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
];

const SCOPE_LABELS: Record<string, string> = {
  local: "Local",
  national: "National",
  global: "Global",
};

export function ScopeChart({ data }: { data: ScopeBreakdown[] }) {
  const hasData = data.some((d) => d.total > 0);
  if (!hasData) return null;

  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">By Scope</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter((d) => d.total > 0)}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="total"
                nameKey="scope"
              >
                {data
                  .filter((d) => d.total > 0)
                  .map((_, i) => (
                    <Cell key={i} fill={SCOPE_COLORS[i % SCOPE_COLORS.length]} />
                  ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                contentStyle={{
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: "0.875rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          {data
            .filter((d) => d.total > 0)
            .map((d, i) => (
              <div key={d.scope} className="flex items-center gap-1.5 text-sm">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: SCOPE_COLORS[i % SCOPE_COLORS.length] }}
                />
                <span className="text-muted-foreground">
                  {SCOPE_LABELS[d.scope] ?? d.scope}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {grandTotal > 0
                    ? `${Math.round((d.total / grandTotal) * 100)}%`
                    : "0%"}
                </span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
