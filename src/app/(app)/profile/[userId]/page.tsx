import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  EyeOff,
  Heart,
  Lock,
  Repeat,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/nav/page-header";
import { privacyTierMeta } from "@/lib/privacy-tier";
import {
  getPublicProfileData,
  type PublicProfileHeader,
  type PublicProfileStats,
  type PublicRecentDonation,
} from "@/lib/queries/public-profile";
import { getPublicFollowButtonState } from "@/lib/queries/public-profile-helpers";

import { PublicProfileFollowButton } from "./follow-button";

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
};

const SCOPE_LABELS: Record<string, string> = {
  local: "Local",
  national: "National",
  global: "Global",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function firstInitial(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const data = await getPublicProfileData(userId);
  if (!data) redirect("/login");

  if (data.status === "self") redirect("/profile");
  if (data.status === "not_found") {
    return (
      <>
        <PageHeader title="Profile" showAddButton={false} />
        <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <BackLink />
          <EmptyState
            icon={Users}
            title="User not found"
            description="This profile doesn't exist or has been removed."
          />
        </div>
      </>
    );
  }

  if (data.status === "hidden") {
    return (
      <>
        <PageHeader title="Profile" showAddButton={false} />
        <div className="mx-auto grid max-w-3xl gap-6 p-4 sm:p-6 lg:p-8">
          <BackLink />
          <HiddenProfileCard
            header={data.header}
            hasPendingRequest={data.hasPendingRequest}
          />
        </div>
      </>
    );
  }

  const { header, stats, recent_donations, viewer } = data;
  const tierMeta = privacyTierMeta(header.privacy_tier);
  const displayName = header.display_name?.trim() || "Giving Tracker user";
  const buttonState = getPublicFollowButtonState({
    tier: header.privacy_tier,
    isFollowing: viewer.is_following,
    hasPendingRequest: viewer.has_pending_request,
  });

  return (
    <>
      <PageHeader title="Profile" showAddButton={false} />

      <div className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-6 lg:p-8">
        <BackLink />

        <ProfileHeaderCard
          initial={firstInitial(header.display_name)}
          displayName={displayName}
          bio={header.bio}
          tierLabel={tierMeta.label}
          tierDescription={tierMeta.description}
          followControl={
            <PublicProfileFollowButton
              targetUserId={header.user_id}
              targetName={displayName}
              initialState={buttonState}
            />
          }
        />

        <section
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Giving summary"
        >
          <StatCard
            label="Total Donated"
            value={stats.show_amounts ? formatCurrency(stats.total_donated) : "—"}
            icon={Heart}
            tone="purple"
            hint={stats.show_amounts ? undefined : "Hidden by this user"}
          />
          <StatCard
            label="Donations"
            value={stats.donation_count.toLocaleString("en-US")}
            icon={Building2}
            tone="blue"
            hint={
              stats.organization_count > 0
                ? `${stats.organization_count} ${
                    stats.organization_count === 1
                      ? "organization"
                      : "organizations"
                  }`
                : undefined
            }
          />
          <StatCard
            label="Followers"
            value={stats.follower_count.toLocaleString("en-US")}
            icon={Users}
            tone="green"
          />
        </section>

        <RecentDonationsCard
          donations={recent_donations}
          showAmounts={stats.show_amounts}
        />
      </div>
    </>
  );
}

// ── Back link ────────────────────────────────────────────────

function BackLink() {
  return (
    <Button
      render={<Link href="/discover" />}
      variant="ghost"
      size="sm"
      className="w-fit -ml-2 text-muted-foreground"
    >
      <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
      Back
    </Button>
  );
}

// ── Header ───────────────────────────────────────────────────

function ProfileHeaderCard({
  initial,
  displayName,
  bio,
  tierLabel,
  tierDescription,
  followControl,
}: {
  initial: string;
  displayName: string;
  bio: string | null;
  tierLabel: string;
  tierDescription: string;
  followControl: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 font-sans text-3xl font-semibold text-primary-foreground shadow-sm"
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-tight">
              {displayName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {bio?.trim() || "No bio yet."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">{tierLabel}</Badge>
              <span className="text-xs text-muted-foreground">
                {tierDescription}
              </span>
            </div>
          </div>
        </div>
        <div className="self-start sm:self-center">{followControl}</div>
      </div>
    </Card>
  );
}

// ── Hidden card ──────────────────────────────────────────────

function HiddenProfileCard({
  header,
  hasPendingRequest,
}: {
  header: PublicProfileHeader;
  hasPendingRequest: boolean;
}) {
  const displayName = header.display_name?.trim() || "Giving Tracker user";
  const tierMeta = privacyTierMeta(header.privacy_tier);
  const buttonState = getPublicFollowButtonState({
    tier: header.privacy_tier,
    isFollowing: false,
    hasPendingRequest,
  });

  return (
    <Card className="p-8 text-center">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">
        This profile is private
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {displayName} has a <span className="font-medium">{tierMeta.label}</span>{" "}
        profile.
        {header.privacy_tier === "friends_only"
          ? " Send a follow request to see their giving."
          : " Their giving is only visible to them."}
      </p>
      <div className="mt-6 flex justify-center">
        <PublicProfileFollowButton
          targetUserId={header.user_id}
          targetName={displayName}
          initialState={buttonState}
        />
      </div>
    </Card>
  );
}

// ── Stat card ────────────────────────────────────────────────

type Tone = "purple" | "blue" | "green";
const TONE_BG: Record<Tone, string> = {
  purple: "bg-metric-purple",
  blue: "bg-metric-blue",
  green: "bg-metric-green",
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Heart;
  tone: Tone;
  hint?: string;
}) {
  return (
    <Card className={`${TONE_BG[tone]} border-transparent p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">
            {label}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-foreground/60">{hint}</p>}
        </div>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/70 text-foreground/70"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

// ── Recent donations ─────────────────────────────────────────

function RecentDonationsCard({
  donations,
  showAmounts,
}: {
  donations: PublicRecentDonation[];
  showAmounts: boolean;
}) {
  if (donations.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No public donations yet"
        description="When this user logs a donation and chooses to share it, it will show up here."
      />
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden p-0">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold">Recent donations</h3>
        <p className="text-xs text-muted-foreground">
          {showAmounts
            ? "5 most recent confirmed gifts."
            : "5 most recent confirmed gifts. Amounts hidden by this user."}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {donations.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {d.organization_name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{formatDate(d.donation_date)}</span>
                {d.cause_tag && (
                  <Badge variant="outline" className="font-normal">
                    {CAUSE_LABELS[d.cause_tag] ?? d.cause_tag}
                  </Badge>
                )}
                <Badge variant="secondary" className="font-normal">
                  {SCOPE_LABELS[d.scope] ?? d.scope}
                </Badge>
                {d.is_recurring && (
                  <Badge variant="outline" className="gap-1 font-normal">
                    <Repeat className="h-3 w-3" aria-hidden="true" />
                    Recurring
                  </Badge>
                )}
              </div>
            </div>
            <div className="font-mono text-sm font-semibold">
              {showAmounts ? (
                formatCurrency(d.amount)
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                  Hidden
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export type { PublicProfileStats };
