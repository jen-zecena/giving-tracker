/**
 * Pure helpers for the likes action (DP-042). Extracted from
 * `src/lib/actions/likes.ts` so they can be imported into Node-side
 * unit tests without loading the "use server" module, which triggers
 * Next's server-only runtime.
 */

/**
 * Resolves the human-readable actor name used in the "X liked your
 * donation" notification. Falls back to the email local-part, then to
 * a generic "Someone" if neither is available. Display names are
 * trimmed; all-whitespace names are treated as unset.
 */
export function resolveActorName(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;

  const local = email?.split("@")[0]?.trim();
  if (local) return local;

  return "Someone";
}

/**
 * Validates a donation id at the action boundary. Returns `null` when
 * valid, otherwise a user-facing error message.
 */
export function validateDonationId(id: unknown): string | null {
  if (typeof id !== "string") return "A donation id is required.";
  if (id.length === 0) return "A donation id is required.";
  return null;
}
