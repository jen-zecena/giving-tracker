/**
 * Pure-input validators for the follow-request server actions (DP-041).
 * Extracted so they can be unit-tested without pulling the Supabase
 * clients (which are server-only).
 */

// RFC 4122 v1–v5 plus the nil UUID. Case-insensitive; hyphenated.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function parseUuid(
  input: unknown,
  fieldLabel = "id"
): ParseResult<string> {
  if (typeof input !== "string" || input.length === 0) {
    return { ok: false, error: `Missing ${fieldLabel}.` };
  }
  if (!UUID_RE.test(input)) {
    return { ok: false, error: `Invalid ${fieldLabel}.` };
  }
  return { ok: true, data: input };
}
