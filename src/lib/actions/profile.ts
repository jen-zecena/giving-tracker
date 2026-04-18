"use server";

import { revalidatePath } from "next/cache";

import { encryptSalaryForDB } from "@/lib/salary";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

import { validateSettings, type SettingsUpdate } from "./profile-validation";

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

export type { SettingsUpdate };

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getProfile(): Promise<ActionResult<Profile>> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return { error: `Failed to load profile: ${error.message}` };
  return { data };
}

export async function updateSettings(
  data: SettingsUpdate
): Promise<ActionResult> {
  const { supabase, user } = await getAuthed();
  if (!user) return { error: "You must be signed in." };

  const validationError = validateSettings(data);
  if (validationError) return { error: validationError };

  const updates: Record<string, unknown> = {};
  if (data.display_name !== undefined)
    updates.display_name = data.display_name.trim();
  if (data.bio !== undefined) updates.bio = data.bio?.trim() || null;
  if (data.privacy_tier !== undefined) updates.privacy_tier = data.privacy_tier;

  if (data.salary !== undefined) {
    if (data.salary === null) {
      updates.salary_encrypted = null;
      updates.salary_updated_at = null;
    } else {
      updates.salary_encrypted = encryptSalaryForDB(data.salary);
      updates.salary_updated_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No fields to update." };
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: `Failed to save settings: ${error.message}` };

  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return {};
}
