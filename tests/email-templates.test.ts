/**
 * Render-shape tests for the DP-054 React Email templates.
 *
 * The Resend send path can't be tested without a network key, but we
 * can render the templates to HTML/text locally and assert the output
 * contains the copy, links, and data the callers depend on. That's
 * what "test-mode support" means in the acceptance criteria — the
 * template layer is exercised even without a RESEND_API_KEY.
 *
 * Run with: npx tsx tests/email-templates.test.ts
 */
import { render } from "@react-email/components";

import { WelcomeEmail } from "../src/emails/welcome";
import { PendingDigestEmail } from "../src/emails/pending-digest";

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

async function main() {
  // ── WelcomeEmail ────────────────────────────────────────────
  console.log("\nWelcomeEmail:");

  {
    const html = await render(
      WelcomeEmail({ displayName: "Jenny", siteUrl: "https://example.com" })
    );
    const text = await render(
      WelcomeEmail({ displayName: "Jenny", siteUrl: "https://example.com" }),
      { plainText: true }
    );

    assert("html greets user by name", html.includes("Hi Jenny"));
    assert("text output contains brand", text.includes("Giving Tracker"));
    assert(
      "CTA points at dashboard on the configured origin",
      html.includes("https://example.com/dashboard")
    );
    assert("preview text present", html.includes("Welcome to Giving Tracker"));
  }

  {
    // No display name → generic greeting.
    const html = await render(WelcomeEmail({ displayName: null }));
    assert("no display name → 'Hi there,'", html.includes("Hi there,"));
    assert(
      "falls back to localhost when siteUrl omitted",
      html.includes("http://localhost:3000/dashboard")
    );
  }

  {
    // Whitespace-only display name is treated as empty.
    const html = await render(WelcomeEmail({ displayName: "   " }));
    assert(
      "whitespace-only display name falls back to generic",
      html.includes("Hi there,") && !html.includes("Hi    ,")
    );
  }

  // ── PendingDigestEmail ──────────────────────────────────────
  console.log("\nPendingDigestEmail:");

  {
    const html = await render(
      PendingDigestEmail({
        displayName: "Jenny",
        siteUrl: "https://example.com",
        items: [
          {
            scheduleId: "s1",
            organizationName: "Red Cross",
            dueDate: "2026-04-18",
            amount: 50,
          },
          {
            scheduleId: "s2",
            organizationName: "UNICEF",
            dueDate: "2026-04-20",
            amount: 25,
          },
        ],
      })
    );

    assert("singular/plural heading — 2 items → plural", html.includes("2 pending donations"));
    assert("row 1 org name appears", html.includes("Red Cross"));
    assert("row 2 org name appears", html.includes("UNICEF"));
    assert("currency formatted (row 1)", html.includes("$50"));
    assert("currency formatted (row 2)", html.includes("$25"));
    assert(
      "date formatted long (row 1)",
      html.includes("Apr 18, 2026")
    );
    assert(
      "CTA points at pending filter on configured origin",
      html.includes("https://example.com/donations?status=pending")
    );
  }

  {
    const html = await render(
      PendingDigestEmail({
        displayName: null,
        items: [
          {
            scheduleId: "s1",
            organizationName: "Oxfam",
            dueDate: "2026-04-19",
            amount: 100,
          },
        ],
      })
    );

    assert(
      "singular heading — 1 item",
      html.includes("1 pending donation") && !html.includes("1 pending donations")
    );
    assert("generic greeting without display name", html.includes("Hi there,"));
  }

  {
    // Defensive: malformed date string shouldn't crash the render.
    const html = await render(
      PendingDigestEmail({
        displayName: null,
        items: [
          {
            scheduleId: "s1",
            organizationName: "Oxfam",
            dueDate: "not-a-date",
            amount: 100,
          },
        ],
      })
    );
    assert(
      "malformed date falls back to raw string",
      html.includes("not-a-date")
    );
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test harness threw:", err);
  process.exit(1);
});
