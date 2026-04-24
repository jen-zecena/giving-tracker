"use server";

/**
 * Server actions for `nonprofit_flags` (DP-065).
 *
 * Surfaces:
 *   - `createNonprofitFlag` — any signed-in user reports a nonprofit.
 *     The DP-061 NonprofitDetail flag dialog is the primary caller.
 *   - `listFlagsForNonprofit` — RLS naturally limits results: a normal
 *     user only sees flags they themselves filed; an admin sees all.
 *     Used by the detail page to show "you've already reported this."
 *   - `listFlagsByStatus` — admin queue view (DP-062).
 *   - `updateFlagStatus` — admin moderation. The action enforces the
 *     admin check on top of the RLS update policy as defence in depth:
 *     if a future migration relaxes the policy by mistake, this layer
 *     still rejects non-admin writes.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { NonprofitFlag, NonprofitFlagStatus } from "@/types";

import {
  normalizeAdminNotes,
  normalizeDescription,
  validateFlagId,
  validateNonprofitId,
  validateReason,
  validateStatus,
} from "./nonprofit-flags-validation";

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

export type CreateFlagInput = {
  nonprofitId: string;
  reason: string;
  description?: string | null;
};

/**
 * Inserts a new flag attributed to the current user. The unique
 * constraint on (nonprofit_id, user_id) is *not* present in the schema
 * — DP-006 deliberately allows a user to file separate reports for
 * different reasons — so we don't try to deduplicate here.
 */
export async function createNonprofitFlag(
  input: CreateFlagInput
): Promise<ActionResult<{ flagId: string }>> {
  const nonprofitErr = validateNonprofitId(input?.nonprofitId);
  if (nonprofitErr) return { error: nonprofitErr };

  const reasonErr = validateReason(input?.reason);
  if (reasonErr) return { error: reasonErr };

  const description = normalizeDescription(input?.description);
  if ("error" in description) return { error: description.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to flag a nonprofit." };

  const { data, error } = await supabase
    .from("nonprofit_flags")
    .insert({
      nonprofit_id: input.nonprofitId,
      user_id: user.id,
      reason: input.reason,
      description: description.value,
    })
    .select("id")
    .single();

  if (error) {
    // The most likely failure here is a bad nonprofit_id (FK violation).
    // We don't paraphrase the error so the dialog can surface the raw
    // message during development; in production the toast layer maps
    // these to friendlier copy.
    return { error: `Failed to file flag: ${error.message}` };
  }

  // Refresh the detail page so the "you've already reported" hint can
  // pick up the new row from the same fetch the page already does.
  revalidatePath(`/nonprofits/${input.nonprofitId}`);
  // And the admin queue, if an admin happens to be viewing it.
  revalidatePath("/admin/review-queue");

  return { data: { flagId: data.id } };
}

/**
 * Returns the flags the current user is allowed to see for a single
 * nonprofit. RLS does the heavy lifting (own rows + admin sees all);
 * the action just normalises the input and returns rows in newest-
 * first order.
 */
export async function listFlagsForNonprofit(
  nonprofitId: string
): Promise<ActionResult<NonprofitFlag[]>> {
  const err = validateNonprofitId(nonprofitId);
  if (err) return { error: err };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase
    .from("nonprofit_flags")
    .select("*")
    .eq("nonprofit_id", nonprofitId)
    .order("created_at", { ascending: false });

  if (error) return { error: `Failed to load flags: ${error.message}` };
  return { data: (data ?? []) as NonprofitFlag[] };
}

/**
 * Admin-only listing for the moderation queue. The defence-in-depth
 * admin check means a non-admin caller gets a clean error message
 * instead of a silent empty list (RLS would just return no rows).
 */
export async function listFlagsByStatus(
  status: NonprofitFlagStatus
): Promise<ActionResult<NonprofitFlag[]>> {
  const err = validateStatus(status);
  if (err) return { error: err };

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
  if (!profile?.is_admin) {
    return { error: "Admins only." };
  }

  const { data, error } = await supabase
    .from("nonprofit_flags")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return { error: `Failed to load flags: ${error.message}` };
  return { data: (data ?? []) as NonprofitFlag[] };
}

export type UpdateFlagStatusInput = {
  flagId: string;
  status: NonprofitFlagStatus;
  adminNotes?: string | null;
};

/**
 * Admin moderation update. Enforces the admin check in TS *and* relies
 * on the RLS update policy (`public.is_admin()`) as a second layer.
 * Returns the updated row so callers can update local UI state without
 * a re-fetch.
 */
export async function updateFlagStatus(
  input: UpdateFlagStatusInput
): Promise<ActionResult<NonprofitFlag>> {
  const flagErr = validateFlagId(input?.flagId);
  if (flagErr) return { error: flagErr };

  const statusErr = validateStatus(input?.status);
  if (statusErr) return { error: statusErr };

  const notes = normalizeAdminNotes(input?.adminNotes);
  if ("error" in notes) return { error: notes.error };

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
  if (!profile?.is_admin) {
    return { error: "Admins only." };
  }

  const { data, error } = await supabase
    .from("nonprofit_flags")
    .update({
      status: input.status,
      admin_notes: notes.value,
    })
    .eq("id", input.flagId)
    .select("*")
    .single();

  if (error) return { error: `Failed to update flag: ${error.message}` };
  if (!data) return { error: "Flag not found." };

  revalidatePath("/admin/review-queue");
  revalidatePath(`/nonprofits/${data.nonprofit_id}`);

  return { data: data as NonprofitFlag };
}
