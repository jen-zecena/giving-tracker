import { redirect } from "next/navigation";

/**
 * Privacy settings now live as a pane inside /settings (IA decision
 * 2026-08-02). Keep the old deep link working.
 */
export default function PrivacySettingsPage() {
  redirect("/settings?tab=privacy");
}
