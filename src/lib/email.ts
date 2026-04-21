import "server-only";

import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

import { PendingDigestEmail, type PendingDigestProps } from "@/emails/pending-digest";
import { WelcomeEmail, type WelcomeProps } from "@/emails/welcome";

/**
 * Thin Resend wrapper. Callers hand us a React Email element and the
 * minimum envelope fields; we render to HTML + text and ship.
 *
 * Test mode: when `RESEND_API_KEY` is unset, we render the template
 * (to catch template bugs) and return `{ skipped: true }` without
 * hitting the network. That means DP-055's cron can run in preview
 * deployments or local dev without a real key, and unit tests can
 * exercise the render path for free.
 */

export type SendResult =
  | { sent: true; id: string }
  | { sent: false; skipped: true; reason: "test_mode" | "opted_out" }
  | { sent: false; error: string };

type SendArgs = {
  to: string;
  subject: string;
  element: ReactElement;
  /**
   * When false, short-circuits to `{ skipped: true, reason: "opted_out" }`.
   * Keeps the opt-out check co-located with the send instead of scattered
   * across every caller.
   */
  emailOptedIn?: boolean;
};

let cached: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM ?? "Giving Tracker <onboarding@resend.dev>";
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  if (args.emailOptedIn === false) {
    return { sent: false, skipped: true, reason: "opted_out" };
  }

  const [html, text] = await Promise.all([
    render(args.element),
    render(args.element, { plainText: true }),
  ]);

  const client = getResend();
  if (!client) {
    return { sent: false, skipped: true, reason: "test_mode" };
  }

  const res = await client.emails.send({
    from: getFromAddress(),
    to: args.to,
    subject: args.subject,
    html,
    text,
  });

  if (res.error || !res.data?.id) {
    return {
      sent: false,
      error: res.error?.message ?? "Unknown Resend error",
    };
  }

  return { sent: true, id: res.data.id };
}

// ── High-level helpers (one per template) ────────────────────────────

export async function sendWelcomeEmail(
  args: { to: string; emailOptedIn?: boolean } & WelcomeProps
): Promise<SendResult> {
  const { to, emailOptedIn, ...props } = args;
  return sendEmail({
    to,
    subject: "Welcome to Giving Tracker",
    element: WelcomeEmail(props),
    emailOptedIn,
  });
}

export async function sendPendingDigestEmail(
  args: { to: string; emailOptedIn?: boolean } & PendingDigestProps
): Promise<SendResult> {
  const { to, emailOptedIn, ...props } = args;
  const count = props.items.length;
  return sendEmail({
    to,
    subject:
      count === 1
        ? "You have 1 pending donation to confirm"
        : `You have ${count} pending donations to confirm`,
    element: PendingDigestEmail(props),
    emailOptedIn,
  });
}
