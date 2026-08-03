import { AppShell, type ShellUser } from "@/components/nav/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { PrivacyTier } from "@/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Profile summary for the shell chrome (sidebar account row, top-bar
  // account menu, admin nav gating). The admin flag is a UX gate only —
  // the /admin/* route guard and RLS policies remain the enforcement.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shellUser: ShellUser = {
    displayName: "Member",
    avatarUrl: null,
    privacyTier: "private",
    isAdmin: false,
  };

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, privacy_tier, is_admin")
      .eq("id", user.id)
      .single();
    shellUser = {
      displayName:
        profile?.display_name ?? user.email?.split("@")[0] ?? "Member",
      avatarUrl: profile?.avatar_url ?? null,
      privacyTier: (profile?.privacy_tier ?? "private") as PrivacyTier,
      isAdmin: profile?.is_admin ?? false,
    };
  }

  return <AppShell user={shellUser}>{children}</AppShell>;
}
