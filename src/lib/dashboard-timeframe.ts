/**
 * Dashboard timeframe model — pure, DB-free, and unit-testable.
 *
 * The Dashboard's totals and breakdowns can be scoped to a selected
 * timeframe (1m / 3m / 6m / 1y / YTD / custom). The selection lives in the
 * URL (`?range=6m` or `?range=custom&from=…&to=…`) so it is shareable and
 * survives refresh. This module turns those raw params into an inclusive
 * `DateRange` and picks a sensible trend-chart granularity for the span.
 */

import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";

// ── Options ───────────────────────────────────────────────

export const TIMEFRAME_OPTIONS = [
  "1m",
  "3m",
  "6m",
  "1y",
  "ytd",
  "custom",
] as const;

export type TimeframeOption = (typeof TIMEFRAME_OPTIONS)[number];

export const DEFAULT_TIMEFRAME: TimeframeOption = "ytd";

export const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  "1m": "1 month",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
  ytd: "Year to date",
  custom: "Custom range",
};

export function isTimeframeOption(value: unknown): value is TimeframeOption {
  return (
    typeof value === "string" &&
    (TIMEFRAME_OPTIONS as readonly string[]).includes(value)
  );
}

// ── Date range ────────────────────────────────────────────

/** Inclusive [start, end] window as `yyyy-MM-dd` strings (matches donation_date). */
export interface DateRange {
  start: string;
  end: string;
}

export interface ResolvedTimeframe {
  /** Effective option — an invalid custom range falls back to the default. */
  option: TimeframeOption;
  range: DateRange;
  /** Echoed custom inputs so the selector can re-populate its date fields. */
  from?: string;
  to?: string;
  /** True when a `custom` selection was requested but the dates were invalid. */
  invalidCustom?: boolean;
}

function iso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? startOfDay(d) : null;
}

type RawParams = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Normalizes raw URL search params into a timeframe request. Unknown or
 * missing `range` values collapse to the default.
 */
export function parseTimeframeParams(params: RawParams): {
  option: TimeframeOption;
  from?: string;
  to?: string;
} {
  const raw = firstString(params.range);
  return {
    option: isTimeframeOption(raw) ? raw : DEFAULT_TIMEFRAME,
    from: firstString(params.from),
    to: firstString(params.to),
  };
}

/**
 * Turns a timeframe request into a concrete inclusive date window. Preset
 * ranges are trailing windows ending today; YTD starts Jan 1; a custom range
 * uses the supplied `from`/`to` (falling back to the default if invalid).
 */
export function resolveTimeframe(
  input: { option: TimeframeOption; from?: string; to?: string },
  now: Date = new Date()
): ResolvedTimeframe {
  const end = startOfDay(now);

  if (input.option === "custom") {
    const from = parseDateParam(input.from);
    const to = parseDateParam(input.to);
    if (from && to && from <= to) {
      return {
        option: "custom",
        range: { start: iso(from), end: iso(to) },
        from: iso(from),
        to: iso(to),
      };
    }
    // Invalid/incomplete custom range — degrade to the default preset.
    return { ...resolveTimeframe({ option: DEFAULT_TIMEFRAME }, now), invalidCustom: true };
  }

  let start: Date;
  switch (input.option) {
    case "1m":
      start = subMonths(end, 1);
      break;
    case "3m":
      start = subMonths(end, 3);
      break;
    case "6m":
      start = subMonths(end, 6);
      break;
    case "1y":
      start = subYears(end, 1);
      break;
    case "ytd":
    default:
      start = startOfYear(end);
      break;
  }

  return { option: input.option, range: { start: iso(start), end: iso(end) } };
}

// ── Trend chart granularity ───────────────────────────────

export type TrendGranularity = "day" | "week" | "month";

/**
 * Picks how finely to bucket the trend chart so short ranges don't collapse
 * to one or two points: daily for ≤ ~2 months, weekly for ≤ ~6 months,
 * monthly beyond that.
 */
export function trendGranularity(range: DateRange): TrendGranularity {
  const days = differenceInCalendarDays(
    parseISO(range.end),
    parseISO(range.start)
  );
  if (days <= 62) return "day";
  if (days <= 186) return "week";
  return "month";
}
