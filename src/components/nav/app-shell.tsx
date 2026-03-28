"use client";

import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { signOut } from "@/lib/actions/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar onSignOut={signOut} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
