import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getProfilePageData, privacyTierMeta } from "@/lib/queries/profile";

import { FollowersTab, FollowingTab } from "./follow-lists";
import {
  BioCard,
  DonationListCard,
  firstInitial,
  formatCurrency,
  GivingSummaryCard,
  ProfileCover,
  ProfileIdentity,
  UNDERLINE_TAB_CLASS,
  UNDERLINE_TABS_LIST_CLASS,
} from "./profile-blocks";

function TabCount({ value }: { value: number }) {
  if (value === 0) return null;
  return (
    <span className="font-mono text-xs text-text-faint tabular-nums">
      {value}
    </span>
  );
}

export default async function ProfilePage() {
  const data = await getProfilePageData();
  if (!data) redirect("/login");

  const { profile, stats, recent_donations, user_email, followers, following } =
    data;
  const tierMeta = privacyTierMeta(profile.privacy_tier);
  const displayName = profile.display_name?.trim() || "Your profile";

  return (
    <>
      <ProfileCover />

      <div className="px-4 sm:px-6 lg:px-8">
        <ProfileIdentity
          avatarUrl={profile.avatar_url}
          initial={firstInitial(profile.display_name, user_email)}
          name={displayName}
          tier={profile.privacy_tier}
          meta={tierMeta.description}
          actions={
            <Button variant="outline" render={<Link href="/settings" />}>
              <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
              Edit profile
            </Button>
          }
        />

        <div className="mt-6 grid items-start gap-6 pb-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8">
          {/* Side column */}
          <div className="grid gap-4 lg:sticky lg:top-20">
            <BioCard
              bio={profile.bio}
              bioFallback="Add a short bio from Settings to tell your story."
              stats={[
                { label: "Followers", value: stats.follower_count },
                { label: "Following", value: following.length },
              ]}
            />
            <GivingSummaryCard
              total={formatCurrency(stats.total_donated)}
              donationCount={stats.donation_count}
              organizationCount={stats.organization_count}
            />
          </div>

          {/* Main column */}
          <Tabs defaultValue="activity" className="min-w-0 gap-5">
            <TabsList variant="line" className={UNDERLINE_TABS_LIST_CLASS}>
              <TabsTrigger value="activity" className={UNDERLINE_TAB_CLASS}>
                Activity
              </TabsTrigger>
              <TabsTrigger value="followers" className={UNDERLINE_TAB_CLASS}>
                Followers
                <TabCount value={followers.length} />
              </TabsTrigger>
              <TabsTrigger value="following" className={UNDERLINE_TAB_CLASS}>
                Following
                <TabCount value={following.length} />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              {recent_donations.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="No donations yet"
                  description="Log your first donation and it will show up here."
                  action={{ label: "Add a donation", href: "/donations/new" }}
                />
              ) : (
                <DonationListCard
                  title="Recent donations"
                  description="Your 5 most recent confirmed gifts."
                  donations={recent_donations}
                  showAmounts
                />
              )}
            </TabsContent>

            <TabsContent value="followers">
              <FollowersTab followers={followers} />
            </TabsContent>

            <TabsContent value="following">
              <FollowingTab following={following} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
