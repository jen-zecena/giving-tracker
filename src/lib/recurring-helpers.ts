import type { RecurringFrequency } from "@/types";

/**
 * Advance a YYYY-MM-DD date by one period of `frequency`. Pure, no
 * timezone gymnastics — anchored to midnight-local for predictable
 * month/year arithmetic. Returns a YYYY-MM-DD string.
 *
 * Extracted here (as opposed to living inside a server action) so the
 * cron handler (DP-051) and tests can use it without pulling in the
 * Supabase client or `server-only`.
 */
export function advanceDueDate(
  date: string,
  frequency: RecurringFrequency
): string {
  const d = new Date(date + "T00:00:00");
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annually":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}
