"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { encryptSalaryForDB } from "@/lib/salary";
import { createClient } from "@/lib/supabase/server";
import type { PrivacyTier, Profile } from "@/types";

import { validateSettings, type SettingsUpdate } from "./profile-validation";

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

export type OnboardingInput = {
  display_name: string;
  salary?: number | null;
  privacy_tier: PrivacyTier;
};

const VALID_TIERS: readonly PrivacyTier[] = [
  "private",
  "friends_only",
  "open_giver",
];

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ── Settings page (DP-015) ────────────────────────────────

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

// ── Onboarding wizard (DP-014) ────────────────────────────

export async function completeOnboarding(
  input: OnboardingInput
): Promise<ActionResult> {
  const display_name = input.display_name?.trim() ?? "";
  if (!display_name) {
    return { error: "Please enter your name." };
  }

  if (!VALID_TIERS.includes(input.privacy_tier)) {
    return { error: "Please choose a privacy level." };
  }

  const hasSalary =
    input.salary !== null && input.salary !== undefined && input.salary !== 0;
  if (hasSalary) {
    if (!Number.isFinite(input.salary) || (input.salary as number) < 0) {
      return { error: "Salary must be a positive number." };
    }
  }

  const { supabase, user } = await getAuthed();
  if (!user) {
    return { error: "You must be signed in to complete onboarding." };
  }

  const updates: Record<string, unknown> = {
    display_name,
    privacy_tier: input.privacy_tier,
    onboarding_completed: true,
  };

  if (hasSalary) {
    updates.salary_encrypted = encryptSalaryForDB(input.salary as number);
    updates.salary_updated_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: `Failed to save profile: ${error.message}` };
  }

  redirect("/dashboard");
}
