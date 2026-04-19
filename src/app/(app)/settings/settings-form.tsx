"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Globe2,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import type { PrivacyTier } from "@/types";

type SettingsFormProps = {
  initial: {
    display_name: string;
    bio: string;
    salary: string; // rendered as string in the input
    privacy_tier: PrivacyTier;
  };
};

type TierCopy = {
  value: PrivacyTier;
  label: string;
  icon: typeof Lock;
  headline: string;
  bullets: string[];
};

const TIERS: TierCopy[] = [
  {
    value: "private",
    label: "Private",
    icon: Lock,
    headline: "Only you see your giving.",
    bullets: [
      "Not discoverable anywhere on the platform.",
      "Donations visible only to you.",
      "No public profile or feed presence.",
    ],
  },
  {
    value: "friends_only",
    label: "Friends Only",
    icon: Users,
    headline: "Followers see activity. Amounts hidden by default.",
    bullets: [
      "Profile visible to people who follow you.",
      "Donations visible to followers.",
      "Dollar amounts hidden unless you opt in per-donation.",
    ],
  },
  {
    value: "open_giver",
    label: "Open Giver",
    icon: Globe2,
    headline: "Public, discoverable, and visible in community feeds.",
    bullets: [
      "Profile appears in discover / leaderboards.",
      "Donations visible to any signed-in user.",
      "Full amounts shown unless you hide individual donations.",
    ],
  },
];

export function SettingsForm({ initial }: SettingsFormProps) {
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [salary, setSalary] = useState(initial.salary);
  const [tier, setTier] = useState<PrivacyTier>(initial.privacy_tier);
  const [isPending, startTransition] = useTransition();

  const dirty =
    displayName !== initial.display_name ||
    bio !== initial.bio ||
    salary !== initial.salary ||
    tier !== initial.privacy_tier;

  function handleSave() {
    const parsedSalary =
      salary.trim() === "" ? null : Number(salary.replace(/[,$\s]/g, ""));

    if (parsedSalary !== null && (!Number.isFinite(parsedSalary) || parsedSalary <= 0)) {
      toast.error("Salary must be a positive number.");
      return;
    }

    startTransition(async () => {
      const result = await updateSettings({
        display_name: displayName,
        bio: bio.trim() === "" ? null : bio,
        salary: parsedSalary,
        privacy_tier: tier,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Settings saved.");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Profile ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Basic info that appears on your public profile (subject to your
            privacy tier).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How your name appears on the platform"
              maxLength={60}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short line about why you give"
              maxLength={280}
              rows={3}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {bio.length}/280
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary">
              Annual salary
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Encrypted at rest. Only you + your % indicator see this.
              </span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                $
              </span>
              <Input
                id="salary"
                inputMode="numeric"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Not set"
                className="pl-7 font-mono"
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Privacy ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Controls who can see your giving activity. Enforced server-side, not
            just in the UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => {
              const Icon = t.icon;
              const selected = tier === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTier(t.value)}
                  disabled={isPending}
                  aria-pressed={selected}
                  className={cn(
                    "group relative flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                    "hover:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-accent"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    {selected && (
                      <Badge variant="secondary" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {t.headline}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feature bullet list for the active tier */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium">
              {TIERS.find((t) => t.value === tier)?.label} includes
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {TIERS.find((t) => t.value === tier)?.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>Privacy Protection</AlertTitle>
            <AlertDescription>
              Privacy tiers are enforced by Postgres row-level security — not
              just hidden in the UI. Your salary is encrypted at rest with
              AES-256-GCM and is never returned to clients; only a derived
              percentage is shown, and only if you opt in.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ── Data Management ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export your data or delete your account. Both of these are planned
            follow-ups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
            <div>
              <div className="font-medium">Export to CSV</div>
              <div className="text-sm text-muted-foreground">
                Download all your donations as a spreadsheet.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Coming soon</Badge>
              <Button variant="outline" size="sm" disabled>
                Export
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-card p-4">
            <div>
              <div className="font-medium">Delete account</div>
              <div className="text-sm text-muted-foreground">
                Permanently remove your account and all donations.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Coming soon</Badge>
              <Button variant="destructive" size="sm" disabled>
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-card/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-4 max-w-2xl">
          <p className="text-sm text-muted-foreground">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <Button onClick={handleSave} disabled={!dirty || isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
