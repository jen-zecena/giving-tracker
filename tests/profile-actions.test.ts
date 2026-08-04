/**
 * Profile server-action validation tests
 * Run with: npx tsx tests/profile-actions.test.ts
 *
 * Exercises the pure validation helper in src/lib/actions/profile.ts.
 * The rest of the action (Supabase writes, cookies, encryption) requires a
 * live environment and is excluded — validation is where the security-
 * sensitive invariants live, and it's trivially testable in isolation.
 */

import { validateSettings } from "../src/lib/actions/profile-validation";

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

console.log("\nValid inputs pass:");
assert(
  "full valid update",
  validateSettings({
    display_name: "Jordan",
    bio: "Giving monthly.",
    salary: 50000,
    privacy_tier: "friends_only",
  }) === null
);
assert("empty object is valid (no-op)", validateSettings({}) === null);
assert("clearing bio is valid", validateSettings({ bio: null }) === null);
assert("clearing salary is valid", validateSettings({ salary: null }) === null);
assert(
  "display_name at exactly 60 chars is valid",
  validateSettings({ display_name: "x".repeat(60) }) === null
);
assert(
  "bio at exactly 280 chars is valid",
  validateSettings({ bio: "x".repeat(280) }) === null
);

console.log("\nDisplay name:");
assert(
  "empty string rejected",
  validateSettings({ display_name: "" }) === "Display name cannot be empty."
);
assert(
  "whitespace-only rejected",
  validateSettings({ display_name: "   " }) === "Display name cannot be empty."
);
assert(
  "61 chars rejected",
  validateSettings({ display_name: "x".repeat(61) }) ===
    "Display name must be 60 characters or fewer."
);

console.log("\nBio:");
assert(
  "281 chars rejected",
  validateSettings({ bio: "x".repeat(281) }) ===
    "Bio must be 280 characters or fewer."
);
assert(
  "empty string bio is valid (we clear on save)",
  validateSettings({ bio: "" }) === null
);

console.log("\nSalary:");
assert(
  "zero rejected",
  validateSettings({ salary: 0 }) === "Salary must be a positive number."
);
assert(
  "negative rejected",
  validateSettings({ salary: -1 }) === "Salary must be a positive number."
);
assert(
  "NaN rejected",
  validateSettings({ salary: Number.NaN }) ===
    "Salary must be a positive number."
);
assert(
  "Infinity rejected",
  validateSettings({ salary: Number.POSITIVE_INFINITY }) ===
    "Salary must be a positive number."
);
assert("1 is valid", validateSettings({ salary: 1 }) === null);
assert("50000 is valid", validateSettings({ salary: 50000 }) === null);

console.log("\nPrivacy tier:");
assert(
  "private valid",
  validateSettings({ privacy_tier: "private" }) === null
);
assert(
  "friends_only valid",
  validateSettings({ privacy_tier: "friends_only" }) === null
);
assert(
  "open_giver valid",
  validateSettings({ privacy_tier: "open_giver" }) === null
);
assert(
  "unknown tier rejected",
  // @ts-expect-error — deliberately invalid value for runtime check
  validateSettings({ privacy_tier: "public" }) === "Invalid privacy tier."
);

console.log("\nVisibility + notification toggles:");
assert(
  "show_amounts_to_friends true valid",
  validateSettings({ show_amounts_to_friends: true }) === null
);
assert(
  "show_amounts_to_friends false valid",
  validateSettings({ show_amounts_to_friends: false }) === null
);
assert(
  "show_percentage_publicly boolean valid",
  validateSettings({ show_percentage_publicly: true }) === null
);
assert(
  "email_notifications boolean valid",
  validateSettings({ email_notifications: false }) === null
);
assert(
  "non-boolean show_amounts_to_friends rejected",
  // @ts-expect-error — deliberately invalid value for runtime check
  validateSettings({ show_amounts_to_friends: "yes" }) ===
    "Invalid visibility setting."
);
assert(
  "non-boolean show_percentage_publicly rejected",
  // @ts-expect-error — deliberately invalid value for runtime check
  validateSettings({ show_percentage_publicly: 1 }) ===
    "Invalid visibility setting."
);
assert(
  "non-boolean email_notifications rejected",
  // @ts-expect-error — deliberately invalid value for runtime check
  validateSettings({ email_notifications: "no" }) ===
    "Invalid notification setting."
);
assert(
  "combined toggles with other fields valid",
  validateSettings({
    privacy_tier: "friends_only",
    show_amounts_to_friends: true,
    show_percentage_publicly: false,
    email_notifications: true,
  }) === null
);

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
