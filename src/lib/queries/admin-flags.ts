import "server-only";

/**
 * Admin-only data fetcher for the review queue (DP-062).
 *
 * Why a dedicated module rather than reusing `listFlagsByStatus`:
 *   - The page renders all three tabs (pending / reviewed / dismissed)
 *     from a single round-trip; status filtering happens in memory via
 *     `splitFlagsByTab`.
 *   - The card needs nonprofit name/EIN/location/verified and the
 *     reporter's display name. We load those alongside the flag rows
 *     so the page does one fetch instead of N+1.
 *   - Reporter display names come from `profiles`, which has FORCE RLS
 *     keyed on the row owner — even an admin can't read other rows
 *     through the anon client. The service-role client bypasses RLS so
 *     the moderator can see who filed each report. This module lives
 *     under `server-only` to make accidental client bundling fail at
 *     build time.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { NonprofitFlag } from "@/types";

import type { ReviewQueueFlag } from "./admin-flags-helpers";

export type ListReviewQueueResult =
  | { error: string }
  | { data: ReviewQueueFlag[] };

/**
 * Loads every flag the moderator can see, joined with the nonprofit and
 * the reporter's display name. Newest first.
 *
 * Enforces the admin check in code as defence in depth on top of the
 * RLS update policy enforced by `updateFlagStatus`. Returns `error` for
 * unauthenticated or non-admin callers so the page can render an
 * appropriate fallback rather than an empty list.
 */
export async function listFlagsForReviewQueue(): Promise<ListReviewQueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (profileErr) {
    return { error: `Failed to verify admin status: ${profileErr.message}` };
  }
  if (!profile?.is_admin) return { error: "Admins only." };

  // Step 1 — read every flag joined with the nonprofit columns the card
  // needs. Admin RLS already lets us read all flag rows; the join is
  // an inner select on the public `nonprofits` table.
  const { data: rawFlags, error: flagsErr } = await supabase
    .from("nonprofit_flags")
    .select(
      "id, nonprofit_id, user_id, reason, description, status, admin_notes, created_at, nonprofit:nonprofits!inner(id, name, ein, location, verified)"
    )
    .order("created_at", { ascending: false });

  if (flagsErr) {
    return { error: `Failed to load flags: ${flagsErr.message}` };
  }

  type RawRow = NonprofitFlag & {
    nonprofit:
      | {
          id: string;
          name: string;
          ein: string;
          location: string | null;
          verified: boolean;
        }
      | Array<{
          id: string;
          name: string;
          ein: string;
          location: string | null;
          verified: boolean;
        }>
      | null;
  };

  const rows = (rawFlags ?? []) as RawRow[];

  // Step 2 — look up reporter display names via the service-role client
  // to bypass `profiles` FORCE RLS (the moderator needs to see who
  // filed each report regardless of the reporter's privacy tier).
  const reporterIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const reporterNames = new Map<string, string | null>();
  if (reporterIds.length > 0) {
    const adminSupabase = createServiceRoleClient();
    const { data: profiles, error: profilesErr } = await adminSupabase
      .from("profiles")
      .select("id, display_name")
      .in("id", reporterIds);
    if (profilesErr) {
      return {
        error: `Failed to load reporter profiles: ${profilesErr.message}`,
      };
    }
    for (const p of (profiles ?? []) as Array<{
      id: string;
      display_name: string | null;
    }>) {
      reporterNames.set(p.id, p.display_name);
    }
  }

  const enriched: ReviewQueueFlag[] = rows.map((row) => {
    // Supabase types the joined relation as either a single object or
    // an array depending on the relationship cardinality; nonprofit_id
    // is a not-null FK so it's always exactly one row, but the typed
    // union forces us to normalise.
    const nonprofit = Array.isArray(row.nonprofit)
      ? (row.nonprofit[0] ?? null)
      : row.nonprofit;
    return {
      id: row.id,
      nonprofit_id: row.nonprofit_id,
      user_id: row.user_id,
      reason: row.reason,
      description: row.description,
      status: row.status,
      admin_notes: row.admin_notes,
      created_at: row.created_at,
      nonprofit,
      reporter_display_name: reporterNames.get(row.user_id) ?? null,
    };
  });

  return { data: enriched };
}
