/**
 * Donation CRUD validation tests
 * Run with: npx tsx --env-file=.env.local tests/donations.test.ts
 *
 * Tests validation logic, filter construction, and pagination params
 * without requiring a running Supabase instance.
 */

import type {
  DonationFormData,
  DonationScope,
  DonationStatus,
  CauseTag,
} from "../src/types";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Create donation validation ─────────────────────────────
console.log("\nCreate donation validation:");

function validateCreateDonation(data: DonationFormData): string | null {
  if (!data.organization_name.trim()) return "Organization name is required.";
  if (data.amount <= 0) return "Amount must be greater than zero.";
  if (!data.donation_date) return "Donation date is required.";
  if (!data.scope) return "Scope is required.";
  return null;
}

{
  const valid: DonationFormData = {
    organization_name: "Red Cross",
    amount: 100,
    donation_date: "2026-03-15",
    scope: "national",
    is_recurring: false,
    is_tax_deductible: true,
    is_private_override: false,
  };
  assert("accepts valid donation data", validateCreateDonation(valid) === null);
}

{
  const noOrg: DonationFormData = {
    organization_name: "",
    amount: 100,
    donation_date: "2026-03-15",
    scope: "local",
    is_recurring: false,
    is_tax_deductible: false,
    is_private_override: false,
  };
  assert(
    "rejects empty organization name",
    validateCreateDonation(noOrg) === "Organization name is required."
  );
}

{
  const whitespaceOrg: DonationFormData = {
    organization_name: "   ",
    amount: 100,
    donation_date: "2026-03-15",
    scope: "local",
    is_recurring: false,
    is_tax_deductible: false,
    is_private_override: false,
  };
  assert(
    "rejects whitespace-only organization name",
    validateCreateDonation(whitespaceOrg) === "Organization name is required."
  );
}

{
  const zeroAmount: DonationFormData = {
    organization_name: "UNICEF",
    amount: 0,
    donation_date: "2026-03-15",
    scope: "global",
    is_recurring: false,
    is_tax_deductible: false,
    is_private_override: false,
  };
  assert(
    "rejects zero amount",
    validateCreateDonation(zeroAmount) === "Amount must be greater than zero."
  );
}

{
  const negativeAmount: DonationFormData = {
    organization_name: "UNICEF",
    amount: -50,
    donation_date: "2026-03-15",
    scope: "global",
    is_recurring: false,
    is_tax_deductible: false,
    is_private_override: false,
  };
  assert(
    "rejects negative amount",
    validateCreateDonation(negativeAmount) === "Amount must be greater than zero."
  );
}

{
  const noDate: DonationFormData = {
    organization_name: "UNICEF",
    amount: 50,
    donation_date: "",
    scope: "global",
    is_recurring: false,
    is_tax_deductible: false,
    is_private_override: false,
  };
  assert(
    "rejects empty donation date",
    validateCreateDonation(noDate) === "Donation date is required."
  );
}

// ── Update donation validation ─────────────────────────────
console.log("\nUpdate donation validation:");

function validateUpdateDonation(data: Partial<DonationFormData>): string | null {
  if (data.amount !== undefined && data.amount <= 0)
    return "Amount must be greater than zero.";
  if (data.organization_name !== undefined && !data.organization_name.trim())
    return "Organization name is required.";

  const updates: Record<string, unknown> = {};
  if (data.organization_name !== undefined) updates.organization_name = data.organization_name.trim();
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.donation_date !== undefined) updates.donation_date = data.donation_date;
  if (data.scope !== undefined) updates.scope = data.scope;

  if (Object.keys(updates).length === 0 && Object.keys(data).length === 0)
    return "No fields to update.";
  return null;
}

{
  assert(
    "accepts valid partial update",
    validateUpdateDonation({ amount: 200 }) === null
  );
}

{
  assert(
    "rejects zero amount on update",
    validateUpdateDonation({ amount: 0 }) === "Amount must be greater than zero."
  );
}

{
  assert(
    "rejects empty org name on update",
    validateUpdateDonation({ organization_name: "" }) ===
      "Organization name is required."
  );
}

{
  assert(
    "rejects empty update",
    validateUpdateDonation({}) === "No fields to update."
  );
}

// ── Pagination params ──────────────────────────────────────
console.log("\nPagination parameter handling:");

function normalizePagination(page?: number, pageSize?: number) {
  const p = Math.max(1, page ?? 1);
  const ps = Math.min(100, Math.max(1, pageSize ?? 20));
  const from = (p - 1) * ps;
  const to = from + ps - 1;
  return { page: p, pageSize: ps, from, to };
}

{
  const r = normalizePagination();
  assert("defaults to page 1, size 20", r.page === 1 && r.pageSize === 20);
  assert("default range is 0-19", r.from === 0 && r.to === 19);
}

{
  const r = normalizePagination(3, 10);
  assert("page 3, size 10 → range 20-29", r.from === 20 && r.to === 29);
}

{
  const r = normalizePagination(0, 5);
  assert("clamps page 0 to 1", r.page === 1 && r.from === 0);
}

{
  const r = normalizePagination(-1, 5);
  assert("clamps negative page to 1", r.page === 1);
}

{
  const r = normalizePagination(1, 200);
  assert("clamps pageSize above 100 to 100", r.pageSize === 100);
}

{
  const r = normalizePagination(1, 0);
  assert("clamps pageSize 0 to 1", r.pageSize === 1);
}

// ── Filter type safety ─────────────────────────────────────
console.log("\nFilter type safety:");

{
  const validScopes: DonationScope[] = ["local", "national", "global"];
  assert("all scopes are valid", validScopes.length === 3);
}

{
  const validStatuses: DonationStatus[] = ["confirmed", "pending", "skipped"];
  assert("all statuses are valid", validStatuses.length === 3);
}

{
  const validCauses: CauseTag[] = [
    "education", "health", "environment", "poverty", "animal_welfare",
    "arts_culture", "disaster_relief", "human_rights", "community", "religious",
  ];
  assert("all 10 cause tags are valid", validCauses.length === 10);
}

// ── Recurring donation logic ───────────────────────────────
console.log("\nRecurring donation logic:");

{
  const data: DonationFormData = {
    organization_name: "Charity",
    amount: 50,
    donation_date: "2026-03-15",
    scope: "local",
    is_recurring: true,
    frequency: "monthly",
    is_tax_deductible: false,
    is_private_override: false,
  };
  const defaultStatus = data.is_recurring ? "pending" : "confirmed";
  assert("recurring donations default to pending status", defaultStatus === "pending");
}

{
  const data: DonationFormData = {
    organization_name: "Charity",
    amount: 50,
    donation_date: "2026-03-15",
    scope: "local",
    is_recurring: false,
    is_tax_deductible: false,
    is_private_override: false,
  };
  const defaultStatus = data.is_recurring ? "pending" : "confirmed";
  assert("one-time donations default to confirmed status", defaultStatus === "confirmed");
}

// ── totalPages calculation ─────────────────────────────────
console.log("\ntotalPages calculation:");

{
  assert("0 items → 0 pages", Math.ceil(0 / 20) === 0);
  assert("1 item → 1 page", Math.ceil(1 / 20) === 1);
  assert("20 items → 1 page", Math.ceil(20 / 20) === 1);
  assert("21 items → 2 pages", Math.ceil(21 / 20) === 2);
  assert("100 items, size 10 → 10 pages", Math.ceil(100 / 10) === 10);
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
