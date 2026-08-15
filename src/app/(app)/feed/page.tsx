import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  CheckCircle2,
  Compass,
  ExternalLink,
  EyeOff,
  Globe,
  Heart,
  MapPin,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationsDropdown } from "@/components/nav/notifications-dropdown";
import { getFollowButtonState } from "@/lib/actions/discover-helpers";
import { resolveEmptyStateKind } from "@/lib/actions/feed-helpers";
import { getDiscoverPageData } from "@/lib/queries/discover";
import { getFeedPageData, type FeedItem } from "@/lib/queries/feed";
import { LoadErrorState } from "@/components/load-error-state";
import { createClient } from "@/lib/supabase/server";

import { LikeButton } from "./like-button";
import { SuggestedPeopleCard, type SuggestedPerson } from "./suggested-people";

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

/** Viewer identity for the "log a gift" prompt row. */
async function getViewerSummary(): Promise<{
  displayName: string | null;
  avatarUrl: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();
  return {
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}

export default async function FeedPage() {
  const [data, discoverData, viewer] = await Promise.all([
    getFeedPageData(),
    getDiscoverPageData(),
    getViewerSummary(),
  ]);
  if (!data || !viewer) redirect("/login");

  const { items, followsCount } = data;
  const emptyKind = resolveEmptyStateKind(followsCount);

  // Rail: people the viewer doesn't follow yet (reuses the Discover
  // query — no new backend). Pending requests are excluded too.
  // The rail is best-effort: a failed discover query just hides it.
  const discover = discoverData === "error" ? null : discoverData;
  const followingSet = new Set(discover?.followingIds ?? []);
  const outgoingSet = new Set(discover?.pendingOutgoingIds ?? []);
  const suggestions: SuggestedPerson[] = (discover?.users ?? [])
    .filter((u) => !followingSet.has(u.id) && !outgoingSet.has(u.id))
    .slice(0, 3)
    .map((u) => ({
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      bio: u.bio,
      action: getFollowButtonState(u.privacy_tier, false, false) as
        | "follow"
        | "request",
    }));
  const hasRail = suggestions.length > 0;

  return (
    <>
      {/* Local header: same DS classes as PageHeader, plus the "Find
          people" action PageHeader doesn't support (see report note). */}
      <header className="mx-auto w-full max-w-[1180px] flex flex-wrap items-end justify-between gap-6 px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-[2rem] font-semibold tracking-tight leading-tight truncate">
            Feed
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground truncate">
            Giving from people you follow
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="lg:hidden hidden sm:block">
            <NotificationsDropdown />
          </div>
          <Button variant="outline" render={<Link href="/discover" />}>
            <UserPlus aria-hidden />
            Find people
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12">
        <div
          className={
            hasRail
              ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start"
              : "mx-auto max-w-3xl"
          }
        >
          {/* ── Main column ─────────────────────────────────── */}
          <div className="grid gap-4 min-w-0">
            <PromptRow
              displayName={viewer.displayName}
              avatarUrl={viewer.avatarUrl}
            />

            {data.loadError ? (
              <LoadErrorState
                title="Your feed couldn't load"
                description="Something hiccuped on our side — your data is safe."
                retryHref="/feed"
              />
            ) : items.length === 0 ? (
              emptyKind === "no-follows" ? (
                <FeedEmptyState
                  icon={<Compass className="h-6 w-6" aria-hidden />}
                  title="Your feed is empty"
                  description="Follow people to see their giving here."
                  action={
                    <Button render={<Link href="/discover" />}>
                      Find people
                    </Button>
                  }
                />
              ) : (
                <FeedEmptyState
                  icon={<Heart className="h-6 w-6" aria-hidden />}
                  title="No recent activity"
                  description="People you follow haven't logged any donations yet."
                />
              )
            ) : (
              <>
                {items.map((item) => (
                  <FeedCard key={item.id} item={item} />
                ))}
                <p className="py-3 text-center text-sm text-text-faint">
                  You&apos;re all caught up.
                </p>
              </>
            )}
          </div>

          {/* ── Right rail ──────────────────────────────────── */}
          {hasRail && (
            <div className="grid gap-4 min-w-0 lg:sticky lg:top-22">
              <SuggestedPeopleCard people={suggestions} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Prompt row ───────────────────────────────────────────────

function PromptRow({
  displayName,
  avatarUrl,
}: {
  displayName: string | null;
  avatarUrl: string | null;
}) {
  return (
    <Card className="flex-row items-center gap-3.5 px-6 py-5">
      <Avatar size="lg">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="bg-brand-soft text-green-700 text-sm font-semibold">
          {firstInitial(displayName)}
        </AvatarFallback>
      </Avatar>
      <Link
        href="/donations/new"
        className="min-w-0 flex-1 truncate rounded-full border border-border-strong bg-surface-sunken px-4 py-3 text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-(--sand-200) hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        Log a gift and share it with your friends…
      </Link>
      <Button
        size="icon"
        aria-label="Log a donation"
        render={<Link href="/donations/new" />}
      >
        <Plus aria-hidden />
      </Button>
    </Card>
  );
}

// ── Feed card ────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  const displayName = item.user.display_name?.trim() || "Anonymous";
  const causeLabel = item.cause_tag ? CAUSE_LABELS[item.cause_tag] : null;
  const scopeLabel = SCOPE_LABELS[item.scope] ?? item.scope;

  return (
    <Card>
      <CardContent className="space-y-3.5">
        {/* ── Header: who gave, to whom, when + amount ─────── */}
        <div className="flex items-start gap-3">
          <Link
            href={`/profile/${item.user_id}`}
            aria-label={`View ${displayName}'s profile`}
            className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar size="lg">
              {item.user.avatar_url && (
                <AvatarImage src={item.user.avatar_url} alt="" />
              )}
              <AvatarFallback className="bg-brand-soft text-green-700 text-sm font-semibold">
                {firstInitial(item.user.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-normal text-foreground">
              <Link
                href={`/profile/${item.user_id}`}
                className="font-semibold text-text-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
              >
                {displayName}
              </Link>{" "}
              donated to{" "}
              <span className="font-semibold text-text-strong">
                {item.organization_name}
              </span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-text-faint">
              {formatDate(item.donation_date)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {item.amount !== null ? (
              <p className="font-mono text-base font-semibold tabular-nums text-text-strong">
                {formatCurrency(item.amount)}
              </p>
            ) : (
              <p className="text-xs italic text-text-faint">Amount private</p>
            )}
          </div>
        </div>

        {/* ── Rich org info (when linked to the directory) ── */}
        {item.nonprofit && (
          <div className="flex items-start gap-3 rounded-lg bg-surface-sunken px-3.5 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card shadow-2xs">
              {item.nonprofit.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote Every.org logos, same pattern as the directory cards
                <img
                  src={item.nonprofit.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="font-display text-lg text-brand"
                >
                  {item.nonprofit.name[0]?.toUpperCase()}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-text-strong">
                  {item.nonprofit.name}
                </span>
                {item.nonprofit.verified && (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-brand"
                    aria-label="Verified 501(c)(3)"
                  />
                )}
              </span>
              {item.nonprofit.mission && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {item.nonprofit.mission}
                </p>
              )}
              {item.nonprofit.location && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-faint">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {item.nonprofit.location}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Cause / scope badges + fundraiser link ───────── */}
        <div className="flex flex-wrap items-center gap-1.5">
          {item.is_own && item.own_visibility && (
            <Badge
              variant="secondary"
              className={
                item.own_visibility === "only_you"
                  ? "gap-1 bg-surface-sunken text-muted-foreground"
                  : "gap-1 bg-brand-soft text-green-700"
              }
            >
              {item.own_visibility === "only_you" ? (
                <EyeOff className="h-3 w-3" aria-hidden="true" />
              ) : item.own_visibility === "friends" ? (
                <Users className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Globe className="h-3 w-3" aria-hidden="true" />
              )}
              {item.own_visibility === "only_you"
                ? "Only you"
                : item.own_visibility === "friends"
                  ? "Friends"
                  : "Everyone"}
            </Badge>
          )}
          {causeLabel && (
            <Badge
              variant="outline"
              className="border-border-strong text-muted-foreground"
            >
              {causeLabel}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="border-border-strong text-muted-foreground"
          >
            {scopeLabel}
          </Badge>
          {item.fundraiser_url && (
            <a
              href={item.fundraiser_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Fundraiser
            </a>
          )}
        </div>

        {item.notes && (
          <p className="rounded-lg bg-surface-sunken px-3.5 py-2.5 text-sm text-muted-foreground">
            {item.notes}
          </p>
        )}

        {/* ── Footer: cheers ───────────────────────────────── */}
        <div className="flex items-center border-t border-border pt-3">
          <LikeButton
            donationId={item.id}
            initialLiked={item.user_has_liked}
            initialCount={item.likes_count}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty state (DS dashed block) ────────────────────────────

function FeedEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border-strong bg-transparent">
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          {icon}
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-text-strong">
          {title}
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
