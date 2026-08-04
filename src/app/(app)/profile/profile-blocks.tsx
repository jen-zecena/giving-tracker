import type { ReactNode } from "react";
import { Globe, Heart, Repeat, Shield, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PrivacyTier } from "@/types";

/**
 * Shared presentation blocks for the profile pages (/profile and
 * /profile/[userId]), styled per the earth-tone design system's
 * Profile screen: gradient cover band, overlapping avatar identity
 * row, 320px side column, DonationRow-style activity list.
 */

// ── Copy maps + formatters ───────────────────────────────────

export const CAUSE_LABELS: Record<string, string> = {
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
};

export const SCOPE_LABELS: Record<string, string> = {
  local: "Local",
  national: "National",
  global: "Global",
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function firstInitial(
  name: string | null,
  fallback = "?"
): string {
  const source = name?.trim() || fallback;
  return source.charAt(0).toUpperCase() || "?";
}

// ── Privacy tier badge (sentence-case labels + DS glyphs) ────

const TIER_BADGE: Record<
  PrivacyTier,
  { label: string; icon: typeof Shield }
> = {
  private: { label: "Private", icon: Shield },
  friends_only: { label: "Friends only", icon: Users },
  open_giver: { label: "Open giver", icon: Globe },
};

export function tierLabel(tier: PrivacyTier): string {
  return TIER_BADGE[tier].label;
}

export function TierBadge({ tier }: { tier: PrivacyTier }) {
  const { label, icon: Icon } = TIER_BADGE[tier];
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

// ── Cover band + identity row ────────────────────────────────

/**
 * 150px cover band. The green→blue wash is one of the two gradients
 * the DS explicitly allows.
 */
export function ProfileCover({ children }: { children?: ReactNode }) {
  return (
    <div
      className="relative h-[150px]"
      style={{
        background:
          "linear-gradient(120deg, var(--green-600), var(--blue-600))",
      }}
    >
      {children}
    </div>
  );
}

export function ProfileAvatar({
  src,
  initial,
}: {
  src?: string | null;
  initial: string;
}) {
  return (
    <Avatar
      className="-mt-[46px] size-24 shrink-0 ring-[5px] ring-background after:hidden"
      aria-hidden="true"
    >
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className="bg-[var(--green-500)] font-sans text-[38px] font-semibold text-primary-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

export function ProfileIdentity({
  avatarUrl,
  initial,
  name,
  tier,
  meta,
  actions,
}: {
  avatarUrl?: string | null;
  initial: string;
  name: string;
  tier: PrivacyTier;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
      <div className="flex min-w-0 items-start gap-4 sm:gap-[18px]">
        <ProfileAvatar src={avatarUrl} initial={initial} />
        <div className="min-w-0 pt-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 truncate text-2xl leading-tight font-semibold tracking-tight sm:text-[30px]">
              {name}
            </h1>
            <TierBadge tier={tier} />
          </div>
          {meta ? (
            <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="pt-4">{actions}</div> : null}
    </div>
  );
}

// ── Small text pieces ────────────────────────────────────────

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-faint">
      {children}
    </span>
  );
}

/** DS privacy rule: hidden amounts are italic muted text, never blurred. */
export function AmountPrivate({ className }: { className?: string }) {
  return (
    <span className={cn("italic text-muted-foreground", className)}>
      Amount private
    </span>
  );
}

export function StatBlock({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-xl font-semibold tracking-tight text-text-strong tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// ── Side-column cards ────────────────────────────────────────

export function BioCard({
  bio,
  bioFallback,
  stats,
}: {
  bio: string | null;
  bioFallback: string;
  stats: { label: string; value: number }[];
}) {
  const text = bio?.trim();
  return (
    <Card className="gap-3.5 py-5">
      <div className="px-5">
        <p
          className={cn(
            "text-sm [text-wrap:pretty]",
            text ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {text || bioFallback}
        </p>
      </div>
      <div className="border-t border-border px-5 pt-3.5">
        <div className="flex gap-6">
          {stats.map((s) => (
            <StatBlock
              key={s.label}
              label={s.label}
              value={s.value.toLocaleString("en-US")}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function GivingSummaryCard({
  total,
  donationCount,
  organizationCount,
}: {
  total: ReactNode;
  donationCount: number;
  organizationCount: number;
}) {
  return (
    <Card className="gap-4 py-5">
      <div className="px-5">
        <Eyebrow>Total donated</Eyebrow>
        <div className="mt-1.5 font-mono text-[28px] leading-tight font-semibold tracking-tight text-text-strong tabular-nums">
          {total}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-border px-5 pt-4">
        <StatBlock
          label="Donations"
          value={donationCount.toLocaleString("en-US")}
        />
        <StatBlock
          label="Organizations"
          value={organizationCount.toLocaleString("en-US")}
        />
      </div>
    </Card>
  );
}

// ── Activity list (DS DonationRow pattern) ───────────────────

export type DonationListItem = {
  id: string;
  organization_name: string;
  amount: number;
  donation_date: string;
  cause_tag: string | null;
  scope: string;
  is_recurring: boolean;
};

export function DonationListCard({
  title,
  description,
  donations,
  showAmounts,
}: {
  title: string;
  description: string;
  donations: DonationListItem[];
  showAmounts: boolean;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-strong">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ul className="divide-y divide-border">
        {donations.map((d) => (
          <li key={d.id} className="flex items-center gap-3.5 px-5 py-3.5">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"
              aria-hidden="true"
            >
              <Heart className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-text-strong">
                  {d.organization_name}
                </span>
                {d.is_recurring && (
                  <Badge variant="outline" className="shrink-0 gap-1 font-normal">
                    <Repeat aria-hidden="true" />
                    Recurring
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-text-faint">
                  {formatDate(d.donation_date)}
                </span>
                {d.cause_tag && (
                  <Badge variant="outline" className="font-normal">
                    {CAUSE_LABELS[d.cause_tag] ?? d.cause_tag}
                  </Badge>
                )}
                <Badge variant="secondary" className="font-normal">
                  {SCOPE_LABELS[d.scope] ?? d.scope}
                </Badge>
              </div>
            </div>
            {showAmounts ? (
              <span className="font-mono text-sm font-semibold text-text-strong tabular-nums">
                {formatCurrency(d.amount)}
              </span>
            ) : (
              <AmountPrivate className="shrink-0 text-xs" />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Underline tabs styling (applied to ui/tabs primitives) ───

/** TabsList override: full-width underline rail instead of the pill. */
export const UNDERLINE_TABS_LIST_CLASS =
  "w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0";

/** TabsTrigger override: 2px brand underline on the active tab. */
export const UNDERLINE_TAB_CLASS =
  "h-full flex-none gap-1.5 rounded-none border-0 border-b-2 border-transparent px-1 text-sm font-medium text-muted-foreground after:hidden hover:text-foreground data-active:border-brand data-active:bg-transparent data-active:text-text-strong";
