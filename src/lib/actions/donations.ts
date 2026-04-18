"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Donation,
  DonationFormData,
  DonationScope,
  DonationStatus,
  CauseTag,
  RecurringFrequency,
} from "@/types";

// ── Types ──────────────────────────────────────────────────

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

export type DonationListFilters = {
  dateFrom?: string;
  dateTo?: string;
  scope?: DonationScope;
  causeTag?: CauseTag;
  status?: DonationStatus;
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ── Helpers ────────────────────────────────────────────────

function getNextDueDate(date: string, frequency: RecurringFrequency): string {
  const d = new Date(date + "T00:00:00");
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annually":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase: null, user: null };
  }

  return { supabase, user };
}

// ── Create ─────────────────────────────────────────────────

export type CreateDonationResult = {
  id: string;
  total_count: number; // total donations for this user (including the new one)
};

export async function createDonation(
  data: DonationFormData
): Promise<ActionResult<CreateDonationResult>> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!supabase || !user) {
    return { error: "You must be signed in to log a donation." };
  }

  if (!data.organization_name.trim()) {
    return { error: "Organization name is required." };
  }
  if (data.amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }
  if (!data.donation_date) {
    return { error: "Donation date is required." };
  }
  if (!data.scope) {
    return { error: "Scope is required." };
  }

  // Insert donation
  const { data: donation, error } = await supabase
    .from("donations")
    .insert({
      user_id: user.id,
      organization_name: data.organization_name.trim(),
      amount: data.amount,
      currency: "USD",
      donation_date: data.donation_date,
      scope: data.scope,
      cause_tag: data.cause_tag || null,
      custom_tag: data.custom_tag?.trim() || null,
      notes: data.notes?.trim() || null,
      is_tax_deductible: data.is_tax_deductible,
      is_recurring: data.is_recurring,
      status: data.is_recurring ? "pending" : "confirmed",
      is_private_override: data.is_private_override,
      hide_from_feed: data.hide_from_feed ?? false,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Failed to save donation: ${error.message}` };
  }

  // If recurring, create the recurring schedule
  if (data.is_recurring && data.frequency) {
    const { data: schedule, error: scheduleError } = await supabase
      .from("recurring_schedules")
      .insert({
        user_id: user.id,
        organization_name: data.organization_name.trim(),
        amount: data.amount,
        currency: "USD",
        frequency: data.frequency,
        cause_tag: data.cause_tag || null,
        custom_tag: data.custom_tag?.trim() || null,
        scope: data.scope,
        next_due_date: getNextDueDate(data.donation_date, data.frequency),
      })
      .select("id")
      .single();

    if (scheduleError || !schedule) {
      return {
        data: { id: donation.id, total_count: 0 },
        error: "Donation saved, but recurring schedule could not be created. Please set it up manually.",
      };
    }

    // Link the donation to the recurring schedule
    await supabase
      .from("donations")
      .update({ recurring_schedule_id: schedule.id })
      .eq("id", donation.id);
  }

  // Count donations for milestone toasts
  const { count } = await supabase
    .from("donations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return { data: { id: donation.id, total_count: count ?? 1 } };
}

// ── Organization autocomplete ──────────────────────────────

export async function getOrganizationSuggestions(): Promise<
  ActionResult<string[]>
> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!supabase || !user) {
    return { error: "You must be signed in." };
  }

  const { data, error } = await supabase
    .from("donations")
    .select("organization_name")
    .eq("user_id", user.id)
    .order("donation_date", { ascending: false })
    .limit(200);

  if (error) {
    return { error: `Failed to load organization history: ${error.message}` };
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const row of data ?? []) {
    const name = row.organization_name?.trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      unique.push(name);
    }
  }

  return { data: unique };
}

// ── Read (list with filters + pagination) ──────────────────

export async function getDonations(
  filters: DonationListFilters = {}
): Promise<ActionResult<PaginatedResult<Donation>>> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!supabase || !user) {
    return { error: "You must be signed in to view donations." };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query
  let query = supabase
    .from("donations")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("donation_date", { ascending: false })
    .range(from, to);

  if (filters.dateFrom) {
    query = query.gte("donation_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("donation_date", filters.dateTo);
  }
  if (filters.scope) {
    query = query.eq("scope", filters.scope);
  }
  if (filters.causeTag) {
    query = query.eq("cause_tag", filters.causeTag);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data: items, count, error } = await query;

  if (error) {
    return { error: `Failed to fetch donations: ${error.message}` };
  }

  const total = count ?? 0;

  return {
    data: {
      items: items ?? [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ── Read (single) ──────────────────────────────────────────

export async function getDonation(
  id: string
): Promise<ActionResult<Donation>> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!supabase || !user) {
    return { error: "You must be signed in to view this donation." };
  }

  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { error: "Donation not found." };
    }
    return { error: `Failed to fetch donation: ${error.message}` };
  }

  return { data };
}

// ── Update ─────────────────────────────────────────────────

export async function updateDonation(
  id: string,
  data: Partial<DonationFormData>
): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!supabase || !user) {
    return { error: "You must be signed in to update a donation." };
  }

  if (data.amount !== undefined && data.amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }
  if (data.organization_name !== undefined && !data.organization_name.trim()) {
    return { error: "Organization name is required." };
  }

  const updates: Record<string, unknown> = {};

  if (data.organization_name !== undefined)
    updates.organization_name = data.organization_name.trim();
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.donation_date !== undefined)
    updates.donation_date = data.donation_date;
  if (data.scope !== undefined) updates.scope = data.scope;
  if (data.cause_tag !== undefined)
    updates.cause_tag = data.cause_tag || null;
  if (data.custom_tag !== undefined)
    updates.custom_tag = data.custom_tag?.trim() || null;
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;
  if (data.is_tax_deductible !== undefined)
    updates.is_tax_deductible = data.is_tax_deductible;
  if (data.is_private_override !== undefined)
    updates.is_private_override = data.is_private_override;
  if (data.hide_from_feed !== undefined)
    updates.hide_from_feed = data.hide_from_feed;

  if (Object.keys(updates).length === 0) {
    return { error: "No fields to update." };
  }

  const { data: updated, error } = await supabase
    .from("donations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: `Failed to update donation: ${error.message}` };
  }

  if (!updated || updated.length === 0) {
    return { error: "Donation not found." };
  }

  return {};
}

// ── Delete ─────────────────────────────────────────────────

export async function deleteDonation(id: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!supabase || !user) {
    return { error: "You must be signed in to delete a donation." };
  }

  const { data: deleted, error } = await supabase
    .from("donations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: `Failed to delete donation: ${error.message}` };
  }

  if (!deleted || deleted.length === 0) {
    return { error: "Donation not found." };
  }

  return {};
}
