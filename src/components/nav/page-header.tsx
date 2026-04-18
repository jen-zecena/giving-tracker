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

export function PageHeader({
  title,
  subtitle,
  showAddButton = true,
}: PageHeaderProps) {
  return (
    <div className="bg-card border-b border-border sticky top-0 lg:top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-4">
            <div className="hidden sm:block">
              <NotificationsDropdown />
            </div>
            {showAddButton && (
              <Button
                render={<Link href="/donations/new" />}
                className="hidden sm:flex"
                size="default"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Add Donation</span>
                <span className="md:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
