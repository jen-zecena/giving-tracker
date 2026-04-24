import type {
  CauseTag,
  DonationScope,
  RecurringFrequency,
  RecurringSchedule,
} from "@/types";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

export const FREQUENCY_OPTIONS: readonly {
  value: RecurringFrequency;
  label: string;
}[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (every 3 months)" },
  { value: "annually", label: "Annually" },
];

export const SCOPE_LABELS: Record<DonationScope, string> = {
  local: "Local",
  national: "National",
  global: "Global",
};

export const SCOPE_OPTIONS: readonly {
  value: DonationScope;
  label: string;
}[] = [
  { value: "local", label: "Local" },
  { value: "national", label: "National" },
  { value: "global", label: "Global" },
];

export const CAUSE_TAG_OPTIONS: readonly {
  value: CauseTag;
  label: string;
}[] = [
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

export const CAUSE_TAG_LABELS: Record<CauseTag, string> = Object.fromEntries(
  CAUSE_TAG_OPTIONS.map((o) => [o.value, o.label])
) as Record<CauseTag, string>;

/**
 * Pastel background class for the frequency badge — cycles the four
 * metric-pastel tokens so the card has a visual anchor even in dense
 * list views. Pure so it can be unit-tested without rendering.
 */
export function frequencyBgClass(frequency: RecurringFrequency): string {
  switch (frequency) {
    case "weekly":
      return "bg-metric-yellow";
    case "monthly":
      return "bg-metric-purple";
    case "quarterly":
      return "bg-metric-blue";
    case "annually":
      return "bg-metric-green";
  }
}

/**
 * Sort helper: active schedules first (soonest-due first within actives),
 * then paused schedules (also soonest-due first). Matches the "what
 * needs my attention now" framing of the management page.
 */
export function sortSchedulesForList(
  schedules: RecurringSchedule[]
): RecurringSchedule[] {
  return [...schedules].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.next_due_date.localeCompare(b.next_due_date);
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDueDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
