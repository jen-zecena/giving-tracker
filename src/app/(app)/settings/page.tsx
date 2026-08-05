import { redirect } from "next/navigation";

import { PageHeader } from "@/components/nav/page-header";
import { getProfile } from "@/lib/actions/profile";
import { decryptSalaryFromDB } from "@/lib/salary";

import { AccountPane } from "./account-pane";
import { GoalsIncomePane } from "./goals-income-pane";
import { NotificationsPane } from "./notifications-pane";
import { PrivacyPane } from "./privacy-pane";
import { ProfilePane } from "./profile-pane";
import { SETTINGS_TABS, SettingsNav, type SettingsTab } from "./settings-nav";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: SettingsTab = (SETTINGS_TABS as readonly string[]).includes(
    rawTab ?? ""
  )
    ? (rawTab as SettingsTab)
    : "profile";

  const result = await getProfile();
  if (result.error || !result.data) {
    redirect("/login");
  }
  const profile = result.data;

  // Decrypt for the owner viewing their own settings. Safe because the page
  // is owner-only via Supabase RLS (DP-007) and the decrypted number never
  // leaves the server response to this signed-in user. RSC serializes it
  // into the page output — nothing is exposed publicly.
  let salaryString = "";
  if (profile.salary_encrypted) {
    try {
      const n = decryptSalaryFromDB(profile.salary_encrypted);
      if (Number.isFinite(n) && n > 0) salaryString = String(n);
    } catch {
      // Bad ciphertext or missing key — fall back to empty so the user can
      // re-enter their salary rather than seeing a broken form.
      salaryString = "";
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="You decide what anyone else can see"
        showAddButton={false}
      />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[228px_minmax(0,1fr)] lg:gap-8">
          <SettingsNav active={tab} />
          <div className="grid min-w-0 gap-6">
            {tab === "profile" && (
              <ProfilePane
                initial={{
                  display_name: profile.display_name ?? "",
                  bio: profile.bio ?? "",
                  avatar_url: profile.avatar_url,
                }}
              />
            )}
            {tab === "privacy" && (
              <PrivacyPane
                initial={{
                  privacy_tier: profile.privacy_tier,
                  show_amounts_to_friends: profile.show_amounts_to_friends,
                  show_percentage_publicly: profile.show_percentage_publicly,
                }}
              />
            )}
            {tab === "goals" && <GoalsIncomePane initialSalary={salaryString} />}
            {tab === "notifications" && (
              <NotificationsPane
                initialEmailNotifications={profile.email_notifications}
              />
            )}
            {tab === "account" && <AccountPane />}
          </div>
        </div>
      </div>
    </>
  );
}
