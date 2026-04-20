"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { RecurringSchedule } from "@/types";

import {
  parseCreateRecurring,
  parseUpdateRecurring,
} from "./recurring-validation";

export type ActionResult<T = null> = { error?: string; data?: T };

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function invalidate() {
  // Recurring schedules feed into the donations page (pending rows once
  // DP-051 runs) and will power the recurring-management page (DP-052).
  revalidatePath("/donations");
  revalidatePath("/recurring");
}

// ── Create ────────────────────────────────────────────────

export async function createRecurringSchedule(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseCreateRecurring(input);
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase!
    .from("recurring_schedules")
    .insert({
      user_id: user.id,
      organization_name: parsed.data.organization_name,
      amount: parsed.data.amount,
      currency: "USD",
      frequency: parsed.data.frequency,
      cause_tag: parsed.data.cause_tag,
      custom_tag: parsed.data.custom_tag,
      scope: parsed.data.scope,
      next_due_date: parsed.data.next_due_date,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `Failed to create schedule: ${error?.message ?? "unknown error"}` };
  }

  invalidate();
  return { data: { id: data.id as string } };
}

// ── List / Get ────────────────────────────────────────────

export async function listRecurringSchedules(): Promise<
  ActionResult<RecurringSchedule[]>
> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase!
    .from("recurring_schedules")
    .select("*")
    .eq("user_id", user.id)
    .order("next_due_date", { ascending: true });

  if (error) return { error: `Failed to load schedules: ${error.message}` };
  return { data: (data ?? []) as RecurringSchedule[] };
}

export async function getRecurringSchedule(
  id: string
): Promise<ActionResult<RecurringSchedule>> {
  if (!id) return { error: "Missing schedule id." };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase!
    .from("recurring_schedules")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: `Failed to load schedule: ${error.message}` };
  if (!data) return { error: "Schedule not found." };
  return { data: data as RecurringSchedule };
}

// ── Update ────────────────────────────────────────────────

export async function updateRecurringSchedule(
  id: string,
  input: unknown
): Promise<ActionResult> {
  if (!id) return { error: "Missing schedule id." };

  const parsed = parseUpdateRecurring(input);
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }

  const { data, error } = await supabase!
    .from("recurring_schedules")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { error: `Failed to update schedule: ${error.message}` };
  if (!data || data.length === 0) return { error: "Schedule not found." };

  invalidate();
  return {};
}

// ── Delete ────────────────────────────────────────────────

export async function deleteRecurringSchedule(
  id: string
): Promise<ActionResult> {
  if (!id) return { error: "Missing schedule id." };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase!
    .from("recurring_schedules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) return { error: `Failed to delete schedule: ${error.message}` };
  if (!data || data.length === 0) return { error: "Schedule not found." };

  invalidate();
  return {};
}

// ── Pause / Resume ────────────────────────────────────────

async function setActiveFlag(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  if (!id) return { error: "Missing schedule id." };

  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase!
    .from("recurring_schedules")
    .update({ is_active })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    const verb = is_active ? "resume" : "pause";
    return { error: `Failed to ${verb} schedule: ${error.message}` };
  }
  if (!data || data.length === 0) return { error: "Schedule not found." };

  invalidate();
  return {};
}

export async function pauseRecurringSchedule(id: string): Promise<ActionResult> {
  return setActiveFlag(id, false);
}

export async function resumeRecurringSchedule(id: string): Promise<ActionResult> {
  return setActiveFlag(id, true);
}
