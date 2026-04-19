import { createClient } from "@/lib/supabase/server";

export type ChecklistStatus = {
  profileCompleted: boolean;
  donationLogged: boolean;
  goalSet: boolean;
  nonprofitExplored: boolean;
};

/**
 * Checks which onboarding steps the current user has completed.
 * Returns all-false for unauthenticated users.
 */
export async function getChecklistStatus(): Promise<ChecklistStatus> {
  const defaults: ChecklistStatus = {
    profileCompleted: false,
    donationLogged: false,
    goalSet: false,
    nonprofitExplored: false,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return defaults;

  const [profileRes, donationRes, goalRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, bio")
      .eq("id", user.id)
      .single(),
    supabase
      .from("donations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const profile = profileRes.data;

  return {
    profileCompleted: !!(profile?.display_name?.trim()),
    donationLogged: (donationRes.count ?? 0) > 0,
    goalSet: (goalRes.count ?? 0) > 0,
    nonprofitExplored: false, // no tracking yet — checked off via user action
  };
}
