# Phase 1: Execution Order

**Approach:** Hybrid — build a minimal foundation (database + basic login), then jump to visible features with real data. Defer complex auth (OAuth, onboarding wizard) and full privacy policies until the core loop works.

**Status key:** To track progress, mark tasks as you go.
- `[ ]` = Not started
- `[~]` = In progress
- `[x]` = Complete

---

## Sprint 1: Minimal Foundation

**Goal:** Real data can flow — forms save to the database, queries return results.

| # | Task | Description | Labels |
|---|------|-------------|--------|
| 1 | `[x]` TASK-006 | **Create database tables** — profiles, donations, recurring_schedules, privacy_overrides with basic owner-only RLS (no tier-based policies yet) | `database` |
| 2 | `[x]` TASK-008 | **Salary encryption** — pgcrypto or app-level encryption so salary is never stored as plaintext | `backend`, `database`, `privacy` |
| 3 | `[x]` TASK-009 | **Email/password registration & login** — register, login, logout, forgot password, email confirmation, redirect logic | `feature`, `backend`, `frontend` |

**Sprint 1 outcome:** You can create an account, log in, and the database is ready for donation data.

---

## Sprint 2: Donation Logging (Core Feature)

**Goal:** A user can log, view, edit, and delete donations with real data persisted to Supabase.

| # | Task | Description | Labels |
|---|------|-------------|--------|
| 4 | `[ ]` TASK-013 | **Donation CRUD API** — Server actions for create, read (with filters), update, delete | `backend` |
| 5 | `[ ]` TASK-012 | **Donation logging form** — /donations/new with all fields (org, amount, date, scope, cause tag, recurring toggle) | `feature`, `frontend` |
| 6 | `[ ]` TASK-014 | **Donation history list** — /donations page with filtering, sorting, search, empty state | `feature`, `frontend` |
| 7 | `[ ]` TASK-015 | **Edit donation page** — /donations/[id]/edit, pre-populated form, per-donation privacy toggle | `feature`, `frontend` |
| 8 | `[ ]` TASK-016 | **Delete donation** — Confirmation dialog, toast feedback | `feature`, `frontend` |

**Sprint 2 outcome:** The core interaction works end-to-end — log a donation, see it in history, edit it, delete it.

---

## Sprint 3: Dashboard

**Goal:** User sees charts and insights generated from their real donation data.

| # | Task | Description | Labels |
|---|------|-------------|--------|
| 9 | `[ ]` TASK-022 | **Dashboard data aggregation layer** — Server-side queries for YTD summary, salary %, monthly totals, scope/cause breakdowns, streak, MoM, YoY | `backend` |
| 10 | `[ ]` TASK-023 | **Dashboard layout + summary cards** — Page structure, summary cards (YTD total, count, streak, salary %), empty state, salary prompt banner | `feature`, `frontend`, `charts` |
| 11 | `[ ]` TASK-024 | **Monthly totals bar chart** — Recharts bar chart, past 12 months, tooltips | `frontend`, `charts` |
| 12 | `[ ]` TASK-025 | **Salary percentage progress ring** — Circular progress, dynamic milestone targets (1% → 2% → 3%), fallback when salary not set | `frontend`, `charts` |
| 13 | `[ ]` TASK-026 | **Scope breakdown pie chart** — Donut chart for local/national/global distribution | `frontend`, `charts` |
| 14 | `[ ]` TASK-027 | **Cause tag breakdown chart** — Horizontal bar chart, sorted by amount, handles uncategorized | `frontend`, `charts` |
| 15 | `[ ]` TASK-028 | **MoM and YoY comparisons** — Percentage change indicator, side-by-side year bars | `frontend`, `charts` |

**Sprint 3 outcome:** The core loop is complete — log a donation and see it reflected across all dashboard charts. This is the first fully usable version of the app.

---

## Sprint 4: Recurring Donations

**Goal:** Recurring schedules auto-generate pending entries that users confirm or skip.

| # | Task | Description | Labels |
|---|------|-------------|--------|
| 16 | `[ ]` TASK-017 | **Recurring schedule CRUD API** — Server actions for create, read, update, pause/resume, cancel, toggle auto-confirm | `backend` |
| 17 | `[ ]` TASK-018 | **Recurring schedule management UI** — List schedules, pause/resume, edit, cancel, show auto-confirm status | `feature`, `frontend` |
| 18 | `[ ]` TASK-019 | **Pending entry generation** — Vercel Cron job that creates pending donation entries daily, with idempotency | `feature`, `backend`, `database` |
| 19 | `[ ]` TASK-020 | **Email notifications for pending donations** — Summary email via Resend when pending entries are generated | `backend`, `feature` |
| 20 | `[ ]` TASK-021 | **Confirm/skip flow** — Prominent pending donation UI, one-tap confirm/skip, auto-confirm offer after 3 confirmations, nav badge | `feature`, `frontend`, `backend` |

**Sprint 4 outcome:** Recurring donations are fully functional — set it up once, get reminded, confirm with one tap.

---

## Sprint 5: Auth & Privacy Polish

**Goal:** Complete the authentication experience and implement full privacy enforcement.

| # | Task | Description | Labels |
|---|------|-------------|--------|
| 21 | `[ ]` TASK-010 | **Google OAuth** — "Continue with Google" button, callback handling, first-time detection | `feature`, `backend`, `frontend` |
| 22 | `[ ]` TASK-011 | **Onboarding wizard** — Multi-step wizard (welcome, name, salary, privacy tier, success) | `feature`, `frontend`, `privacy` |
| 23 | `[ ]` TASK-029 | **Profile settings page** — Edit name, bio, photo, salary, email notification preference | `feature`, `frontend`, `backend` |
| 24 | `[ ]` TASK-007 | **Full RLS privacy policies** — Tier-based SELECT policies (private/friends-only/open-giver), amount stripping, salary protection | `database`, `privacy`, `backend` |
| 25 | `[ ]` TASK-030 | **Privacy settings page** — Tier selector with visual cards, custom override toggles | `feature`, `frontend`, `privacy` |

**Sprint 5 outcome:** Polished auth flow with Google OAuth, guided onboarding for new users, and privacy enforced at the database level.

---

## Sprint 6: Responsive Design & Verification

**Goal:** Polish the app across all viewports and validate everything works together.

| # | Task | Description | Labels |
|---|------|-------------|--------|
| 26 | `[ ]` TASK-031 | **Mobile responsiveness pass** — Test all pages at 320px, 375px, 428px, 768px, 1280px+; fix touch targets, chart sizing, form layouts | `frontend`, `design` |
| 27 | `[ ]` TASK-032 | **Loading states & error handling** — Skeletons, error boundaries, consistent toasts, optimistic UI, no blank screens | `frontend`, `design` |
| 28 | `[ ]` TASK-033 | **End-to-end verification** — Full PRD test plan: auth flows, donations, recurring, dashboard, privacy, mobile/desktop | `setup` |

**Sprint 6 outcome:** Phase 1 is complete and verified. Ready for beta testers.

---

## Quick Reference: Execution Sequence

```
COMPLETED (Work Stream 1):
  TASK-001  Next.js + TypeScript + Tailwind
  TASK-002  shadcn/ui components
  TASK-003  Supabase client setup
  TASK-004  Vercel deployment
  TASK-005  App layout, nav, routing

Sprint 1 — Foundation:
  TASK-006 → TASK-008 → TASK-009

Sprint 2 — Donation Logging:
  TASK-013 → TASK-012 → TASK-014 → TASK-015 → TASK-016

Sprint 3 — Dashboard:
  TASK-022 → TASK-023 → TASK-024, TASK-025, TASK-026, TASK-027 (parallel) → TASK-028

Sprint 4 — Recurring Donations:
  TASK-017 → TASK-018 → TASK-019 → TASK-020 → TASK-021

Sprint 5 — Auth & Privacy Polish:
  TASK-010 → TASK-011 → TASK-029 → TASK-007 → TASK-030

Sprint 6 — Polish & Verification:
  TASK-031 → TASK-032 → TASK-033
```

---

## Notes

- **Arrows (→)** indicate dependency — do them in order
- **Commas** indicate tasks that can be done in parallel (e.g., all 4 chart tasks in Sprint 3)
- Tasks within a sprint that have no arrow between them can be done in any order
- The PHASE1_BACKLOG.md file has the full description, acceptance criteria, and subtasks for every task referenced here
