import { redirect } from "next/navigation";

/**
 * Personal Goals moved into Settings → "Goals & income" (IA decision
 * 2026-08-02). The full list/create/edit/delete experience lives in
 * `src/app/(app)/settings/goals-income-pane.tsx`; this route only keeps
 * old links (sidebar, dashboard, welcome checklist) working.
 */
export default function GoalsPage() {
  redirect("/settings?tab=goals");
}
