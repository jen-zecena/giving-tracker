"use client";

import { useState, useTransition } from "react";
import { Globe, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateSettings } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import type { PrivacyTier } from "@/types";

type PrivacyPaneProps = {
  initial: {
    privacy_tier: PrivacyTier;
    show_amounts_to_friends: boolean;
    show_percentage_publicly: boolean;
  };
};

// DS copy — plain, absolute privacy language.
const TIERS: {
  value: PrivacyTier;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you can see your giving.",
    icon: Shield,
  },
  {
    value: "friends_only",
    label: "Friends only",
    description:
      "People you approve can see your activity. Amounts stay hidden.",
    icon: Users,
  },
  {
    value: "open_giver",
    label: "Open giver",
    description: "Publicly discoverable, including your percentage.",
    icon: Globe,
  },
];

/**
 * DS Settings → Privacy pane: card-radio tiers (never a dropdown) and the
 * visibility switches on top. Changes save immediately — "Change this
 * whenever you like." — with optimistic UI and a revert on error.
 */
export function PrivacyPane({ initial }: PrivacyPaneProps) {
  const [tier, setTier] = useState<PrivacyTier>(initial.privacy_tier);
  const [showAmounts, setShowAmounts] = useState(
    initial.show_amounts_to_friends
  );
  const [showPercentage, setShowPercentage] = useState(
    initial.show_percentage_publicly
  );
  const [isPending, startTransition] = useTransition();

  function saveTier(next: PrivacyTier) {
    if (next === tier || isPending) return;
    const prev = tier;
    setTier(next);
    startTransition(async () => {
      const result = await updateSettings({ privacy_tier: next });
      if (result.error) {
        setTier(prev);
        toast.error(result.error);
      } else {
        toast.success("Privacy level updated.");
      }
    });
  }

  function saveToggle(
    field: "show_amounts_to_friends" | "show_percentage_publicly",
    next: boolean,
    set: (v: boolean) => void
  ) {
    set(next);
    startTransition(async () => {
      const result = await updateSettings({ [field]: next });
      if (result.error) {
        set(!next);
        toast.error(result.error);
      } else {
        toast.success("Saved.");
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Privacy level</CardTitle>
          <CardDescription>Change this whenever you like.</CardDescription>
        </CardHeader>
        <CardContent
          role="radiogroup"
          aria-label="Privacy level"
          className="grid gap-2.5"
        >
          {TIERS.map((t) => {
            const selected = tier === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => saveTier(t.value)}
                disabled={isPending}
                className={cn(
                  "flex items-start gap-3.5 rounded-xl border p-4 text-left outline-none transition-colors",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
                  "disabled:pointer-events-none disabled:opacity-50",
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-border-strong bg-card hover:bg-surface-sunken"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md",
                    selected
                      ? "bg-card text-brand"
                      : "bg-surface-sunken text-muted-foreground"
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-text-strong">
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {t.description}
                  </span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What&apos;s visible</CardTitle>
          <CardDescription>
            These apply on top of your privacy level.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SwitchRow
            id="show-amounts"
            label="Show amounts to followers"
            description="Off by default, even for friends."
            checked={showAmounts}
            disabled={isPending}
            onChange={(next) =>
              saveToggle("show_amounts_to_friends", next, setShowAmounts)
            }
          />
          <SwitchRow
            id="show-percentage"
            label="Show my percentage of income"
            description="The percentage only — never the income itself."
            checked={showPercentage}
            disabled={isPending}
            onChange={(next) =>
              saveToggle("show_percentage_publicly", next, setShowPercentage)
            }
          />
        </CardContent>
      </Card>
    </>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next)}
        className="mt-0.5"
      />
    </div>
  );
}
