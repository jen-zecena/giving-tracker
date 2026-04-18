"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Heart,
  ListChecks,
  Lock,
  PieChart,
  Shield,
  Users,
} from "lucide-react";
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
import { completeOnboarding } from "@/lib/actions/profile";
import type { PrivacyTier } from "@/types";

type Step = "welcome" | "name" | "salary" | "privacy";

const STEPS: readonly Step[] = ["welcome", "name", "salary", "privacy"];

type PrivacyOption = {
  value: PrivacyTier;
  label: string;
  description: string;
  icon: typeof Shield;
};

const PRIVACY_OPTIONS: readonly PrivacyOption[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you can see your donations and activity.",
    icon: Shield,
  },
  {
    value: "friends_only",
    label: "Friends Only",
    description: "People you approve can see your activity. Amounts hidden by default.",
    icon: Users,
  },
  {
    value: "open_giver",
    label: "Open Giver",
    description: "Publicly discoverable. Inspire others with your giving.",
    icon: Globe,
  },
];

export function OnboardingWizard({
  initialDisplayName,
}: {
  initialDisplayName?: string | null;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [salary, setSalary] = useState<string>("");
  const [privacyTier, setPrivacyTier] = useState<PrivacyTier>("private");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canGoNext = useMemo(() => {
    if (step === "name") return displayName.trim().length > 0;
    return true;
  }, [step, displayName]);

  function goBack() {
    setError(null);
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function goNext() {
    setError(null);
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function submit() {
    setError(null);
    const trimmed = displayName.trim();
    if (!trimmed) {
      setStep("name");
      setError("Please enter your name.");
      return;
    }

    const salaryNumber = salary.trim() === "" ? null : Number(salary);
    if (salaryNumber !== null && (!Number.isFinite(salaryNumber) || salaryNumber < 0)) {
      setStep("salary");
      setError("Salary must be a positive number.");
      return;
    }

    startTransition(async () => {
      const res = await completeOnboarding({
        display_name: trimmed,
        salary: salaryNumber,
        privacy_tier: privacyTier,
      });
      if (res?.error) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 rounded-full bg-muted"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </span>
      </div>

      <Card>
        {step === "welcome" && <WelcomeStep />}
        {step === "name" && (
          <NameStep value={displayName} onChange={setDisplayName} />
        )}
        {step === "salary" && (
          <SalaryStep value={salary} onChange={setSalary} />
        )}
        {step === "privacy" && (
          <PrivacyStep value={privacyTier} onChange={setPrivacyTier} />
        )}

        <CardContent className="flex flex-col gap-3">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={stepIndex === 0 || pending}
              className={stepIndex === 0 ? "invisible" : undefined}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Back
            </Button>

            {step === "privacy" ? (
              <Button type="button" onClick={submit} disabled={pending}>
                {pending ? "Saving..." : "Complete"}
                <Check className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={goNext}
                disabled={!canGoNext || pending}
              >
                {step === "welcome" ? "Get started" : "Continue"}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Step: Welcome ────────────────────────────────────────────

function WelcomeStep() {
  const features = [
    {
      icon: ListChecks,
      title: "Track every donation",
      description: "One place for every gift, recurring schedule, and receipt.",
    },
    {
      icon: PieChart,
      title: "Visualize your giving",
      description: "See trends, causes, and impact over time.",
    },
    {
      icon: Lock,
      title: "You choose who sees it",
      description: "Keep it private, share with friends, or inspire the world.",
    },
  ];

  return (
    <>
      <CardHeader className="text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"
          aria-hidden="true"
        >
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl tracking-tight">
          Welcome to Giving Tracker
        </CardTitle>
        <CardDescription>
          Let&apos;s set up your account in just a few steps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-4">
          {features.map((feature, i) => (
            <li
              key={feature.title}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs text-accent-foreground"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              <feature.icon
                className="mt-0.5 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
            </li>
          ))}
        </ol>
      </CardContent>
    </>
  );
}

// ── Step: Name ───────────────────────────────────────────────

function NameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl tracking-tight">
          What should we call you?
        </CardTitle>
        <CardDescription>
          This shows on your profile and when friends see your giving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            autoComplete="name"
            autoFocus
            placeholder="e.g. Alex Rivera"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={60}
            required
          />
        </div>
      </CardContent>
    </>
  );
}

// ── Step: Salary ─────────────────────────────────────────────

function SalaryStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl tracking-tight">
          Annual income (optional)
        </CardTitle>
        <CardDescription>
          Share your income so we can show what percentage you give. You can
          skip this and add it later.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="salary">Annual income (USD)</Label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground"
              aria-hidden="true"
            >
              $
            </span>
            <Input
              id="salary"
              name="salary"
              type="number"
              inputMode="numeric"
              min={0}
              step="1000"
              placeholder="75,000"
              className="pl-7 font-mono"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          <Lock
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>
            Your salary is encrypted before it&apos;s saved and never shown to
            anyone &mdash; only the percentage you give (if you opt in).
          </p>
        </div>
      </CardContent>
    </>
  );
}

// ── Step: Privacy ────────────────────────────────────────────

function PrivacyStep({
  value,
  onChange,
}: {
  value: PrivacyTier;
  onChange: (value: PrivacyTier) => void;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl tracking-tight">
          Choose your privacy level
        </CardTitle>
        <CardDescription>
          You can change this anytime in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Privacy level"
          className="grid gap-3"
        >
          {PRIVACY_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(option.value)}
                className={[
                  "group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  "hover:border-primary/60 hover:bg-accent/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-accent"
                    : "border-border bg-card",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <span
                  className={[
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
