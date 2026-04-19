import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Heart,
  PenSquare,
  Repeat,
  Users,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/nav/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  getProfilePageData,
  privacyTierMeta,
  type RecentDonation,
} from "@/lib/queries/profile";

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

function firstInitial(name: string | null, fallback: string): string {
  const source = name?.trim() || fallback;
  return source.charAt(0).toUpperCase() || "?";
}

export default async function ProfilePage() {
  const data = await getProfilePageData();
  if (!data) redirect("/login");

  const { profile, stats, recent_donations, user_email } = data;
  const tierMeta = privacyTierMeta(profile.privacy_tier);
  const displayName = profile.display_name?.trim() || "Your profile";

  return (
    <>
      <PageHeader title="Profile" showAddButton={false} />

      <div className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-6 lg:p-8">
        <ProfileHeaderCard
          initial={firstInitial(profile.display_name, user_email)}
          displayName={displayName}
          bio={profile.bio}
          tierLabel={tierMeta.label}
          tierDescription={tierMeta.description}
        />

        <section
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Giving summary"
        >
          <StatCard
            label="Total Donated"
            value={formatCurrency(stats.total_donated)}
            icon={Heart}
            tone="purple"
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

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-none sm:inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab donations={recent_donations} />
          </TabsContent>

          <TabsContent value="followers" className="mt-4">
            <EmptyState
              icon={Users}
              title="No followers yet"
              description="When people follow you, they'll show up here. We'll wire this up once the social features ship."
            />
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <EmptyState
              icon={UserPlus}
              title="Not following anyone yet"
              description="Find other givers on the Discover tab. We'll surface them here once the social features ship."
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ── Header ───────────────────────────────────────────────────

function ProfileHeaderCard({
  initial,
  displayName,
  bio,
  tierLabel,
  tierDescription,
}: {
  initial: string;
  displayName: string;
  bio: string | null;
  tierLabel: string;
  tierDescription: string;
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
              {bio?.trim() || "Add a short bio from Settings to tell your story."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">{tierLabel}</Badge>
              <span className="text-xs text-muted-foreground">
                {tierDescription}
              </span>
            </div>
          </div>
        </div>

        <div className="self-start sm:self-center">
          <Button render={<Link href="/settings" />} variant="outline">
            <PenSquare className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Edit Profile
          </Button>
        </div>
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
          {hint && (
            <p className="mt-1 text-xs text-foreground/60">{hint}</p>
          )}
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

// ── Overview tab ─────────────────────────────────────────────

function OverviewTab({ donations }: { donations: RecentDonation[] }) {
  if (donations.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No donations yet"
        description="Log your first donation and it will show up here."
        action={{ label: "Add a donation", href: "/donations/new" }}
      />
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden p-0">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold">Recent donations</h3>
        <p className="text-xs text-muted-foreground">
          Your 5 most recent confirmed gifts.
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
              {formatCurrency(d.amount)}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

