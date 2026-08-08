"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/nav/notifications-dropdown";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showAddButton?: boolean;
}

/**
 * DS page header: title block floating on the sand page — no white bar,
 * no border, not sticky (the TopBar is the sticky chrome). The bell
 * renders only below lg, where the TopBar (which carries it) is hidden.
 */
export function PageHeader({
  title,
  subtitle,
  showAddButton = true,
}: PageHeaderProps) {
  return (
    <header className="mx-auto w-full max-w-[1180px] flex flex-wrap items-end justify-between gap-6 px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl lg:text-[2rem] font-semibold tracking-tight leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-base text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="lg:hidden hidden sm:block">
          <NotificationsDropdown />
        </div>
        {showAddButton && (
          <Button render={<Link href="/donations/new" />} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Log a donation</span>
            <span className="md:hidden">Log</span>
          </Button>
        )}
      </div>
    </header>
  );
}
