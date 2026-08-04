"use client";

import { useState } from "react";
import { CalendarDays, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: 1,
    title: "Log what you give",
    body: "Amount, organization, cause, and whether it repeats. About fifteen seconds a gift.",
  },
  {
    id: 2,
    title: "Watch it add up",
    body: "Monthly totals, causes, local versus global, and your percentage of income.",
  },
  {
    id: 3,
    title: "Bring friends along",
    body: "Follow people you know. Amounts stay private unless you say otherwise.",
  },
] as const;

/**
 * DS "How it works" walkthrough: sticky step list on the left, a sunken
 * preview panel that swaps per step on the right. The previews are
 * illustrations (aria-hidden, non-interactive), not live forms.
 */
export function StepsWalkthrough() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  return (
    <div className="grid gap-10 lg:gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
      <div className="lg:sticky lg:top-28">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
          How it works
        </span>
        <h2 className="mt-2.5 mb-8 text-3xl lg:text-[44px] leading-[1.08] font-semibold tracking-tight">
          Three habits,
          <br />
          no spreadsheets.
        </h2>
        <div className="grid gap-1">
          {STEPS.map((s) => {
            const on = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                aria-expanded={on}
                className={cn(
                  "grid grid-cols-[auto_1fr] gap-4 rounded-xl p-4 pl-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "bg-card shadow-2xs shadow-xs" : "hover:bg-surface-sunken"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-[30px] w-[30px] items-center justify-center rounded-full font-mono text-[13px] font-semibold",
                    on
                      ? "bg-brand text-white"
                      : "bg-(--sand-200) text-muted-foreground"
                  )}
                >
                  {s.id}
                </span>
                <span>
                  <span className="block text-lg font-semibold text-text-strong tracking-tight">
                    {s.title}
                  </span>
                  {on && (
                    <span className="mt-1.5 block text-sm text-muted-foreground [text-wrap:pretty]">
                      {s.body}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview panel — decorative product illustrations */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none grid min-h-[460px] content-center rounded-2xl bg-surface-sunken p-7 min-w-0"
      >
        {step === 1 && <LogPreview />}
        {step === 2 && <TotalsPreview />}
        {step === 3 && <FriendsPreview />}
      </div>
    </div>
  );
}

/* ── Static previews (illustrative only) ─────────────────── */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-sm font-medium text-text-strong">{label}</div>
      <div className="flex h-9 items-center rounded-lg border border-border-strong bg-card px-3 text-sm text-foreground truncate">
        {value}
      </div>
    </div>
  );
}

function LogPreview() {
  return (
    <div className="grid gap-4 rounded-xl bg-card p-6 shadow-2xs shadow-xs">
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Organization" value="Trees for the Bay" />
        <Field label="Amount" value="$ 120" />
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Date" value="Mar 14, 2026" />
        <Field label="Cause" value="Environment" />
      </div>
      <div className="flex gap-2">
        <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-muted-foreground">
          Local
        </span>
        <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-xs text-info">
          Repeats monthly
        </span>
      </div>
      <div className="flex h-9 items-center justify-center rounded-lg bg-brand text-sm font-medium text-white">
        Save donation
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  tint,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1 rounded-xl p-4", tint)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-mono text-2xl font-semibold text-text-strong">
        {value}
      </div>
      <div className="text-[11px] text-text-faint">{sub}</div>
    </div>
  );
}

function CauseBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-sunken">
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TotalsPreview() {
  return (
    <div className="grid gap-3.5">
      <div className="grid grid-cols-2 gap-3.5">
        <MetricTile
          label="Given this year"
          value="$4,820"
          sub="+12% vs last year"
          tint="bg-metric-green"
          icon={<Heart className="h-4 w-4" />}
        />
        <MetricTile
          label="This month"
          value="$320"
          sub="−8% vs last month"
          tint="bg-metric-clay"
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>
      <div className="grid gap-3 rounded-xl bg-card p-6 shadow-2xs shadow-xs">
        <div>
          <div className="text-lg font-semibold tracking-tight text-text-strong">
            By cause
          </div>
          <div className="text-sm text-muted-foreground">Year to date</div>
        </div>
        <CauseBar label="Environment" value="$1,240" pct={64} color="var(--chart-1)" />
        <CauseBar label="Education" value="$980" pct={51} color="var(--chart-2)" />
        <CauseBar label="Hunger" value="$720" pct={38} color="var(--chart-3)" />
      </div>
    </div>
  );
}

function FriendCard({
  initials,
  name,
  date,
  org,
  amount,
  tags,
  note,
  cheers,
}: {
  initials: string;
  name: string;
  date: string;
  org: string;
  amount?: string;
  tags: string[];
  note?: string;
  cheers: number;
}) {
  return (
    <div className="grid gap-3 rounded-xl bg-card p-5 shadow-2xs shadow-xs">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-green-700">
          {initials}
        </span>
        <div className="flex-1 text-sm">
          <span className="font-semibold text-text-strong">{name}</span>{" "}
          <span className="text-muted-foreground">donated to</span>{" "}
          <span className="font-semibold text-text-strong">{org}</span>
          <div className="font-mono text-xs text-text-faint">{date}</div>
        </div>
        {amount && (
          <span className="font-mono text-[15px] font-semibold text-text-strong">
            {amount}
          </span>
        )}
      </div>
      {note && <p className="m-0 text-sm text-foreground">{note}</p>}
      <div className="flex items-center gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {t}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="text-berry">♥</span>
          <span className="font-mono text-xs">{cheers}</span>
          Cheer
        </span>
      </div>
    </div>
  );
}

function FriendsPreview() {
  return (
    <div className="grid gap-3.5">
      <FriendCard
        initials="MC"
        name="Maya C."
        date="Mar 14, 2026"
        org="Trees for the Bay"
        amount="$120"
        tags={["Environment", "Local"]}
        note="Third year in a row planting with them."
        cheers={4}
      />
      <FriendCard
        initials="DP"
        name="Devon P."
        date="Mar 12, 2026"
        org="Room to Read"
        tags={["Education", "Global"]}
        cheers={2}
      />
    </div>
  );
}
