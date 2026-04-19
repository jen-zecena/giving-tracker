"use server";

import { revalidatePath } from "next/cache";

import { currentForGoal, type DonationRowForGoal } from "@/lib/queries/goals-helpers";
import { createClient } from "@/lib/supabase/server";
import type { Goal } from "@/types";

import { parseCreateGoal, parseUpdateGoal } from "./goals-validation";

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function invalidateGoals() {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

/**
 * Fetches the user's confirmed donations in the shape the derivation
 * helpers want. Returned all-time because the widest goal timeframe is
 * `ongoing` — narrower timeframes filter in-memory via filterByTimeframe.
 * RLS (DP-007) prevents this from ever returning rows that don't belong
 * to the caller.
 */
async function fetchDonationsForDerivation(
  userId: string
): Promise<DonationRowForGoal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("donations")
    .select("amount, donation_date, organization_name, cause_tag, status")
    .eq("user_id", userId)
    .eq("status", "confirmed");
  return data ?? [];
}

// ── Create ────────────────────────────────────────────────

export async function createGoal(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const parsed = parseCreateGoal(input);
  if (!parsed.ok) return { error: parsed.error };

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      target: parsed.data.target,
      timeframe: parsed.data.timeframe,
    })
    .select("id")
    .single();

  if (error) return { error: `Failed to create goal: ${error.message}` };

  invalidateGoals();
  return { data: { id: data.id } };
}

// ── List ──────────────────────────────────────────────────

export async function listGoals(): Promise<ActionResult<Goal[]>> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const [{ data: goals, error }, donations] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    fetchDonationsForDerivation(user.id),
  ]);

  if (error) return { error: `Failed to load goals: ${error.message}` };

  const now = new Date();
  const withCurrent = (goals ?? []).map((g) => ({
    ...g,
    current: currentForGoal(donations, g.type, g.timeframe, now),
  })) satisfies Goal[];

  return { data: withCurrent };
}

// ── Get single ────────────────────────────────────────────

export async function getGoal(id: string): Promise<ActionResult<Goal>> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data: goal, error } = await supabase
    .from("goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { error: "Goal not found." };
    return { error: `Failed to load goal: ${error.message}` };
  }

  const donations = await fetchDonationsForDerivation(user.id);
  return {
    data: {
      ...goal,
      current: currentForGoal(donations, goal.type, goal.timeframe, new Date()),
    },
  };
}

// ── Update ────────────────────────────────────────────────

export async function updateGoal(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const parsed = parseUpdateGoal(input);
  if (!parsed.ok) return { error: parsed.error };

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.target !== undefined) updates.target = parsed.data.target;
  if (parsed.data.timeframe !== undefined)
    updates.timeframe = parsed.data.timeframe;

  const { data: updated, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { error: `Failed to update goal: ${error.message}` };
  if (!updated || updated.length === 0) return { error: "Goal not found." };

  invalidateGoals();
  return {};
}

// ── Delete ────────────────────────────────────────────────

export async function deleteGoal(id: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data: deleted, error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { error: `Failed to delete goal: ${error.message}` };
  if (!deleted || deleted.length === 0) return { error: "Goal not found." };

  invalidateGoals();
  return {};
}
