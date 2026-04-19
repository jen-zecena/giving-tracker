"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { encryptSalaryForDB } from "@/lib/salary";
import type { PrivacyTier } from "@/types";

export type ActionResult = {
  error?: string;
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
