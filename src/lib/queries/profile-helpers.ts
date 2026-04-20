/**
 * Pure helpers for the /profile page. Keeping these here (not in
 * `profile.ts`) means tsx unit tests can import them without pulling
 * `server-only` / the service-role Supabase client transitively.
 */

import type { PrivacyTier } from "@/types";

export type ProfileSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  privacy_tier: PrivacyTier;
};

/**
 * Reorders a bag of profile summaries to match the given id order. The
 * id array comes from `follows` ordered by `created_at DESC`, but the
 * service-role `in()` query returns rows in arbitrary order. We want
 * newest-relationships-first in the UI, so rematch here.
 *
 * Ids without a matching summary are dropped — that only happens if a
 * profile row was deleted between the two queries, a race we can't
 * recover from.
 */
export function orderSummariesByIds(
  ids: ReadonlyArray<string>,
  summaries: ReadonlyArray<ProfileSummary>
): ProfileSummary[] {
  const byId = new Map(summaries.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is ProfileSummary => Boolean(p));
}
