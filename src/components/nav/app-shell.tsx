"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/nav/sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main content — offset for sidebar on desktop, header/footer on mobile */}
      <main className="flex-1 lg:ml-[260px] pt-16 lg:pt-0 pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
