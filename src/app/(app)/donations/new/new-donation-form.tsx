"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
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

import { createDonation } from "@/lib/actions/donations";
import type {
  CauseTag,
  DonationScope,
  RecurringFrequency,
} from "@/types";

const CAUSE_TAGS: { value: CauseTag; label: string }[] = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "environment", label: "Environment" },
  { value: "disaster_relief", label: "Disaster Relief" },
  { value: "poverty", label: "Poverty & Hunger" },
  { value: "community", label: "Community & Housing" },
  { value: "arts_culture", label: "Arts & Culture" },
  { value: "animal_welfare", label: "Animal Welfare" },
  { value: "human_rights", label: "Human Rights" },
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
}[] = [
  { value: "local", label: "Local", description: "In your community" },
  { value: "national", label: "National", description: "Across the country" },
  { value: "global", label: "Global", description: "International impact" },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysAgo(n: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
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

interface NewDonationFormProps {
  initialOrgs: string[];
}

export function NewDonationForm({ initialOrgs }: NewDonationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [isQuickMode, setIsQuickMode] = useState(true);

  // Required fields
  const [amount, setAmount] = useState("");
  const [organization, setOrganization] = useState("");
  const [donationDate, setDonationDate] = useState<Date>(startOfDay(new Date()));

  // Full mode fields
  const [scope, setScope] = useState<DonationScope>("local");
  const [causeTag, setCauseTag] = useState<CauseTag | "">("");
  const [customTag, setCustomTag] = useState("");
  const [notes, setNotes] = useState("");
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [hideFromFeed, setHideFromFeed] = useState(false);

  // Org autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredSuggestions = useMemo(
    () => filterOrgSuggestions(organization, initialOrgs),
    [organization, initialOrgs],
  );

  // Date preset helpers
  const today = startOfDay(new Date());
  const yesterday = daysAgo(1);
  const lastWeek = daysAgo(7);

  const isToday = isSameDay(donationDate, today);
  const isYesterday = isSameDay(donationDate, yesterday);
  const isLastWeek = isSameDay(donationDate, lastWeek);
  const isCustomDate = !isToday && !isYesterday && !isLastWeek;

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Hmm, that doesn't look right. Please enter a valid amount.");
      return;
    }
    if (!organization.trim()) {
      toast.error("Which organization did you support?");
      return;
    }
    if (!isQuickMode && !causeTag) {
      toast.error("Please select a cause category.");
      return;
    }

    const orgName = organization.trim();

    startTransition(async () => {
      const result = await createDonation({
        organization_name: orgName,
        amount: numAmount,
        donation_date: format(donationDate, "yyyy-MM-dd"),
        scope,
        is_recurring: isQuickMode ? false : isRecurring,
        frequency:
          !isQuickMode && isRecurring ? frequency : undefined,
        cause_tag: causeTag || null,
        custom_tag: isQuickMode ? undefined : customTag.trim() || undefined,
        notes: isQuickMode ? undefined : notes.trim() || undefined,
        is_tax_deductible: isQuickMode ? true : taxDeductible,
        is_private_override: false,
        hide_from_feed: isQuickMode ? false : hideFromFeed,
      });

      if (result.error && !result.data) {
        toast.error(result.error);
        return;
      }

      if (result.error && result.data) {
        toast.warning(result.error);
      }

      showCelebrationToast({
        numAmount,
        totalCount: result.data?.total_count ?? 1,
        isRecurringGift: !isQuickMode && isRecurring,
        orgName,
      });

      router.push("/donations");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Quick/Full toggle bar — purple gradient header */}
      <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-accent bg-gradient-to-r from-accent to-secondary p-4">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground">
            {isQuickMode ? "Quick Add" : "Full Details"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isQuickMode
              ? "Just the essentials — amount and organization"
              : "Add complete information about your donation"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsQuickMode((v) => !v)}
          className="whitespace-nowrap"
        >
          {isQuickMode ? "Add More Details" : "Use Quick Add"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isQuickMode ? (
              <QuickModeFields
                amount={amount}
                setAmount={(v) => setAmount(formatCurrencyInput(v))}
                organization={organization}
                setOrganization={setOrganization}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                filteredSuggestions={filteredSuggestions}
                initialOrgs={initialOrgs}
                donationDate={donationDate}
                setDonationDate={(d) => setDonationDate(startOfDay(d))}
                isToday={isToday}
                isYesterday={isYesterday}
                isLastWeek={isLastWeek}
                isCustomDate={isCustomDate}
              />
            ) : (
              <FullModeFields
                amount={amount}
                setAmount={(v) => setAmount(formatCurrencyInput(v))}
                organization={organization}
                setOrganization={setOrganization}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                filteredSuggestions={filteredSuggestions}
                donationDate={donationDate}
                setDonationDate={(d) => setDonationDate(startOfDay(d))}
                scope={scope}
                setScope={setScope}
                causeTag={causeTag}
                setCauseTag={setCauseTag}
                customTag={customTag}
                setCustomTag={setCustomTag}
                notes={notes}
                setNotes={setNotes}
                taxDeductible={taxDeductible}
                setTaxDeductible={setTaxDeductible}
                isRecurring={isRecurring}
                setIsRecurring={setIsRecurring}
                frequency={frequency}
                setFrequency={setFrequency}
                hideFromFeed={hideFromFeed}
                setHideFromFeed={setHideFromFeed}
              />
            )}

            {/* Submit buttons */}
            <div className="flex gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex-1"
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={pending}
              >
                {pending ? "Logging…" : "Log Donation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
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
  large?: boolean;
  placeholder: string;
  helpText?: string;
}

function OrganizationField({
  id,
  organization,
  setOrganization,
  showSuggestions,
  setShowSuggestions,
  filteredSuggestions,
  large,
  placeholder,
  helpText,
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
        className={large ? "h-12 text-lg" : undefined}
        autoComplete="off"
        required
        aria-autocomplete="list"
        aria-expanded={showSuggestions && filteredSuggestions.length > 0}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md"
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
      {helpText && (
        <p className="mt-2 text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

// ── Quick mode fields ──────────────────────────────────────

interface QuickModeProps {
  amount: string;
  setAmount: (v: string) => void;
  organization: string;
  setOrganization: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  filteredSuggestions: string[];
  initialOrgs: string[];
  donationDate: Date;
  setDonationDate: (d: Date) => void;
  isToday: boolean;
  isYesterday: boolean;
  isLastWeek: boolean;
  isCustomDate: boolean;
}

function QuickModeFields(props: QuickModeProps) {
  const {
    amount,
    setAmount,
    organization,
    setOrganization,
    showSuggestions,
    setShowSuggestions,
    filteredSuggestions,
    initialOrgs,
    donationDate,
    setDonationDate,
    isToday,
    isYesterday,
    isLastWeek,
    isCustomDate,
  } = props;

  return (
    <div className="space-y-5">
      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base">
          How much did you donate? *
        </Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 pl-7 text-lg"
            required
            aria-describedby="amount-help"
          />
        </div>
        <p id="amount-help" className="text-sm text-muted-foreground">
          Enter the donation amount in USD
        </p>
      </div>

      {/* Organization */}
      <div className="space-y-2">
        <Label htmlFor="organization" className="text-base">
          Which organization did you support? *
        </Label>
        <OrganizationField
          id="organization"
          organization={organization}
          setOrganization={setOrganization}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          filteredSuggestions={filteredSuggestions}
          large
          placeholder="Start typing to search…"
          helpText={
            initialOrgs.length > 0
              ? "We'll suggest organizations from your history"
              : "Enter any nonprofit or organization name"
          }
        />
      </div>

      {/* Date presets */}
      <div className="space-y-2">
        <Label className="text-base">When did you donate?</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isToday ? "default" : "outline"}
            size="sm"
            onClick={() => setDonationDate(new Date())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant={isYesterday ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setDonationDate(d);
            }}
          >
            Yesterday
          </Button>
          <Button
            type="button"
            variant={isLastWeek ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              setDonationDate(d);
            }}
          >
            Last Week
          </Button>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant={isCustomDate ? "default" : "outline"}
                  size="sm"
                />
              }
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Pick Date
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={donationDate}
                onSelect={(d) => d && setDonationDate(d)}
                defaultMonth={donationDate}
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-sm text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {format(donationDate, "MMMM d, yyyy")}
          </span>
        </p>
      </div>

      {/* Ready preview */}
      <div className="rounded-lg border border-accent bg-accent/30 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Ready to log your donation!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Log Donation&quot; below, or add more details if you&apos;d
              like.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full mode fields ──────────────────────────────────────

interface FullModeProps {
  amount: string;
  setAmount: (v: string) => void;
  organization: string;
  setOrganization: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  filteredSuggestions: string[];
  donationDate: Date;
  setDonationDate: (d: Date) => void;
  scope: DonationScope;
  setScope: (s: DonationScope) => void;
  causeTag: CauseTag | "";
  setCauseTag: (c: CauseTag | "") => void;
  customTag: string;
  setCustomTag: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  taxDeductible: boolean;
  setTaxDeductible: (v: boolean) => void;
  isRecurring: boolean;
  setIsRecurring: (v: boolean) => void;
  frequency: RecurringFrequency;
  setFrequency: (v: RecurringFrequency) => void;
  hideFromFeed: boolean;
  setHideFromFeed: (v: boolean) => void;
}

function FullModeFields(props: FullModeProps) {
  const {
    amount,
    setAmount,
    organization,
    setOrganization,
    showSuggestions,
    setShowSuggestions,
    filteredSuggestions,
    donationDate,
    setDonationDate,
    scope,
    setScope,
    causeTag,
    setCauseTag,
    customTag,
    setCustomTag,
    notes,
    setNotes,
    taxDeductible,
    setTaxDeductible,
    isRecurring,
    setIsRecurring,
    frequency,
    setFrequency,
    hideFromFeed,
    setHideFromFeed,
  } = props;

  return (
    <div className="space-y-6">
      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount-full">Amount (USD) *</Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="amount-full"
            inputMode="decimal"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7"
            required
          />
        </div>
      </div>

      {/* Organization */}
      <div className="space-y-2">
        <Label htmlFor="organization-full">Organization *</Label>
        <OrganizationField
          id="organization-full"
          organization={organization}
          setOrganization={setOrganization}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          filteredSuggestions={filteredSuggestions}
          placeholder="e.g., Red Cross, Local Food Bank"
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label>Date of Donation *</Label>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start font-normal"
              />
            }
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(donationDate, "PPP")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={donationDate}
              onSelect={(d) => d && setDonationDate(d)}
              defaultMonth={donationDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Cause */}
      <div className="space-y-2">
        <Label htmlFor="cause">What cause does this support? *</Label>
        <Select
          value={causeTag}
          onValueChange={(v) => setCauseTag(v as CauseTag)}
        >
          <SelectTrigger id="cause" className="w-full">
            <SelectValue placeholder="Select a cause" />
          </SelectTrigger>
          <SelectContent>
            {CAUSE_TAGS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scope — three button cards (consistent with existing pattern) */}
      <div className="space-y-2">
        <Label>Where does your donation help?</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCOPE_OPTIONS.map((opt) => {
            const active = scope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                aria-pressed={active}
                className={
                  "rounded-lg border p-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none " +
                  (active
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-muted")
                }
              >
                <div className="font-medium text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground">
                  {opt.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom tag */}
      <div className="space-y-2">
        <Label htmlFor="customTag">Custom Tag (optional)</Label>
        <Input
          id="customTag"
          placeholder="e.g., 'Holiday giving' or 'In memory of…'"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Add a personal tag to organize this donation
        </p>
      </div>

      {/* Tax deductible */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="space-y-0.5 pr-4">
          <Label className="text-base">Tax Deductible</Label>
          <p className="text-sm text-muted-foreground">
            Is this donation tax deductible?
          </p>
        </div>
        <Switch
          checked={taxDeductible}
          onCheckedChange={setTaxDeductible}
        />
      </div>

      {/* Recurring */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <Label className="text-base">Recurring Donation</Label>
            <p className="text-sm text-muted-foreground">
              We&apos;ll remind you to log it each cycle.
            </p>
          </div>
          <Switch
            checked={isRecurring}
            onCheckedChange={setIsRecurring}
          />
        </div>

        {isRecurring && (
          <div className="space-y-2 border-t border-border pt-3">
            <Label htmlFor="frequency">How often?</Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as RecurringFrequency)}
            >
              <SelectTrigger id="frequency" className="w-full">
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
            <p className="text-sm text-muted-foreground">
              💡 You&apos;ll receive a reminder to confirm each donation
            </p>
          </div>
        )}
      </div>

      {/* Hide from feed */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="space-y-0.5 pr-4">
          <Label className="text-base">Hide from feed</Label>
          <p className="text-sm text-muted-foreground">
            Keep this donation off the public feed, even if your privacy tier
            would normally show it.
          </p>
        </div>
        <Switch
          checked={hideFromFeed}
          onCheckedChange={setHideFromFeed}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Why did you give to this cause? What motivated you?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
