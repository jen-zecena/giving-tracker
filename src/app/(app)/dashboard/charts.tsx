"use client";

import { useState } from "react";
import { format, parse, subMonths } from "date-fns";
import { Flame } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MonthlyTotal, ScopeBreakdown } from "@/types";

/*
 * DS charts (ui_kits/giving-tracker-app/Charts.jsx): plain SVG/CSS in the
 * warm palette — a bar chart, a donut, and a consistency grid — replacing
 * the Recharts area/pie. Numbers are always IBM Plex Mono.
 */

// ── Shared helpers ────────────────────────────────────────

/** Last `n` calendar months as YYYY-MM, oldest first, zero-filled. */
function monthWindow(data: MonthlyTotal[], n: number): MonthlyTotal[] {
  const byMonth = new Map(data.map((d) => [d.month, d.total]));
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const month = format(subMonths(now, n - 1 - i), "yyyy-MM");
    return { month, total: byMonth.get(month) ?? 0 };
  });
}

function monthLabel(month: string): string {
  return format(parse(month, "yyyy-MM", new Date()), "MMM");
}

function compactAmount(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `${Math.round(v)}`;
}

// ── Monthly bar chart ─────────────────────────────────────

export function MonthlyChart({ data }: { data: MonthlyTotal[] }) {
  const [range, setRange] = useState<"6m" | "12m">("12m");
  const shown = monthWindow(data, range === "6m" ? 6 : 12);
  const max = Math.max(1, ...shown.map((d) => d.total));
  const total = shown.reduce((s, d) => s + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly giving</CardTitle>
        <CardDescription>
          {shown.length} months ·{" "}
          <span className="font-mono">${total.toLocaleString("en-US")}</span>{" "}
          total
        </CardDescription>
        <CardAction>
          <div
            className="inline-flex rounded-lg bg-surface-sunken p-0.5"
            role="tablist"
            aria-label="Chart range"
          >
            {(["6m", "12m"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  range === r
                    ? "bg-card text-text-strong shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2.5 h-[196px]">
          {shown.map((d, i) => {
            const last = i === shown.length - 1;
            return (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center gap-2 min-w-0"
              >
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    last
                      ? "text-text-strong font-semibold"
                      : "text-text-faint"
                  )}
                >
                  {compactAmount(d.total)}
                </span>
                <div
                  title={`$${d.total.toLocaleString("en-US")}`}
                  className="w-full rounded-t-md rounded-b-sm"
                  style={{
                    height: Math.max(2, (d.total / max) * 140),
                    background: last ? "var(--brand)" : "var(--green-300)",
                    transition: "height var(--dur-slow) var(--ease-out)",
                  }}
                />
                <span className="font-mono text-[11px] text-text-faint">
                  {monthLabel(d.month)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Scope donut ───────────────────────────────────────────

const SCOPE_LABELS: Record<string, string> = {
  local: "Local",
  national: "National",
  global: "Global",
};

const SCOPE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function ScopeDonut({ data }: { data: ScopeBreakdown[] }) {
  const segments = data.filter((d) => d.total > 0);
  if (segments.length === 0) return null;

  const total = segments.reduce((s, d) => s + d.total, 0);
  const local = data.find((d) => d.scope === "local");
  const localPct = local ? Math.round((local.total / total) * 100) : 0;
  const lead = local?.total
    ? { pct: localPct, label: "stayed local" }
    : {
        pct: Math.round((segments[0].total / total) * 100),
        label: SCOPE_LABELS[segments[0].scope]?.toLowerCase() ?? segments[0].scope,
      };

  const r = 58;
  const c = 2 * Math.PI * r;
  // Precompute each segment's arc length and start offset (no mutation
  // during render).
  const arcs = segments.map((s) => (s.total / total) * c);
  const offsets = arcs.map((_, i) =>
    arcs.slice(0, i).reduce((sum, len) => sum + len, 0)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where it goes</CardTitle>
        <CardDescription>Local · national · global</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative w-[148px] h-[148px] shrink-0">
          <svg width="148" height="148" viewBox="0 0 148 148" aria-hidden="true">
            <g transform="rotate(-90 74 74)">
              {segments.map((s, i) => (
                <circle
                  key={s.scope}
                  cx="74"
                  cy="74"
                  r={r}
                  fill="none"
                  stroke={SCOPE_COLORS[i % SCOPE_COLORS.length]}
                  strokeWidth="18"
                  strokeDasharray={`${Math.max(0, arcs[i] - 3)} ${c - arcs[i] + 3}`}
                  strokeDashoffset={-offsets[i]}
                />
              ))}
            </g>
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-mono text-[22px] font-semibold text-text-strong">
                {lead.pct}%
              </div>
              <div className="text-[11px] text-text-faint">{lead.label}</div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 flex-1 min-w-0">
          {segments.map((s, i) => (
            <div key={s.scope} className="flex items-center gap-2.5 text-sm">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: SCOPE_COLORS[i % SCOPE_COLORS.length] }}
              />
              <span className="flex-1 text-foreground">
                {SCOPE_LABELS[s.scope] ?? s.scope}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round((s.total / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Consistency grid ──────────────────────────────────────

function cellShade(v: number, max: number): string {
  if (v === 0) return "var(--sand-200)";
  const t = v / max;
  if (t < 0.3) return "var(--green-100)";
  if (t < 0.55) return "var(--green-300)";
  if (t < 0.8) return "var(--green-500)";
  return "var(--brand)";
}

export function GivingGrid({
  data,
  streakMonths,
}: {
  data: MonthlyTotal[];
  streakMonths: number;
}) {
  const months = monthWindow(data, 12);
  const max = Math.max(1, ...months.map((d) => d.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistency</CardTitle>
        <CardDescription>Every month you gave, at a glance</CardDescription>
        {streakMonths > 0 && (
          <CardAction>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-green-700">
              <Flame className="w-3 h-3" aria-hidden="true" />
              {streakMonths}-month streak
            </span>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-1.5">
          {months.map((d) => (
            <div
              key={d.month}
              className="grid gap-1.5 justify-items-center"
              title={`${monthLabel(d.month)}: $${d.total.toLocaleString("en-US")}`}
            >
              <div
                className="w-full aspect-square rounded-md"
                style={{ background: cellShade(d.total, max) }}
              />
              <span className="font-mono text-[10px] text-text-faint">
                {monthLabel(d.month)[0]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
