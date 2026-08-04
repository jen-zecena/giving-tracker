import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart, Lock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  getPublicProfileData,
  type PublicProfileHeader,
  type PublicProfileStats,
} from "@/lib/queries/public-profile";
import { getPublicFollowButtonState } from "@/lib/queries/public-profile-helpers";
import { privacyTierMeta } from "@/lib/privacy-tier";

import {
  AmountPrivate,
  BioCard,
  DonationListCard,
  firstInitial,
  formatCurrency,
  GivingSummaryCard,
  ProfileCover,
  ProfileIdentity,
  tierLabel,
} from "../profile-blocks";
import { PublicProfileFollowButton } from "./follow-button";

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
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <BackLink />
        <EmptyState
          icon={Users}
          title="User not found"
          description="This profile doesn't exist or has been removed."
        />
      </div>
    );
  }

  if (data.status === "hidden") {
    const { header, hasPendingRequest } = data;
    const displayName = header.display_name?.trim() || "Giving Tracker user";
    const buttonState = getPublicFollowButtonState({
      tier: header.privacy_tier,
      isFollowing: false,
      hasPendingRequest,
    });

    return (
      <>
        <ProfileCover>
          <CoverBackLink />
        </ProfileCover>
        <div className="px-4 sm:px-6 lg:px-8">
          <ProfileIdentity
            /* Initials only — the avatar image isn't shown for profiles
               that are hidden to this viewer (matches today's behavior). */
            initial={firstInitial(header.display_name)}
            name={displayName}
            tier={header.privacy_tier}
            meta={privacyTierMeta(header.privacy_tier).description}
            actions={
              <PublicProfileFollowButton
                targetUserId={header.user_id}
                targetName={displayName}
                initialState={buttonState}
              />
            }
          />
          <div className="mt-6 pb-8">
            <HiddenProfileCard header={header} />
          </div>
        </div>
      </>
    );
  }

  const { header, stats, recent_donations, viewer } = data;
  const displayName = header.display_name?.trim() || "Giving Tracker user";
  const buttonState = getPublicFollowButtonState({
    tier: header.privacy_tier,
    isFollowing: viewer.is_following,
    hasPendingRequest: viewer.has_pending_request,
  });

  return (
    <>
      <ProfileCover>
        <CoverBackLink />
      </ProfileCover>

      <div className="px-4 sm:px-6 lg:px-8">
        <ProfileIdentity
          avatarUrl={header.avatar_url}
          initial={firstInitial(header.display_name)}
          name={displayName}
          tier={header.privacy_tier}
          meta={privacyTierMeta(header.privacy_tier).description}
          actions={
            <PublicProfileFollowButton
              targetUserId={header.user_id}
              targetName={displayName}
              initialState={buttonState}
            />
          }
        />

        <div className="mt-6 grid items-start gap-6 pb-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8">
          {/* Side column */}
          <div className="grid gap-4 lg:sticky lg:top-20">
            <BioCard
              bio={header.bio}
              bioFallback="No bio yet."
              stats={[{ label: "Followers", value: stats.follower_count }]}
            />
            <GivingSummaryCard
              total={
                stats.show_amounts ? (
                  formatCurrency(stats.total_donated)
                ) : (
                  <AmountPrivate className="text-base font-sans font-normal" />
                )
              }
              donationCount={stats.donation_count}
              organizationCount={stats.organization_count}
            />
          </div>

          {/* Main column */}
          <div className="min-w-0">
            {recent_donations.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No public donations yet"
                description="When this user logs a donation and chooses to share it, it will show up here."
              />
            ) : (
              <DonationListCard
                title="Recent donations"
                description={
                  stats.show_amounts
                    ? "5 most recent confirmed gifts."
                    : "5 most recent confirmed gifts. Amounts stay hidden."
                }
                donations={recent_donations}
                showAmounts={stats.show_amounts}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Back links ───────────────────────────────────────────────

function BackLink() {
  return (
    <Button
      render={<Link href="/discover" />}
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </Button>
  );
}

/** Ghost back button overlaid on the cover band. */
function CoverBackLink() {
  return (
    <Button
      render={<Link href="/discover" />}
      variant="ghost"
      size="sm"
      className="absolute top-3 left-3 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground active:bg-primary-foreground/25 focus-visible:border-primary-foreground/60 focus-visible:ring-primary-foreground/40"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </Button>
  );
}

// ── Hidden-profile card ──────────────────────────────────────

function HiddenProfileCard({ header }: { header: PublicProfileHeader }) {
  const displayName = header.display_name?.trim() || "Giving Tracker user";

  return (
    <Card className="mx-auto w-full max-w-xl p-8 text-center">
      <span
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"
        aria-hidden="true"
      >
        <Lock className="h-6 w-6" />
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          This profile is private
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {displayName} has a{" "}
          <span className="font-medium">{tierLabel(header.privacy_tier)}</span>{" "}
          profile.
          {header.privacy_tier === "friends_only"
            ? " Send a follow request to see their giving."
            : " Their giving is only visible to them."}
        </p>
      </div>
    </Card>
  );
}

export type { PublicProfileStats };
