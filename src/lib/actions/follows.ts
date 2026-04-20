"use server";

import { revalidatePath } from "next/cache";

import { notifyFollow, notifyFollowRequest } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { PrivacyTier } from "@/types";

import {
  branchFollowByTier,
  validateFollowInput,
} from "./follows-validation";

export type ActionResult<T = null> = { error?: string; data?: T };

export type FollowOutcome = { kind: "follow" | "request" };

const UNIQUE_VIOLATION = "23505";

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Follow `targetId`. Branches on the target's privacy tier:
 *   - `open_giver`    → direct row in `follows`, emits `notifyFollow`
 *   - `friends_only`  → row in `follow_requests`, emits `notifyFollowRequest`
 *   - `private`       → returns an error; private profiles can't be followed
 *
 * Idempotent: following someone you already follow (or re-requesting a
 * pending friends-only request) returns success without duplicating rows
 * or emitting a second notification.
 *
 * Notification emission is best-effort — the follow/request persists
 * even if the notification insert fails, matching the DP-024 contract
 * that treats notifications as a side effect.
 */
export async function follow(
  targetId: string
): Promise<ActionResult<FollowOutcome>> {
  const { supabase, user } = await getAuthed();
  const inputError = validateFollowInput(user?.id, targetId);
  if (inputError) return { error: inputError };

  // Target's privacy_tier isn't readable via the authenticated client for
  // `friends_only`/`private` profiles (that's the whole point of RLS), so
  // look it up via the service-role client. One field, no PII.
  const admin = createServiceRoleClient();
  const { data: targetRow, error: targetErr } = await admin
    .from("profiles")
    .select("id, display_name, privacy_tier")
    .eq("id", targetId)
    .maybeSingle();

  if (targetErr) {
    return { error: `Failed to look up target profile: ${targetErr.message}` };
  }
  if (!targetRow) {
    return { error: "User not found." };
  }

  const branch = branchFollowByTier(targetRow.privacy_tier as PrivacyTier);
  if (branch === "blocked") {
    return { error: "This profile is private and can't be followed." };
  }

  // Actor display_name for the notification message. Own profile is
  // always readable under the profiles_select policy.
  const { data: actorProfile } = await supabase!
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .maybeSingle();
  const actorName = actorProfile?.display_name ?? "Someone";

  if (branch === "follow") {
    const { error: insertErr } = await supabase!
      .from("follows")
      .insert({ follower_id: user!.id, following_id: targetId });

    // Unique-violation means we already follow this person — treat as
    // success so callers don't have to pre-check.
    if (insertErr && insertErr.code !== UNIQUE_VIOLATION) {
      return { error: `Failed to follow: ${insertErr.message}` };
    }

    if (!insertErr) {
      const emit = await notifyFollow({
        recipientUserId: targetId,
        actorUserId: user!.id,
        actorName,
      });
      if (emit.error) {
        console.warn("notifyFollow failed:", emit.error);
      }
    }

    revalidatePath(`/profile/${targetId}`);
    revalidatePath(`/profile/${user!.id}`);
    return { data: { kind: "follow" } };
  }

  // branch === "request"
  const { error: insertErr } = await supabase!
    .from("follow_requests")
    .insert({
      from_user_id: user!.id,
      to_user_id: targetId,
      status: "pending",
    });

  if (insertErr && insertErr.code !== UNIQUE_VIOLATION) {
    return { error: `Failed to request follow: ${insertErr.message}` };
  }

  if (!insertErr) {
    const emit = await notifyFollowRequest({
      recipientUserId: targetId,
      actorUserId: user!.id,
      actorName,
    });
    if (emit.error) {
      console.warn("notifyFollowRequest failed:", emit.error);
    }
  }

  revalidatePath(`/profile/${targetId}`);
  return { data: { kind: "request" } };
}

/**
 * Removes the follows row linking the current user to `targetId`.
 * Idempotent — unfollowing someone you don't follow is a no-op success.
 */
export async function unfollow(targetId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };
  if (!targetId) return { error: "Missing target user id." };

  const { error } = await supabase!
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (error) return { error: `Failed to unfollow: ${error.message}` };

  revalidatePath(`/profile/${targetId}`);
  revalidatePath(`/profile/${user.id}`);
  return {};
}

/**
 * True if the current user follows `targetId`. Returns `false` (not an
 * error) for unauthenticated callers — the typical UI caller is a view
 * component that just wants to decide whether to render "Follow" or
 * "Following", and a missing session shouldn't light up an error UI.
 */
export async function isFollowing(
  targetId: string
): Promise<ActionResult<boolean>> {
  if (!targetId) return { error: "Missing target user id." };
  const { supabase, user } = await getAuthed();
  if (!user) return { data: false };

  const { count, error } = await supabase!
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (error) return { error: `Failed to check follow status: ${error.message}` };
  return { data: (count ?? 0) > 0 };
}

/**
 * User ids that the current user follows.
 */
export async function getFollowingIds(): Promise<ActionResult<string[]>> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase!
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (error) return { error: `Failed to load following: ${error.message}` };
  return { data: (data ?? []).map((r) => r.following_id as string) };
}

/**
 * User ids that follow the current user.
 */
export async function getFollowerIds(): Promise<ActionResult<string[]>> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase!
    .from("follows")
    .select("follower_id")
    .eq("following_id", user.id);

  if (error) return { error: `Failed to load followers: ${error.message}` };
  return { data: (data ?? []).map((r) => r.follower_id as string) };
}
