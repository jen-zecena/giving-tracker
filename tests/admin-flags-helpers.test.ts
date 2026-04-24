/**
 * DP-062 admin review-queue helper tests
 * Run with: npx tsx tests/admin-flags-helpers.test.ts
 *
 * Covers the two pure aggregations the page depends on:
 *   - splitFlagsByTab — buckets `reviewed` + `resolved` together (Figma
 *     surfaces them as one tab) while keeping `pending` and `dismissed`
 *     separate.
 *   - countFlagStats — counts `resolved` strictly (not `reviewed`) so
 *     the "Resolved" stat card matches the moderator's mental model of
 *     "we took action on N reports."
 */

import {
  countFlagStats,
  splitFlagsByTab,
  type ReviewQueueFlag,
} from "../src/lib/queries/admin-flags-helpers";
import type { NonprofitFlagStatus } from "../src/types";

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

function eq<T>(name: string, got: T, want: T) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  assert(
    name,
    ok,
    ok ? undefined : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`
  );
}

let nextId = 0;
function flag(status: NonprofitFlagStatus): ReviewQueueFlag {
  const id = `f${++nextId}`;
  return {
    id,
    nonprofit_id: "n1",
    user_id: "u1",
    reason: "fraud",
    description: null,
    status,
    admin_notes: null,
    created_at: "2026-04-15T00:00:00Z",
    nonprofit: null,
    reporter_display_name: null,
  };
}

// ── splitFlagsByTab ───────────────────────────────────────
console.log("\nsplitFlagsByTab:");

{
  const buckets = splitFlagsByTab([]);
  eq("empty input → empty buckets", buckets, {
    pending: [],
    reviewed: [],
    dismissed: [],
  });
}

{
  const p = flag("pending");
  const r = flag("reviewed");
  const x = flag("resolved");
  const d = flag("dismissed");
  const buckets = splitFlagsByTab([p, r, x, d]);
  eq(
    "pending bucket only contains pending",
    buckets.pending.map((f) => f.id),
    [p.id]
  );
  eq(
    "reviewed bucket combines reviewed + resolved (Figma)",
    buckets.reviewed.map((f) => f.id),
    [r.id, x.id]
  );
  eq(
    "dismissed bucket only contains dismissed",
    buckets.dismissed.map((f) => f.id),
    [d.id]
  );
}

{
  // Order is preserved within each bucket — page renders newest-first
  // because the fetcher sorts by created_at desc.
  const a = flag("pending");
  const b = flag("pending");
  const c = flag("pending");
  const buckets = splitFlagsByTab([a, b, c]);
  eq(
    "preserves input order within a bucket",
    buckets.pending.map((f) => f.id),
    [a.id, b.id, c.id]
  );
}

// ── countFlagStats ────────────────────────────────────────
console.log("\ncountFlagStats:");

{
  eq("empty input → all zero", countFlagStats([]), {
    pending: 0,
    resolved: 0,
    dismissed: 0,
    total: 0,
  });
}

{
  const stats = countFlagStats([
    flag("pending"),
    flag("pending"),
    flag("reviewed"),
    flag("resolved"),
    flag("resolved"),
    flag("resolved"),
    flag("dismissed"),
  ]);
  eq("pending counted", stats.pending, 2);
  eq(
    "resolved is strictly the resolved status (reviewed excluded)",
    stats.resolved,
    3
  );
  eq("dismissed counted", stats.dismissed, 1);
  eq("total counts every row regardless of status", stats.total, 7);
}

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
