"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Flag,
  Globe,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createDonation, updateDonation } from "@/lib/actions/donations";
import {
  celebrateFirstDonation,
  celebrateMilestone,
  donationCelebrationKind,
} from "@/lib/celebrations";
import { cn } from "@/lib/utils";
import type {
  CauseTag,
  Donation,
  DonationScope,
  RecurringFrequency,
} from "@/types";

const CAUSE_TAGS: { value: CauseTag; label: string }[] = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "environment", label: "Environment" },
  { value: "disaster_relief", label: "Disaster relief" },
  { value: "poverty", label: "Poverty & hunger" },
  { value: "community", label: "Community & housing" },
  { value: "arts_culture", label: "Arts & culture" },
  { value: "animal_welfare", label: "Animal welfare" },
  { value: "human_rights", label: "Human rights" },
  { value: "religious", label: "Religious" },
];

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (every 3 months)" },
  { value: "annually", label: "Annually" },
];

const SCOPE_OPTIONS: {
  value: DonationScope;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "local",
    label: "Local",
    description: "Serves your city or county.",
    icon: MapPin,
  },
  {
    value: "national",
    label: "National",
    description: "Operates across the country.",
    icon: Flag,
  },
  {
    value: "global",
    label: "Global",
    description: "Works internationally.",
    icon: Globe,
  },
];

// DS eyebrow treatment — the only uppercase in the app (12px tracked mono).
const EYEBROW =
  "font-mono text-[11px] uppercase tracking-[0.12em] text-text-faint";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function filterOrgSuggestions(
  query: string,
  orgs: string[],
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return orgs
    .filter(
      (org) =>
        org.toLowerCase().includes(q) && org.toLowerCase() !== q,
    )
    .slice(0, 5);
}

interface DonationFormProps {
  initialOrgs: string[];
  /** When set, the form edits this donation instead of creating a new one. */
  donation?: Donation;
}

export function DonationForm({ initialOrgs, donation }: DonationFormProps) {
  const router = useRouter();
  const isEdit = Boolean(donation);
  const [submitting, setSubmitting] = useState(false);

  // Fields
  const [amount, setAmount] = useState(
    donation ? String(donation.amount) : "",
  );
  const [organization, setOrganization] = useState(
    donation?.organization_name ?? "",
  );
  const [donationDate, setDonationDate] = useState<Date>(
    donation
      ? startOfDay(new Date(donation.donation_date + "T00:00:00"))
      : startOfDay(new Date()),
  );
  const [scope, setScope] = useState<DonationScope>(
    donation?.scope ?? "local",
  );
  const [causeTag, setCauseTag] = useState<CauseTag | "">(
    donation?.cause_tag ?? "",
  );
  const [customTag, setCustomTag] = useState(donation?.custom_tag ?? "");
  const [notes, setNotes] = useState(donation?.notes ?? "");
  const [taxDeductible, setTaxDeductible] = useState(
    donation?.is_tax_deductible ?? true,
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [hideFromFeed, setHideFromFeed] = useState(
    donation?.hide_from_feed ?? false,
  );

  // Org autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredSuggestions = useMemo(
    () => filterOrgSuggestions(organization, initialOrgs),
    [organization, initialOrgs],
  );

  const liveAmount = parseFloat(amount) || 0;
  const currentYear = new Date().getFullYear();

  function formatCurrencyInput(value: string): string {
    const cleaned = value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts[1];
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + "." + parts[1].slice(0, 2);
    }
    return cleaned;
  }

  function showCelebrationToast(opts: {
    numAmount: number;
    totalCount: number;
    isRecurringGift: boolean;
    orgName: string;
  }) {
    const { numAmount, totalCount, isRecurringGift, orgName } = opts;
    const MILESTONES = [10, 25, 50, 100];
    const formattedAmount = `$${numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    if (totalCount === 1) {
      toast.success("🎉 Welcome to your giving journey!", {
        description: "Your first donation has been logged!",
      });
    } else if (numAmount >= 1000) {
      toast.success("✨ What an incredible gift!", {
        description: `${formattedAmount} logged successfully`,
      });
    } else if (isRecurringGift) {
      toast.success("💪 Recurring donation set up!", {
        description: "Your consistent giving creates lasting impact",
      });
    } else if (MILESTONES.includes(totalCount)) {
      toast.success(`🏆 That's ${totalCount} donations!`, {
        description: "You're making incredible impact",
      });
    } else {
      toast.success("❤️ Donation logged!", {
        description: `${formattedAmount} to ${orgName}`,
      });
    }
  }

  function handleCancel() {
    router.push(isEdit ? "/donations" : "/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Hmm, that doesn't look right. Please enter a valid amount.");
      return;
    }
    if (!organization.trim()) {
      toast.error("Which organization did you support?");
      return;
    }

    const orgName = organization.trim();
    setSubmitting(true);

    try {
      if (isEdit && donation) {
        const result = await updateDonation(donation.id, {
          organization_name: orgName,
          amount: numAmount,
          donation_date: format(donationDate, "yyyy-MM-dd"),
          scope,
          cause_tag: causeTag || null,
          custom_tag: customTag,
          notes,
          is_tax_deductible: taxDeductible,
          hide_from_feed: hideFromFeed,
        });

        if (result.error) {
          toast.error(result.error);
          setSubmitting(false);
          return;
        }

        toast.success(`Updated donation to ${orgName}`);
        router.push("/donations");
        return;
      }

      const result = await createDonation({
        organization_name: orgName,
        amount: numAmount,
        donation_date: format(donationDate, "yyyy-MM-dd"),
        scope,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : undefined,
        cause_tag: causeTag || null,
        custom_tag: customTag.trim() || undefined,
        notes: notes.trim() || undefined,
        is_tax_deductible: taxDeductible,
        is_private_override: false,
        hide_from_feed: hideFromFeed,
      });

      if (result.error && !result.data) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      if (result.error && result.data) {
        toast.warning(result.error);
      }

      const totalCount = result.data?.total_count ?? 1;
      const celebrationKind = donationCelebrationKind(totalCount);
      if (celebrationKind === "first") celebrateFirstDonation();
      else if (celebrationKind === "milestone") celebrateMilestone();

      showCelebrationToast({
        numAmount,
        totalCount,
        isRecurringGift: isRecurring,
        orgName,
      });

      router.push("/donations");
    } catch (err) {
      console.error("Failed to save donation", err);
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "grid items-start gap-6",
        isEdit
          ? "mx-auto max-w-3xl"
          : "lg:grid-cols-[minmax(0,1fr)_320px]",
      )}
    >
      {/* ── Form card ─────────────────────────────────── */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* 1 · The gift */}
            <div>
              <span className={EYEBROW}>1 · The gift</span>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="organization">Organization</Label>
                  <OrganizationField
                    id="organization"
                    organization={organization}
                    setOrganization={setOrganization}
                    showSuggestions={showSuggestions}
                    setShowSuggestions={setShowSuggestions}
                    filteredSuggestions={filteredSuggestions}
                    placeholder="e.g. Trees for the Bay"
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <span
                      className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-muted-foreground"
                      aria-hidden
                    >
                      $
                    </span>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      placeholder="100.00"
                      value={amount}
                      onChange={(e) =>
                        setAmount(formatCurrencyInput(e.target.value))
                      }
                      className="pl-7 font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start font-mono font-normal"
                        />
                      }
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {format(donationDate, "MMM d, yyyy")}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={donationDate}
                        onSelect={(d) => d && setDonationDate(startOfDay(d))}
                        defaultMonth={donationDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="cause">Cause</Label>
                  <Select
                    value={causeTag}
                    onValueChange={(v) => setCauseTag((v ?? "") as CauseTag | "")}
                  >
                    <SelectTrigger id="cause" className="w-full">
                      <SelectValue placeholder="Select a cause" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {CAUSE_TAGS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* 2 · Reach */}
            <div>
              <span className={EYEBROW}>2 · Reach</span>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {SCOPE_OPTIONS.map((opt) => {
                  const active = scope === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScope(opt.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active
                          ? "border-brand bg-brand-soft"
                          : "border-border-strong bg-card hover:bg-muted",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px]",
                          active ? "text-green-700" : "text-muted-foreground",
                        )}
                        aria-hidden
                      />
                      <span className="font-medium text-text-strong">
                        {opt.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 3 · Details */}
            <div>
              <span className={EYEBROW}>3 · Details</span>
              <div className="mt-3 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notes">Note</Label>
                    <span className="text-xs text-text-faint">Optional</span>
                  </div>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Why this cause matters to you…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customTag">Custom tag</Label>
                    <span className="text-xs text-text-faint">Optional</span>
                  </div>
                  <Input
                    id="customTag"
                    placeholder="e.g. 'Holiday giving' or 'In memory of…'"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                  />
                </div>

                {!isEdit && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <Label htmlFor="recurring">This repeats</Label>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          We&apos;ll queue each gift for you to confirm.
                        </p>
                      </div>
                      <Switch
                        id="recurring"
                        checked={isRecurring}
                        onCheckedChange={setIsRecurring}
                      />
                    </div>
                    {isRecurring && (
                      <div className="space-y-1.5">
                        <Label htmlFor="frequency">How often?</Label>
                        <Select
                          value={frequency}
                          onValueChange={(v) =>
                            setFrequency(v as RecurringFrequency)
                          }
                        >
                          <SelectTrigger id="frequency" className="w-full sm:w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map(({ value, label }) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="taxDeductible">Tax deductible</Label>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Counts toward your deductible giving.
                    </p>
                  </div>
                  <Switch
                    id="taxDeductible"
                    checked={taxDeductible}
                    onCheckedChange={setTaxDeductible}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="hideFromFeed">Hide from feed</Label>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Keeps this gift off the feed, even if your privacy tier
                      would normally show it.
                    </p>
                  </div>
                  <Switch
                    id="hideFromFeed"
                    checked={hideFromFeed}
                    onCheckedChange={setHideFromFeed}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Footer */}
            <div className="flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Save donation"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* ── Right rail (create only) ──────────────────── */}
      {!isEdit && (
        <div className="grid gap-4 lg:sticky lg:top-6">
          <Card className="bg-brand-soft shadow-none ring-brand/15">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-green-700">
                After saving
              </span>
              <p className="text-sm text-green-900">
                {organization.trim() || "This gift"} adds{" "}
                <strong className="font-mono">
                  ${liveAmount.toLocaleString("en-US")}
                </strong>{" "}
                to your <span className="font-mono">{currentYear}</span> total.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Org autocomplete ───────────────────────────────────────

interface OrgFieldProps {
  id: string;
  organization: string;
  setOrganization: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  filteredSuggestions: string[];
  placeholder: string;
}

function OrganizationField({
  id,
  organization,
  setOrganization,
  showSuggestions,
  setShowSuggestions,
  filteredSuggestions,
  placeholder,
}: OrgFieldProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={organization}
        onChange={(e) => {
          setOrganization(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // Delay so clicks on suggestions still register
          setTimeout(() => setShowSuggestions(false), 150);
        }}
        autoComplete="off"
        required
        aria-autocomplete="list"
        aria-expanded={showSuggestions && filteredSuggestions.length > 0}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg bg-popover shadow-md ring-1 ring-foreground/10"
        >
          {filteredSuggestions.map((org) => (
            <button
              key={org}
              type="button"
              role="option"
              aria-selected={false}
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
              onMouseDown={(e) => {
                e.preventDefault();
                setOrganization(org);
                setShowSuggestions(false);
              }}
            >
              {org}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
