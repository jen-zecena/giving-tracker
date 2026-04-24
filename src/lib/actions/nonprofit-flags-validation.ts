/**
 * Pure validation for the nonprofit_flags actions (DP-065). Lives in
 * its own file so the rules can be exercised by Node-side unit tests
 * without loading the "use server" module (which triggers Next's
 * server-only runtime and pulls in the Supabase client).
 *
 * Returns `null` when input is acceptable; otherwise a user-facing
 * error message ready to surface in a toast or form error.
 */

import type { NonprofitFlagReason, NonprofitFlagStatus } from "@/types";

/**
 * Description is the optional free-text field on a flag. We cap it so
 * a malicious caller can't write a megabyte of text past the form
 * (which already enforces this client-side). 1k chars is generous for
 * "explain your reasoning" — the schema column is `text` so there's
 * no DB-side cap.
 */
export const FLAG_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Admin notes are the moderator's writeup attached at status update.
 * Same cap as user descriptions — these surface in the admin queue UI
 * and we don't want any single row to dominate the list.
 */
export const FLAG_ADMIN_NOTES_MAX_LENGTH = 1000;

const ALL_REASONS: ReadonlyArray<NonprofitFlagReason> = [
  "fraud",
  "outdated",
  "duplicate",
  "inappropriate",
  "other",
];

const ALL_STATUSES: ReadonlyArray<NonprofitFlagStatus> = [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
];

/**
 * Validates `nonprofitId` at the action boundary. We accept any non-
 * empty string here — the FK constraint on insert catches a bogus uuid
 * and surfaces the right error message; doing a regex check would
 * duplicate that work and reject otherwise valid uuids if the format
 * ever shifts.
 */
export function validateNonprofitId(id: unknown): string | null {
  if (typeof id !== "string") return "A nonprofit id is required.";
  if (id.trim().length === 0) return "A nonprofit id is required.";
  return null;
}

export function validateFlagId(id: unknown): string | null {
  if (typeof id !== "string") return "A flag id is required.";
  if (id.trim().length === 0) return "A flag id is required.";
  return null;
}

export function validateReason(
  reason: unknown
): string | null {
  if (typeof reason !== "string") return "Please choose a reason.";
  if (!ALL_REASONS.includes(reason as NonprofitFlagReason)) {
    return "That reason isn't recognized.";
  }
  return null;
}

export function validateStatus(status: unknown): string | null {
  if (typeof status !== "string") return "A status is required.";
  if (!ALL_STATUSES.includes(status as NonprofitFlagStatus)) {
    return "That status isn't recognized.";
  }
  return null;
}

/**
 * Description is optional; the dialog renders it as a placeholder hint
 * ("Tell us more"). When provided we trim and length-cap it; an empty
 * trimmed string normalises to `null` so we don't store whitespace.
 */
export function normalizeDescription(
  description: unknown
): { value: string | null } | { error: string } {
  if (description === undefined || description === null) {
    return { value: null };
  }
  if (typeof description !== "string") {
    return { error: "Description must be text." };
  }
  const trimmed = description.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > FLAG_DESCRIPTION_MAX_LENGTH) {
    return {
      error: `Description must be ${FLAG_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { value: trimmed };
}

/**
 * Mirror of `normalizeDescription` for the admin-only `admin_notes`
 * column. Same shape so call sites stay symmetric.
 */
export function normalizeAdminNotes(
  notes: unknown
): { value: string | null } | { error: string } {
  if (notes === undefined || notes === null) {
    return { value: null };
  }
  if (typeof notes !== "string") {
    return { error: "Admin notes must be text." };
  }
  const trimmed = notes.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > FLAG_ADMIN_NOTES_MAX_LENGTH) {
    return {
      error: `Admin notes must be ${FLAG_ADMIN_NOTES_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { value: trimmed };
}
