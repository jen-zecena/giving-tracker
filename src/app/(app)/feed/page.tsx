import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Building2, Compass, Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/nav/page-header";
import { resolveEmptyStateKind } from "@/lib/actions/feed-helpers";
import { getFeedPageData, type FeedItem } from "@/lib/queries/feed";

import { LikeButton } from "./like-button";

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  return format(new Date(iso + "T00:00:00"), "MMM d, yyyy");
}

function firstInitial(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export default async function FeedPage() {
  const data = await getFeedPageData();
  if (!data) redirect("/login");

  const { items, followsCount } = data;
  const emptyKind = resolveEmptyStateKind(followsCount);

  return (
    <>
      <PageHeader
        title="Feed"
        subtitle="Recent giving from people you follow"
        showAddButton={false}
      />
      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        {items.length === 0 ? (
          emptyKind === "no-follows" ? (
            <EmptyState
              icon={Compass}
              title="Your feed is empty"
              description="Follow people to see their giving here."
              action={{ label: "Discover users", href: "/discover" }}
            />
          ) : (
            <EmptyState
              icon={Heart}
              title="No recent activity"
              description="People you follow haven't logged any donations yet. Check back later."
            />
          )
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
            <p className="py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up!
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ── Feed card ────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  const displayName = item.user.display_name?.trim() || "Anonymous";
  const causeLabel = item.cause_tag ? CAUSE_LABELS[item.cause_tag] : null;
  const scopeLabel = SCOPE_LABELS[item.scope] ?? item.scope;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${item.user_id}`}
            aria-label={`View ${displayName}'s profile`}
            className="shrink-0"
          >
            <PosterAvatar
              name={item.user.display_name}
              avatarUrl={item.user.avatar_url}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${item.user_id}`}
              className="block truncate font-medium text-foreground hover:underline"
            >
              {displayName}
            </Link>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDate(item.donation_date)}
            </p>
          </div>
        </div>

        {/* ── Donation body ───────────────────────────────── */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              Donated to{" "}
              <span className="text-foreground">
                {item.organization_name}
              </span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {causeLabel && <Badge variant="outline">{causeLabel}</Badge>}
              <Badge variant="outline">{scopeLabel}</Badge>
            </div>
          </div>
          <div className="shrink-0 text-right">
            {item.amount !== null ? (
              <p className="text-lg font-semibold font-mono tabular-nums text-foreground">
                {formatCurrency(item.amount)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Amount hidden
              </p>
            )}
          </div>
        </div>

        {item.notes && (
          <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {item.notes}
          </p>
        )}

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <LikeButton
            donationId={item.id}
            initialLiked={item.user_has_liked}
            initialCount={item.likes_count}
          />
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/profile/${item.user_id}`} />}
          >
            View profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PosterAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <span className="relative inline-flex size-10 shrink-0 overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-sm font-semibold text-primary-foreground"
      aria-hidden="true"
    >
      {firstInitial(name)}
    </span>
  );
}
