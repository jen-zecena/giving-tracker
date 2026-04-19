/**
 * Zod schemas for Goals server-action inputs.
 *
 * Split into its own module because Next.js 16's `"use server"` files can
 * only export async functions — having the schemas alongside the server
 * actions would get them flagged by the Turbopack server-action scanner.
 */

import { z } from "zod";

export const goalTypeSchema = z.enum([
  "amount",
  "count",
  "organizations",
  "causes",
]);

export const goalTimeframeSchema = z.enum(["month", "year", "ongoing"]);

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(80, "Title must be 80 characters or fewer.");

const targetSchema = z
  .number()
  .finite("Target must be a finite number.")
  .positive("Target must be greater than zero.");

// Description normalizer for CREATE: "" / whitespace / missing → null,
// non-empty → trimmed. Kept out of the UPDATE schema because .partial()
// would run this transform on every patch (including empty patches), which
// would clear the description on updates that don't mention it.
const createDescriptionSchema = z
  .string()
  .trim()
  .max(280, "Description must be 280 characters or fewer.")
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

// For UPDATE: description is only present when the caller explicitly sends
// it. null clears, non-empty string sets, missing field leaves untouched.
const updateDescriptionSchema = z
  .string()
  .trim()
  .max(280, "Description must be 280 characters or fewer.")
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v === null || v.length === 0 ? null : v));

export const createGoalSchema = z.object({
  title: titleSchema,
  description: createDescriptionSchema,
  type: goalTypeSchema,
  target: targetSchema,
  timeframe: goalTimeframeSchema,
});

export const updateGoalSchema = z.object({
  title: titleSchema.optional(),
  description: updateDescriptionSchema,
  type: goalTypeSchema.optional(),
  target: targetSchema.optional(),
  timeframe: goalTimeframeSchema.optional(),
});

export type CreateGoalInput = z.input<typeof createGoalSchema>;
export type UpdateGoalInput = z.input<typeof updateGoalSchema>;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Runs the create schema and returns either the parsed data or an error
 * string suitable for surfacing in an ActionResult. Kept separate from
 * direct `.parse()` calls so the server actions can stay synchronous at
 * the validation boundary without try/catch noise.
 */
export function parseCreateGoal(
  input: unknown
): ParseResult<z.output<typeof createGoalSchema>> {
  const result = createGoalSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: firstIssueMessage(result.error) };
  }
  return { ok: true, data: result.data };
}

export function parseUpdateGoal(
  input: unknown
): ParseResult<z.output<typeof updateGoalSchema>> {
  const result = updateGoalSchema.safeParse(input);
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
