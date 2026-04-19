import { redirect } from "next/navigation";

import { PageHeader } from "@/components/nav/page-header";
import { getProfile } from "@/lib/actions/profile";
import { decryptSalaryFromDB } from "@/lib/salary";

import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
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
        subtitle="Manage your account"
        showAddButton={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <SettingsForm
          initial={{
            display_name: profile.display_name ?? "",
            bio: profile.bio ?? "",
            salary: salaryString,
            privacy_tier: profile.privacy_tier,
          }}
        />
      </div>
    </>
  );
}
