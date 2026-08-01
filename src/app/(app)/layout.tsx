import { AppShell } from "@/components/nav/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Surface admin status to the shell so admin-only nav entries render only
  // for admins. This is a UX gate, not a security boundary — the /admin/*
  // route guard and RLS policies remain the real enforcement.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
