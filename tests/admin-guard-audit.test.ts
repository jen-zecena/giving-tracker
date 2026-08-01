/**
 * DP-066 — Admin middleware audit
 * Run with: npx tsx tests/admin-guard-audit.test.ts
 *
 * Admin access to /admin/* is enforced in two independent layers
 * (defense in depth), and this test locks the shape of both so a future
 * edit can't silently weaken either:
 *
 *   1. Route guard — src/app/(app)/admin/layout.tsx is a Server Component
 *      that resolves the current user, looks up profiles.is_admin, and
 *      calls notFound() (→ HTTP 404) for BOTH unauthenticated users and
 *      authenticated non-admins. Because it lives in the segment layout,
 *      every current and future page under /admin/* inherits the gate.
 *
 *   2. Database RLS — the is_admin() helper + admin-gated write policies on
 *      nonprofits and nonprofit_flags (DP-007). Even before the review-queue
 *      server actions land (DP-062), any write a non-admin attempts against
 *      those tables is rejected by Postgres, not just by the UI.
 *
 * Static text checks can't prove runtime behavior — that's what the live
 * browser test in the PR covers. They DO catch regressions that would
 * silently open the admin surface: a dropped is_admin lookup, a guard that
 * forgets the unauthenticated branch, or a removed RLS write gate.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const guardSrc = readFileSync(
  join(ROOT, "src", "app", "(app)", "admin", "layout.tsx"),
  "utf8"
);
const rlsSql = readFileSync(
  join(ROOT, "supabase", "migrations", "20260418_004_rls_policies.sql"),
  "utf8"
);
const sidebarSrc = readFileSync(
  join(ROOT, "src", "components", "nav", "sidebar.tsx"),
  "utf8"
);
const appLayoutSrc = readFileSync(
  join(ROOT, "src", "app", "(app)", "layout.tsx"),
  "utf8"
);
const flagsActionsSrc = readFileSync(
  join(ROOT, "src", "lib", "actions", "nonprofit-flags.ts"),
  "utf8"
);

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

function policyBody(table: string, policyName: string): string | null {
  const re = new RegExp(
    `create\\s+policy\\s+${policyName}\\s+on\\s+${table}([\\s\\S]*?);`,
    "i"
  );
  const match = rlsSql.match(re);
  return match ? match[1] : null;
}

function policyGatedByIsAdmin(table: string, policyName: string) {
  const body = policyBody(table, policyName);
  return body !== null && /is_admin/i.test(body);
}

// ── Layer 1: route guard (admin/layout.tsx) ───────────────
console.log("\nRoute guard — admin/layout.tsx:");
assert(
  "resolves the current user via supabase.auth.getUser()",
  /auth\s*\.\s*getUser\s*\(/i.test(guardSrc)
);
assert(
  "reads profiles.is_admin for the current user",
  /from\(\s*["']profiles["']\s*\)[\s\S]*?is_admin/i.test(guardSrc) &&
    /\.eq\(\s*["']id["']\s*,\s*user\.id\s*\)/.test(guardSrc)
);
assert(
  "blocks unauthenticated users (if (!user) notFound())",
  /if\s*\(\s*!\s*user\s*\)\s*\{?\s*notFound\(\)/.test(guardSrc)
);
assert(
  "blocks authenticated non-admins (if (!profile?.is_admin) notFound())",
  /if\s*\(\s*!\s*profile\?\.\s*is_admin\s*\)\s*\{?\s*notFound\(\)/.test(
    guardSrc
  )
);
assert(
  "guard is server-only (no 'use client' directive)",
  !/^\s*["']use client["']/m.test(guardSrc)
);

// ── Layer 2: is_admin() helper hardening ──────────────────
console.log("\nDB helper — is_admin():");
assert(
  "is_admin() is defined",
  /create\s+or\s+replace\s+function\s+public\.is_admin/i.test(rlsSql)
);
assert(
  "is_admin() uses SECURITY DEFINER (avoids profiles-policy recursion)",
  /is_admin[\s\S]*?security\s+definer/i.test(rlsSql)
);
assert(
  "is_admin() pins an empty search_path (hardening)",
  /is_admin[\s\S]*?set\s+search_path\s*=\s*''/i.test(rlsSql)
);
assert(
  "is_admin() defaults to false for unknown users (COALESCE)",
  /is_admin[\s\S]*?coalesce\s*\([\s\S]*?false\s*\)/i.test(rlsSql)
);
assert(
  "is_admin() execute is revoked from PUBLIC",
  /revoke\s+execute\s+on\s+function\s+public\.is_admin[\s\S]*?from\s+public/i.test(
    rlsSql
  )
);

// ── Layer 2: admin-gated writes (defense in depth) ────────
// Mirrors the issue's "admin-only server actions error for non-admins":
// the review-queue actions (DP-062) aren't ported yet, but any write they
// will make is already rejected at the RLS layer for non-admins.
console.log("\nDB RLS — admin-gated writes:");
for (const op of ["insert", "update", "delete"]) {
  assert(
    `nonprofits ${op} requires is_admin()`,
    policyGatedByIsAdmin("nonprofits", `nonprofits_${op}`)
  );
}
for (const op of ["update", "delete"]) {
  assert(
    `nonprofit_flags ${op} requires is_admin()`,
    policyGatedByIsAdmin("nonprofit_flags", `nonprofit_flags_${op}`)
  );
}
assert(
  "nonprofit_flags insert is owner-scoped, not admin (users file their own flags)",
  (() => {
    const body = policyBody("nonprofit_flags", "nonprofit_flags_insert");
    return body !== null && /user_id/i.test(body) && !/is_admin/i.test(body);
  })()
);

// ── UX gate: admin nav is is_admin-scoped ─────────────────
// Non-admins must not see a clickable path to /admin/*. The link is gated
// on an isAdmin prop threaded from the server (app) layout — never rendered
// unconditionally. This is UX only; the route guard above is the boundary.
console.log("\nNav gate — admin link is is_admin-scoped:");
assert(
  "sidebar defines a separate admin-only menu list (adminMenuItems)",
  /adminMenuItems\s*=/.test(sidebarSrc) &&
    /adminMenuItems[\s\S]*?\/admin\/review-queue/.test(sidebarSrc)
);
assert(
  "the default menuItems list contains no /admin link",
  (() => {
    const m = sidebarSrc.match(/const\s+menuItems\s*=\s*\[([\s\S]*?)\];/);
    return m !== null && !/\/admin/.test(m[1]);
  })()
);
assert(
  "Sidebar accepts an isAdmin prop",
  /function\s+Sidebar\s*\(\s*\{\s*isAdmin/.test(sidebarSrc)
);
assert(
  "admin items are only appended when isAdmin is true",
  /isAdmin\s*\?\s*\[\s*\.\.\.\s*menuItems\s*,\s*\.\.\.\s*adminMenuItems\s*\]\s*:\s*menuItems/.test(
    sidebarSrc
  )
);
assert(
  "(app) layout resolves is_admin server-side and passes it to the shell",
  /from\(\s*["']profiles["']\s*\)[\s\S]*?is_admin/i.test(appLayoutSrc) &&
    /isAdmin=\{/.test(appLayoutSrc)
);

// ── Admin-only server actions reject non-admins ───────────
// Mirrors the issue's "admin-only server actions error for non-admins".
console.log("\nServer actions — admin-gated (nonprofit-flags):");
for (const fn of ["listFlagsByStatus", "updateFlagStatus"]) {
  const body =
    flagsActionsSrc
      .match(new RegExp(`export async function ${fn}[\\s\\S]*?\\n}`, "m"))
      ?.[0] ?? "";
  assert(
    `${fn}() looks up the caller's is_admin`,
    /select\(\s*["']is_admin["']\s*\)/.test(body)
  );
  assert(
    `${fn}() returns an error for non-admins`,
    /if\s*\(\s*!\s*profile\?\.\s*is_admin\s*\)\s*\{?\s*return\s*\{\s*error:/.test(
      body
    )
  );
}

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
