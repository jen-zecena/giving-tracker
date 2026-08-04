import Link from "next/link";
import { Bell, KeyRound, Shield, Target, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Settings panes. All five DS panes exist here: Profile, Privacy,
 * Goals & income (the relocated /goals page + salary), Notifications
 * (the email digest opt-out) and Account (the "Your data" card).
 */
export const SETTINGS_TABS = [
  "profile",
  "privacy",
  "goals",
  "notifications",
  "account",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

const NAV: { value: SettingsTab; label: string; icon: LucideIcon }[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "privacy", label: "Privacy", icon: Shield },
  { value: "goals", label: "Goals & income", icon: Target },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "account", label: "Account", icon: KeyRound },
];

/**
 * DS Settings left sub-nav: active pane gets the white card look
 * (bg-card + hairline), inactive panes sit transparent on the sand and
 * gain the sunken wash on hover. Link-based so ?tab= navigation is
 * back/forward friendly.
 */
export function SettingsNav({ active }: { active: SettingsTab }) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-wrap gap-1 lg:sticky lg:top-6 lg:grid lg:gap-0.5"
    >
      {NAV.map(({ value, label, icon: Icon }) => {
        const on = value === active;
        return (
          <Link
            key={value}
            href={`/settings?tab=${value}`}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
              on
                ? "bg-card font-semibold text-text-strong shadow-2xs"
                : "font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
            )}
          >
            <Icon className="size-[17px] shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
