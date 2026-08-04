"use client";

import { ReactNode } from "react";
import { PendingDonationsProvider } from "@/components/nav/pending-donations-context";
import { Sidebar } from "@/components/nav/sidebar";
import { TopBar } from "@/components/nav/top-bar";
import type { PrivacyTier } from "@/types";

/** Profile summary the server layout hands to the shell chrome. */
export interface ShellUser {
  displayName: string;
  avatarUrl: string | null;
  privacyTier: PrivacyTier;
  isAdmin: boolean;
}

interface AppShellProps {
  children: ReactNode;
  user: ShellUser;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <PendingDonationsProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar user={user} />

        {/* Main content — offset for sidebar on desktop, header/footer on mobile */}
        <main className="flex-1 min-w-0 lg:ml-[260px] pt-16 lg:pt-0 pb-20 lg:pb-0">
          <TopBar user={user} />
          {children}
        </main>
      </div>
    </PendingDonationsProvider>
  );
}
