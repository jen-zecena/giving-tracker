import { PageHeader } from "@/components/nav/page-header";
import { getOrganizationSuggestions } from "@/lib/actions/donations";
import { createClient } from "@/lib/supabase/server";
import { decryptSalaryFromDB } from "@/lib/salary";
import { nextSalaryMilestone } from "@/lib/queries/dashboard-helpers";
import { DonationForm, type GoalContext } from "./new-donation-form";

/**
 * Goal context for the "After saving" rail: this-year confirmed total plus
 * the member's income so the ring can project live as the amount changes.
 * Owner-only data — the decrypted salary is serialized into this signed-in
 * user's own page exactly like the Settings income field (RLS-scoped
 * queries; nothing here is visible to anyone else).
 */
async function getGoalContext(): Promise<GoalContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ytdTotal: 0, salary: null, targetPct: null };

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("donations")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .gte("donation_date", yearStart),
    supabase
      .from("profiles")
      .select("salary_encrypted")
      .eq("id", user.id)
      .single(),
  ]);

  const ytdTotal = (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  let salary: number | null = null;
  if (profile?.salary_encrypted) {
    try {
      const n = decryptSalaryFromDB(profile.salary_encrypted);
      if (Number.isFinite(n) && n > 0) salary = n;
    } catch {
      salary = null; // bad ciphertext → rail falls back to the nudge
    }
  }

  const currentPct = salary ? (ytdTotal / salary) * 100 : null;
  return { ytdTotal, salary, targetPct: nextSalaryMilestone(currentPct) };
}

export default async function NewDonationPage() {
  const [result, goal] = await Promise.all([
    getOrganizationSuggestions(),
    getGoalContext(),
  ]);
  const initialOrgs = result.data ?? [];

  return (
    <>
      <PageHeader
        title="Log a donation"
        subtitle="Tracking only — we never move your money"
        showAddButton={false}
      />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12">
        <DonationForm initialOrgs={initialOrgs} goal={goal} />
      </div>
    </>
  );
}
