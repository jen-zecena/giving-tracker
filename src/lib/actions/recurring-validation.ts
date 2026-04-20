/**
 * Zod schemas for the recurring-schedule server actions.
 *
 * Split from `recurring.ts` because Next.js 16's `"use server"` files
 * can only export async functions — keeping the schemas alongside the
 * actions would get them flagged by the Turbopack server-action scanner
 * (same constraint as goals-validation.ts).
 */
import { z } from "zod";

export const recurringFrequencySchema = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "annually",
]);

export const donationScopeSchema = z.enum(["local", "national", "global"]);

export const causeTagSchema = z.enum([
  "education",
  "health",
  "environment",
  "poverty",
  "animal_welfare",
  "arts_culture",
  "disaster_relief",
  "human_rights",
  "community",
  "religious",
]);

const orgNameSchema = z
  .string()
  .trim()
  .min(1, "Organization name is required.")
  .max(120, "Organization name must be 120 characters or fewer.");

const amountSchema = z
  .number()
  .finite("Amount must be a finite number.")
  .positive("Amount must be greater than zero.");

// YYYY-MM-DD only. The full ISO string with a time component would make
// date arithmetic behave unpredictably across timezones. Validating in
// UTC so calendar validity doesn't drift with the caller's local zone
// (e.g. Feb 30 must fail everywhere, not just in GMT).
const isoDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format."
  )
  .refine(
    (v) => {
      const [y, m, d] = v.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === d
      );
    },
    { message: "Date is not a valid calendar date." }
  );

// CREATE: `cause_tag` / `custom_tag` are normalized to null when empty or
// missing — donations treats these as "no tag" rather than as two
// distinct states.
const createCauseTagSchema = causeTagSchema.nullish().transform((v) => v ?? null);

const createCustomTagSchema = z
  .string()
  .trim()
  .max(40, "Custom tag must be 40 characters or fewer.")
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

// UPDATE: keep undefined (unset) distinct from null (explicit clear).
const updateCauseTagSchema = causeTagSchema.nullable().optional();
const updateCustomTagSchema = z
  .string()
  .trim()
  .max(40, "Custom tag must be 40 characters or fewer.")
  .nullable()
  .optional()
  .transform((v) =>
    v === undefined ? undefined : v === null || v.length === 0 ? null : v
  );

export const createRecurringSchema = z.object({
  organization_name: orgNameSchema,
  amount: amountSchema,
  frequency: recurringFrequencySchema,
  cause_tag: createCauseTagSchema,
  custom_tag: createCustomTagSchema,
  scope: donationScopeSchema,
  next_due_date: isoDateSchema,
});

export const updateRecurringSchema = z.object({
  organization_name: orgNameSchema.optional(),
  amount: amountSchema.optional(),
  frequency: recurringFrequencySchema.optional(),
  cause_tag: updateCauseTagSchema,
  custom_tag: updateCustomTagSchema,
  scope: donationScopeSchema.optional(),
  next_due_date: isoDateSchema.optional(),
});

export type CreateRecurringInput = z.input<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.input<typeof updateRecurringSchema>;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function parseCreateRecurring(
  input: unknown
): ParseResult<z.output<typeof createRecurringSchema>> {
  const result = createRecurringSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: firstIssueMessage(result.error) };
  }
  return { ok: true, data: result.data };
}

export function parseUpdateRecurring(
  input: unknown
): ParseResult<z.output<typeof updateRecurringSchema>> {
  const result = updateRecurringSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: firstIssueMessage(result.error) };
  }
  const definedKeys = Object.entries(result.data).filter(
    ([, v]) => v !== undefined
  );
  if (definedKeys.length === 0) {
    return { ok: false, error: "No fields to update." };
  }
  return { ok: true, data: result.data };
}

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
