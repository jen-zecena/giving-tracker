"use server";

import { revalidatePath } from "next/cache";

import { notifyLike } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

import { resolveActorName, validateDonationId } from "./likes-helpers";

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

export type ToggleLikeResult = {
  /** True when the row now exists (user just liked), false when removed. */
  liked: boolean;
};

/**
 * Toggles a like row for (current user, donationId). When liking for the
 * first time, emits a notification to the donation's owner via DP-024.
 * Self-likes are allowed but no notification is sent.
 *
 * Enforcement is a layered design: the UNIQUE (user_id, donation_id)
 * constraint plus the likes_insert / likes_delete RLS policies (DP-007)
 * guarantee at most one row per (user, donation) and prevent cross-user
 * writes even if this action were bypassed.
 */
export async function toggleLike(
  donationId: string
): Promise<ActionResult<ToggleLikeResult>> {
  const invalid = validateDonationId(donationId);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  // Existing row? Flip to unlike.
  const { data: existing, error: selectErr } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("donation_id", donationId)
    .maybeSingle();
  if (selectErr) {
    return { error: `Failed to check like state: ${selectErr.message}` };
  }

  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);
    if (error) return { error: `Failed to unlike: ${error.message}` };

    revalidatePath("/feed");
    revalidatePath(`/donations/${donationId}`);
    return { data: { liked: false } };
  }

  // Fetch the donation owner + organization name so we can insert and
  // (if owner !== actor) notify. RLS may hide the row — in which case
  // we can't like it at all; surface a clean error.
  const { data: donation, error: donationErr } = await supabase
    .from("donations")
    .select("user_id, organization_name")
    .eq("id", donationId)
    .maybeSingle();
  if (donationErr) {
    return { error: `Failed to load donation: ${donationErr.message}` };
  }
  if (!donation) {
    return { error: "Donation not found or not visible to you." };
  }

  const { error: insertErr } = await supabase.from("likes").insert({
    user_id: user.id,
    donation_id: donationId,
    donation_user_id: donation.user_id,
  });
  if (insertErr) {
    // Uniqueness race (user double-clicked): treat as idempotent like.
    if (insertErr.code === "23505") {
      return { data: { liked: true } };
    }
    return { error: `Failed to like: ${insertErr.message}` };
  }

  if (donation.user_id !== user.id) {
    const { data: actor } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const actorName = resolveActorName(actor?.display_name, user.email);

    // Fire and forget — a notification failure should not roll back the
    // like. notifyLike is a no-op when actor === recipient, but we've
    // already guarded that path above.
    await notifyLike({
      recipientUserId: donation.user_id,
      actorUserId: user.id,
      actorName,
      donationId,
      organizationName: donation.organization_name,
    });
  }

  revalidatePath("/feed");
  revalidatePath(`/donations/${donationId}`);
  return { data: { liked: true } };
}

/**
 * Whether the authenticated user has liked the given donation.
 * Returns `false` (not an error) for signed-out callers so UI can
 * render an unlit heart without branching.
 */
export async function hasLiked(donationId: string): Promise<boolean> {
  if (typeof donationId !== "string" || donationId.length === 0) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("donation_id", donationId)
    .maybeSingle();

  return !!data;
}

/**
 * Total likes for a donation. Runs against an authenticated client so
 * the SELECT policy on `likes` (authenticated-only) applies; unauthed
 * callers get `0` rather than an error.
 */
export async function getLikesCount(donationId: string): Promise<number> {
  if (typeof donationId !== "string" || donationId.length === 0) return 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("donation_id", donationId);

  return count ?? 0;
}
