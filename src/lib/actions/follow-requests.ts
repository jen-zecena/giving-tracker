"use server";

import { revalidatePath } from "next/cache";

import { notifyMilestone } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { FollowRequest } from "@/types";

import { parseUuid } from "./follow-requests-validation";

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

/**
 * Enriched pending-request row. `from_display_name` / `from_avatar_url`
 * come from the sender's profile, fetched via the service-role client
 * so the recipient can render an accept/reject card even when their
 * RLS view of the sender's profile is blocked (e.g. the sender is
 * `friends_only` and the recipient isn't following them yet).
 */
export type PendingRequest = FollowRequest & {
  from_display_name: string | null;
  from_avatar_url: string | null;
};

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function invalidateSocial() {
  // Discover lists pending requests; Profile shows follower counts once
  // DP-047 lands. Feed follows relationships. Revalidate all three so
  // UI reflects the change immediately.
  revalidatePath("/discover");
  revalidatePath("/feed");
  revalidatePath("/profile");
}

// ── List pending (for the current user as recipient) ──────

export async function getPendingRequests(): Promise<
  ActionResult<PendingRequest[]>
> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data: requests, error } = await supabase
    .from("follow_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .eq("to_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: `Failed to load pending requests: ${error.message}` };
  }
  if (!requests || requests.length === 0) return { data: [] };

  const senderIds = Array.from(
    new Set(requests.map((r) => r.from_user_id as string))
  );

  const adminClient = createServiceRoleClient();
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", senderIds);

  const profileById = new Map<
    string,
    { display_name: string | null; avatar_url: string | null }
  >(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        display_name: (p.display_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      },
    ])
  );

  const enriched: PendingRequest[] = requests.map((r) => {
    const profile = profileById.get(r.from_user_id as string);
    return {
      ...(r as FollowRequest),
      from_display_name: profile?.display_name ?? null,
      from_avatar_url: profile?.avatar_url ?? null,
    };
  });

  return { data: enriched };
}

// ── Check whether current user has already requested `targetId` ──

export async function hasPendingRequest(
  targetId: string
): Promise<ActionResult<boolean>> {
  const parsed = parseUuid(targetId, "target id");
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { count, error } = await supabase
    .from("follow_requests")
    .select("id", { count: "exact", head: true })
    .eq("from_user_id", user.id)
    .eq("to_user_id", parsed.data)
    .eq("status", "pending");

  if (error) {
    return { error: `Failed to check pending request: ${error.message}` };
  }
  return { data: (count ?? 0) > 0 };
}

// ── Accept ────────────────────────────────────────────────

export async function acceptRequest(
  requestId: string
): Promise<ActionResult> {
  const parsed = parseUuid(requestId, "request id");
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  // Load the request to confirm the caller is the recipient and it's
  // still pending. Without this the caller could issue an update
  // against a request they never had the right to see — RLS blocks
  // reads, so `maybeSingle` returns null in that case.
  const { data: req, error: loadErr } = await supabase
    .from("follow_requests")
    .select("id, from_user_id, to_user_id, status")
    .eq("id", parsed.data)
    .maybeSingle();

  if (loadErr) {
    return { error: `Failed to load request: ${loadErr.message}` };
  }
  if (!req) return { error: "Request not found." };
  if (req.to_user_id !== user.id) {
    return { error: "Only the recipient can accept this request." };
  }
  if (req.status !== "pending") {
    return { error: "Request is no longer pending." };
  }

  // Mark accepted. RLS on follow_requests_update further guarantees
  // only the recipient can succeed here.
  const { error: updateErr } = await supabase
    .from("follow_requests")
    .update({ status: "accepted" })
    .eq("id", parsed.data)
    .eq("status", "pending");

  if (updateErr) {
    return { error: `Failed to accept request: ${updateErr.message}` };
  }

  // Insert the follow row. `follows_insert` RLS requires
  // `auth.uid() = follower_id`, but the follower here is the sender —
  // so we use the service-role client. Treat a unique-key conflict as
  // success so double-accepts are idempotent.
  const adminClient = createServiceRoleClient();
  const { error: insertErr } = await adminClient.from("follows").insert({
    follower_id: req.from_user_id,
    following_id: req.to_user_id,
  });
  if (insertErr && insertErr.code !== "23505") {
    return {
      error: `Failed to create follow relationship: ${insertErr.message}`,
    };
  }

  // Notify the sender that their request was accepted. Use the
  // milestone helper (generic title/message) rather than notifyFollow,
  // since "X started following you" would read backwards for the
  // sender — they wanted to follow, not be followed.
  const { data: recipientProfile } = await adminClient
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const recipientName =
    (recipientProfile?.display_name as string | null) ?? "Someone";

  await notifyMilestone({
    userId: req.from_user_id,
    title: "Follow request accepted",
    message: `${recipientName} accepted your follow request`,
    actionUrl: `/profile/${user.id}`,
    metadata: {
      actor_id: user.id,
      request_id: req.id,
      kind: "follow_request_accepted",
    },
  });

  invalidateSocial();
  return {};
}

// ── Reject ────────────────────────────────────────────────

export async function rejectRequest(
  requestId: string
): Promise<ActionResult> {
  const parsed = parseUuid(requestId, "request id");
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data: updated, error } = await supabase
    .from("follow_requests")
    .update({ status: "rejected" })
    .eq("id", parsed.data)
    .eq("to_user_id", user.id)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return { error: `Failed to reject request: ${error.message}` };
  }
  if (!updated || updated.length === 0) {
    return { error: "Request not found or not pending." };
  }

  invalidateSocial();
  return {};
}
