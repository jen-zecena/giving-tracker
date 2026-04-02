"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { createDonation } from "@/lib/actions/donations";
import type {
  DonationScope,
  CauseTag,
  RecurringFrequency,
} from "@/types";

const CAUSE_TAGS: { value: CauseTag; label: string }[] = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "environment", label: "Environment" },
  { value: "poverty", label: "Poverty" },
  { value: "animal_welfare", label: "Animal Welfare" },
  { value: "arts_culture", label: "Arts & Culture" },
  { value: "disaster_relief", label: "Disaster Relief" },
  { value: "human_rights", label: "Human Rights" },
  { value: "community", label: "Community" },
  { value: "religious", label: "Religious" },
];

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const SCOPES: { value: DonationScope; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "national", label: "National" },
  { value: "global", label: "Global" },
];

export default function NewDonationPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Required fields
  const [organizationName, setOrganizationName] = useState("");
  const [amount, setAmount] = useState("");
  const [donationDate, setDonationDate] = useState<Date>(new Date());
  const [scope, setScope] = useState<DonationScope | "">("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");

  // Optional fields
  const [causeTag, setCauseTag] = useState<CauseTag | "">("");
  const [customTag, setCustomTag] = useState("");
  const [notes, setNotes] = useState("");
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);
  const [isPrivateOverride, setIsPrivateOverride] = useState(false);

  const [error, setError] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  function formatCurrencyInput(value: string): string {
    // Strip everything except digits and decimal point
    const cleaned = value.replace(/[^\d.]/g, "");
    // Only allow one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts[1];
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + "." + parts[1].slice(0, 2);
    }
    return cleaned;
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCurrencyInput(e.target.value);
    setAmount(formatted);
  }

  function handleSubmit() {
    setError("");

    if (!organizationName.trim()) {
      setError("Organization name is required.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid donation amount.");
      return;
    }
    if (!scope) {
      setError("Please select a scope.");
      return;
    }

    startTransition(async () => {
      const result = await createDonation({
        organization_name: organizationName.trim(),
        amount: numAmount,
        donation_date: format(donationDate, "yyyy-MM-dd"),
        scope: scope as DonationScope,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : undefined,
        cause_tag: causeTag || null,
        custom_tag: customTag.trim() || undefined,
        notes: notes.trim() || undefined,
        is_tax_deductible: isTaxDeductible,
        is_private_override: isPrivateOverride,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      toast.success("Donation logged!", {
        description: `$${numAmount.toFixed(2)} to ${organizationName.trim()}`,
        action: {
          label: "Log another",
          onClick: () => {
            resetForm();
          },
        },
      });

      // Reset form for potential next entry
      resetForm();
    });
  }

  function resetForm() {
    setOrganizationName("");
    setAmount("");
    setDonationDate(new Date());
    setScope("");
    setIsRecurring(false);
    setFrequency("monthly");
    setCauseTag("");
    setCustomTag("");
    setNotes("");
    setIsTaxDeductible(false);
    setIsPrivateOverride(false);
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Log a Donation</CardTitle>
          <CardDescription>
            Record a charitable gift — takes under 30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5">
            {/* Organization name */}
            <div className="grid gap-2">
              <Label htmlFor="org">Organization *</Label>
              <Input
                id="org"
                placeholder="e.g. Red Cross"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger
                  className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <span>
                    {donationDate
                      ? format(donationDate, "MMM d, yyyy")
                      : "Pick a date"}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={donationDate}
                    onSelect={(date) => {
                      if (date) {
                        setDonationDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    defaultMonth={donationDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Scope */}
            <div className="grid gap-2">
              <Label>Scope *</Label>
              <div className="flex gap-2">
                {SCOPES.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={scope === value ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setScope(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring" className="cursor-pointer">
                Recurring donation
              </Label>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {/* Frequency (shown if recurring) */}
            {isRecurring && (
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(val) => setFrequency(val as RecurringFrequency)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
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

            {/* Cause tag */}
            <div className="grid gap-2">
              <Label>Cause category</Label>
              <Select value={causeTag} onValueChange={(val) => setCauseTag(val as CauseTag)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category (optional)" />
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

            {/* Custom tag (shown if cause tag selected) */}
            {causeTag && (
              <div className="grid gap-2">
                <Label htmlFor="customTag">Custom tag</Label>
                <Input
                  id="customTag"
                  placeholder="e.g. Local food bank"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Personal motivation or details (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Tax deductible */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="taxDeductible"
                checked={isTaxDeductible}
                onCheckedChange={(checked) =>
                  setIsTaxDeductible(checked === true)
                }
              />
              <Label htmlFor="taxDeductible" className="cursor-pointer text-sm">
                Tax-deductible
              </Label>
            </div>

            {/* Privacy override */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="privateOverride"
                checked={isPrivateOverride}
                onCheckedChange={(checked) =>
                  setIsPrivateOverride(checked === true)
                }
              />
              <Label
                htmlFor="privateOverride"
                className="cursor-pointer text-sm"
              >
                Hide this donation
              </Label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={pending}
              >
                {pending ? "Saving..." : "Save donation"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
