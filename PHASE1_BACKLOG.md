# Phase 1: Core MVP — Task Backlog

**Milestone:** Phase 1: Core MVP
**Goal:** A usable product that one person can use to track their own giving.
**PRD Reference:** Sections 6.1–6.5, 7 (Phase 1 Roadmap), 10 (Verification Plan)

Tasks are organized into work streams and ordered by dependency. Each task includes a suggested priority to help with sprint planning. Tasks are numbered sequentially in approximate execution order.

**Priority key:** P0 = must do first (blocker for others), P1 = core feature, P2 = important but not blocking

---

## Work Stream 1: Project Setup & Infrastructure

### TASK-001: Initialize Next.js project with TypeScript and Tailwind CSS

**Priority:** P0
**Labels:** `setup`
**Depends on:** Nothing — this is the first task
**Blocks:** All other tasks

**Description:**
Scaffold the Next.js application using the App Router with TypeScript. Configure Tailwind CSS for styling. Set up the basic project structure with folders for components, lib/utils, and app routes.

**Tasks:**
- Initialize Next.js with App Router + TypeScript (`create-next-app`)
- Configure Tailwind CSS and verify it works
- Set up path aliases (`@/` imports)
- Create folder structure: `src/app/`, `src/components/`, `src/lib/`, `src/types/`
- Create shared TypeScript type definitions in `src/types/` matching the planned database schema (donation, profile, recurring schedule, privacy, enums for cause tags, scope, frequency, privacy tier, donation status). These types will be used across all subsequent tasks.
- Add `.env.local` to `.gitignore`
- Verify `npm run dev` starts without errors

**Acceptance Criteria:**
- [ ] `npm run dev` runs and shows the default Next.js page
- [ ] Tailwind utility classes render correctly (test with a colored div)
- [ ] TypeScript compilation has no errors
- [ ] Folder structure is in place
- [ ] Shared TypeScript types are defined and importable via `@/types`

---

### TASK-002: Install and configure shadcn/ui component library

**Priority:** P0
**Labels:** `setup`, `frontend`
**Depends on:** TASK-001

**Description:**
Initialize shadcn/ui and install the base components that will be used across the application. shadcn/ui is copy-paste (not a dependency), so components are added directly to the codebase.

**Tasks:**
- Run `npx shadcn@latest init` and configure for the project
- Install commonly needed base components: Button, Input, Label, Card, Dialog, Select, Dropdown Menu, Tabs, Toast, Form, Calendar, Popover, Badge, Avatar, Separator, Sheet (mobile nav), Tooltip
- Verify components render correctly with Tailwind

**Acceptance Criteria:**
- [ ] shadcn/ui is initialized with project theme
- [ ] At least 5 core components installed and rendering correctly
- [ ] Components respect Tailwind theme and dark mode tokens (if configured)

---

### TASK-003: Create Supabase project and configure client

**Priority:** P0
**Labels:** `setup`, `backend`, `database`
**Depends on:** TASK-001

**Description:**
Create a new Supabase project, configure environment variables, and set up the Supabase client for both server-side and client-side usage in Next.js.

**Tasks:**
- Create Supabase project at supabase.com
- Install `@supabase/supabase-js` and `@supabase/ssr`
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- Create server-side Supabase client utility (`src/lib/supabase/server.ts`)
- Create client-side Supabase client utility (`src/lib/supabase/client.ts`)
- Create middleware for auth session refresh and route protection (`src/middleware.ts`). The middleware should redirect unauthenticated users to `/login` for all protected routes (everything except `/login`, `/register`, and `/auth/callback`).
- Verify connection by querying Supabase from a test page

**Acceptance Criteria:**
- [ ] Supabase client connects successfully from both server and client
- [ ] Environment variables are configured and not committed to git
- [ ] Middleware refreshes auth session on each request
- [ ] Middleware redirects unauthenticated users to `/login` for protected routes
- [ ] `.env.local` is in `.gitignore`

---

### TASK-004: Deploy to Vercel with push-to-deploy

**Priority:** P0
**Labels:** `setup`
**Depends on:** TASK-001, TASK-003

**Description:**
Connect the GitHub repository to Vercel for automatic deployments. Configure environment variables in Vercel and verify the deployment pipeline works end-to-end.

**Tasks:**
- Connect GitHub repo to Vercel
- Add Supabase environment variables to Vercel project settings
- Deploy initial skeleton
- Verify preview deployments work on pull requests

**Acceptance Criteria:**
- [ ] Pushing to `main` triggers automatic production deployment
- [ ] Opening a PR creates a preview deployment
- [ ] Supabase environment variables are set in Vercel
- [ ] Live site loads without errors

---

### TASK-005: Set up app layout, navigation, and routing structure

**Priority:** P0
**Labels:** `frontend`, `design`
**Depends on:** TASK-002

**Description:**
Create the core application layout with navigation that works on both desktop and mobile. Define the route structure for all Phase 1 pages. This is the shell that all features will be built into.

**Tasks:**
- Create root layout with app shell (sidebar on desktop, bottom nav on mobile)
- Define routes: `/login`, `/register`, `/auth/callback` (OAuth), `/onboarding`, `/dashboard`, `/donations`, `/donations/new`, `/donations/[id]/edit`, `/settings`, `/settings/privacy`
- Build responsive navigation component (sidebar collapses to bottom nav on mobile)
- Add loading states and 404 page
- Create placeholder pages for each route

**Acceptance Criteria:**
- [ ] Desktop: sidebar navigation with links to Dashboard, Donations, Settings
- [ ] Mobile: bottom navigation bar with the same links
- [ ] All routes render placeholder content without errors
- [ ] Navigation highlights the active page
- [ ] Unauthenticated users are redirected to `/login`

---

## Work Stream 2: Database Schema & Privacy Foundation

### TASK-006: Design and create core database tables

**Priority:** P0
**Labels:** `database`
**Depends on:** TASK-003
**Blocks:** TASK-008, TASK-009, TASK-013, TASK-021

**Description:**
Create all PostgreSQL tables in Supabase needed for Phase 1. This is the backbone of the application — get the schema right before building features on top of it.

**Note:** Phase 1 is USD-only. The `currency` column defaults to `'USD'` and no currency selector is needed in the UI. Multi-currency support can be added in a later phase.

**Tables:**
- `profiles` — extends Supabase auth.users with app-specific data
- `donations` — individual donation entries
- `recurring_schedules` — recurring donation definitions
- `privacy_overrides` — per-user per-field visibility overrides on top of tier defaults

**Tasks:**
- Create `profiles` table: id (FK to auth.users), display_name, bio, avatar_url, salary_encrypted (bytea — see TASK-008 for encryption implementation), salary_range, privacy_tier (enum: 'private', 'friends_only', 'open_giver'), salary_updated_at (timestamp, for annual update prompt), onboarding_completed (boolean, default false), created_at, updated_at
- Create `donations` table: id, user_id (FK), organization_name, amount, currency (default 'USD'), donation_date, scope (enum: 'local', 'national', 'global'), cause_tag (enum of 10 categories, nullable), custom_tag, notes, is_tax_deductible, is_recurring, recurring_schedule_id (FK nullable), status (enum: 'confirmed', 'pending', 'skipped'), is_private_override (boolean, per-donation hide — allows hiding a specific donation regardless of tier), created_at, updated_at
- Create `recurring_schedules` table: id, user_id (FK), organization_name, amount, currency, frequency (enum: 'weekly', 'monthly', 'quarterly', 'annually'), cause_tag, custom_tag, scope, next_due_date, is_active, is_auto_confirm, consecutive_confirmations, created_at, updated_at
- Create `privacy_overrides` table: id, user_id (FK), field_name (e.g. 'donation_amounts', 'salary_percentage', 'badges', 'appear_in_explore'), is_visible (boolean), created_at
- Create cause_tag enum type with 10 fixed categories
- Set up foreign key constraints and indexes
- Create trigger to auto-create a `profiles` row when a new auth.user is created

**Acceptance Criteria:**
- [ ] All tables created with correct column types and constraints
- [ ] Foreign key relationships enforced
- [ ] Indexes on user_id columns and donation_date for query performance
- [ ] Auto-profile creation trigger works on new user signup
- [ ] Migration SQL is saved in version control (`supabase/migrations/`)

---

### TASK-007: Implement Row-Level Security (RLS) policies for privacy tiers

**Priority:** P0
**Labels:** `database`, `privacy`, `backend`
**Depends on:** TASK-006
**Blocks:** TASK-029, TASK-030

**Description:**
Implement Supabase RLS policies that enforce the 3-tier privacy model at the database level. This is a critical security requirement — privacy must be guaranteed even if the application code has bugs.

**Policies to implement:**
- `profiles`: Users can always read their own profile. Other users can read profiles based on the target's privacy_tier (private = nobody, friends_only = followers, open_giver = everyone). Salary fields are NEVER returned for other users.
- `donations`: Users can always CRUD their own donations. Other users can read based on donor's privacy_tier. Donation amounts are hidden by default across **all** tiers — amounts are only visible to other users if the donor has explicitly opted in via a `privacy_overrides` entry for `'donation_amounts'`. Implementation: create a database view (e.g. `donations_visible`) or a security-definer function that returns `NULL` for the `amount` column when the requesting user is not the owner and the donor hasn't opted in to sharing amounts. The application should query through this view for any non-owner reads. Donations with `is_private_override = true` are completely hidden from non-owners regardless of tier.
- `recurring_schedules`: Only the owning user can read/write.
- `privacy_overrides`: Only the owning user can read/write.

**Tasks:**
- Enable RLS on all tables
- Write SELECT policies for `profiles` (self, friends, public — based on tier)
- Write SELECT policies for `donations` (self, friends, public — based on tier)
- Write INSERT/UPDATE/DELETE policies (owner only) for all tables
- Create a database function to check if user A follows user B (needed for Tier 2 policies; for Phase 1, stub this to return false since follows don't exist yet)
- Create a database view or function that strips salary from profile reads by other users
- Write test queries to verify each policy

**Acceptance Criteria:**
- [ ] RLS is enabled on every table (no table is accessible without a policy)
- [ ] A Tier 1 user's donations are invisible to all other users
- [ ] A Tier 2 user's donations are visible to followers only (stubbed as nobody in Phase 1)
- [ ] A Tier 3 user's donations are visible to everyone but amounts are hidden by default
- [ ] Salary is never returned when querying another user's profile
- [ ] Owner can always CRUD their own data
- [ ] Verified via direct Supabase API calls (not just UI)

---

### TASK-008: Implement salary encryption and decryption

**Priority:** P0
**Labels:** `backend`, `database`, `privacy`
**Depends on:** TASK-006
**Blocks:** TASK-011, TASK-025, TASK-029

**Description:**
The PRD requires salary to be stored encrypted at rest and never exposed via API to other users. This task implements the encryption/decryption layer for salary data. The salary is used only server-side to compute the donation percentage — the raw salary value never leaves the server in API responses to other users.

**Decision needed:** Choose between (a) Supabase Vault (built-in secrets management — but currently limited and may not support per-row encryption well), (b) `pgcrypto` extension with `pgp_sym_encrypt`/`pgp_sym_decrypt` using a server-side encryption key, or (c) application-level encryption in the Next.js server layer using Node's `crypto` module before writing to Supabase. **Recommendation:** Use `pgcrypto` with symmetric encryption (`pgp_sym_encrypt`) — it keeps encryption at the database layer, works with Supabase's Postgres, and the encryption key is stored as a Supabase database secret (not in client-accessible env vars). If `pgcrypto` is not available or too complex, fall back to application-level encryption with a `SALARY_ENCRYPTION_KEY` env var (server-only, never `NEXT_PUBLIC_`).

**Tasks:**
- Enable `pgcrypto` extension in Supabase (or set up application-level encryption)
- Create a database function `encrypt_salary(salary numeric, key text)` that returns encrypted bytea
- Create a database function `decrypt_salary(encrypted_salary bytea, key text)` that returns numeric
- Store the encryption key as a Supabase database secret or server-only environment variable
- Create a helper in `src/lib/salary.ts` that the server-side code uses to encrypt before writing and decrypt after reading
- Ensure the encryption key is never exposed to the client (not in any `NEXT_PUBLIC_` variable)
- Update TASK-006 migration to use `bytea` type for `salary_encrypted` column

**Acceptance Criteria:**
- [ ] Salary is stored as encrypted bytea in the database — not readable as plaintext in Supabase dashboard or raw SQL queries
- [ ] Server-side code can decrypt salary for percentage calculations
- [ ] Encryption key is stored securely (database secret or server-only env var)
- [ ] No client-side code can access the raw salary value or encryption key
- [ ] Salary encryption/decryption round-trips correctly (encrypt → store → read → decrypt = original value)
- [ ] Salary ranges (when user chooses range instead of exact figure) are also encrypted

---

## Work Stream 3: Authentication & Onboarding

### TASK-009: Implement email/password registration and login

**Priority:** P1
**Labels:** `feature`, `backend`, `frontend`
**Depends on:** TASK-003, TASK-005, TASK-006

**Description:**
Build the registration and login pages using Supabase Auth with email/password. Include form validation, error handling, and email confirmation flow.

**Tasks:**
- Build `/register` page with form: email, password, confirm password
- Build `/login` page with form: email, password
- Implement Supabase Auth `signUp` and `signInWithPassword`
- Add form validation (email format, password minimum length, passwords match)
- Handle error states (user exists, wrong password, network error)
- Implement email confirmation flow (Supabase sends verification email). After clicking the email confirmation link, the user should be redirected to `/auth/callback` which exchanges the token and redirects to `/onboarding`.
- Add "Forgot password" link and reset flow (redirect to `/auth/callback` → password reset page)
- Redirect authenticated users away from login/register pages
- Redirect logic on login: check `profiles.onboarding_completed` — if false, redirect to `/onboarding`; if true, redirect to `/dashboard`
- Implement logout: add a sign-out action using Supabase `signOut`, accessible from the navigation/sidebar. Redirect to `/login` after sign-out.

**Acceptance Criteria:**
- [ ] User can register with email and password
- [ ] User can log in with email and password
- [ ] Form validation shows clear error messages
- [ ] "Forgot password" sends a reset email
- [ ] Email confirmation link redirects correctly and creates a session
- [ ] New users (onboarding_completed = false) are redirected to onboarding; returning users to dashboard
- [ ] User can log out from any page and is redirected to `/login`
- [ ] Works on mobile and desktop

---

### TASK-010: Implement Google OAuth registration and login

**Priority:** P1
**Labels:** `feature`, `backend`, `frontend`
**Depends on:** TASK-009

**Description:**
Add Google OAuth as an authentication option alongside email/password. Configure the Google OAuth provider in Supabase and add sign-in buttons to the login and registration pages.

**Tasks:**
- Configure Google OAuth provider in Supabase dashboard
- Add "Continue with Google" button to login and register pages
- Implement Supabase Auth `signInWithOAuth` with Google provider
- Handle OAuth callback redirect
- Detect first-time OAuth users (check `profiles.onboarding_completed`) and redirect to onboarding
- Handle edge case: user registered with email tries to sign in with Google (same email)
- Handle OAuth callback errors: user denies consent, email conflict with existing account, network errors. Show clear error messages on the login page with guidance on how to resolve.

**Acceptance Criteria:**
- [ ] User can register and log in with Google in one click
- [ ] OAuth callback works correctly and creates a session
- [ ] First-time Google users go through onboarding
- [ ] Existing Google users go directly to dashboard
- [ ] OAuth errors (denied consent, email conflict) show clear error messages
- [ ] Button is visually distinct and follows Google brand guidelines

---

### TASK-011: Build onboarding wizard (name, salary, privacy tier)

**Priority:** P1
**Labels:** `feature`, `frontend`, `privacy`
**Depends on:** TASK-009, TASK-006

**Description:**
Build a multi-step onboarding wizard that new users complete after registration. The wizard collects their display name, optional salary information, and privacy tier preference. This should feel quick and welcoming — not like a form.

**Steps in wizard:**
1. Welcome screen with app value prop
2. Display name input
3. Salary input (optional, with skip option) — support exact figure or range
4. Privacy tier selection (visual cards explaining each tier, defaulting to Private)
5. Confirmation / "You're all set!" screen

**Tasks:**
- Build multi-step wizard component with progress indicator
- Step 1: Welcome screen with brief app explanation
- Step 2: Display name input with validation
- Step 3: Salary input — toggle between exact amount and range (e.g., "$50k–$75k"); prominent "Skip for now" option; explainer text: "This is used only to calculate your giving percentage. It's never shared."
- Step 4: Privacy tier selector — 3 visual cards (Private, Friends Only, Open Giver) with clear descriptions of what each tier means; default to Private
- Step 5: Success screen with CTA to log first donation
- Save all data to `profiles` table on completion
- Mark onboarding as complete (flag on profile) so user isn't shown wizard again

**Acceptance Criteria:**
- [ ] New users see the wizard after first login
- [ ] Users can navigate forward/back through steps
- [ ] Salary can be entered as exact figure or range
- [ ] Salary can be skipped entirely
- [ ] Privacy tier defaults to Private
- [ ] All data saves correctly to the profiles table
- [ ] Returning users are never shown the wizard again
- [ ] Works on mobile (full-screen wizard) and desktop

---

## Work Stream 4: Donation Logging

### TASK-012: Build "Log Donation" form page

**Priority:** P1
**Labels:** `feature`, `frontend`
**Depends on:** TASK-005, TASK-006
**Blocks:** TASK-014, TASK-021

**Description:**
Build the primary donation logging form. This is the core interaction of the app — it must be fast (under 30 seconds to complete), intuitive, and work great on mobile.

**Required fields:**
- Organization name (free-text input)
- Donation amount (currency input with $ prefix)
- Date of donation (date picker, defaults to today)
- Scope: local, national, or global
- One-time or recurring toggle

**Optional fields:**
- Cause tag (dropdown with 10 fixed categories)
- Custom tag (free-text, shown only if cause tag is selected)
- Notes / personal motivation
- Tax-deductible checkbox
- Per-donation privacy toggle ("Hide this donation" — sets `is_private_override` so this donation is hidden from others regardless of the user's privacy tier)

**Tasks:**
- Build `/donations/new` page with the donation form
- Currency input component (formats as $X,XXX.XX)
- Date picker using shadcn/ui Calendar + Popover (defaults to today)
- Scope selector (radio group or segmented control: Local / National / Global)
- One-time / Recurring toggle; if recurring, show frequency dropdown (weekly, monthly, quarterly, annually)
- Cause tag dropdown with 10 fixed options
- Custom tag text input (appears after selecting a cause tag)
- Notes text area (optional)
- Tax-deductible checkbox
- Form validation: amount > 0, organization name required, date required, scope required
- Submit saves to `donations` table (and creates `recurring_schedules` entry if recurring)
- Success state: toast + option to log another or go to dashboard

**Acceptance Criteria:**
- [ ] A donation can be logged in under 30 seconds
- [ ] All required fields are validated before submission
- [ ] Currency input formats correctly (no negative values, max 2 decimals)
- [ ] Date defaults to today
- [ ] Recurring toggle shows frequency options when enabled
- [ ] Cause tag dropdown lists all 10 categories
- [ ] Donation saves to database and appears in donation history
- [ ] If marked recurring, a `recurring_schedules` entry is also created
- [ ] Success feedback with clear next-step options
- [ ] Mobile-optimized layout (full-width inputs, large touch targets)

---

### TASK-013: Build donation API routes (CRUD)

**Priority:** P1
**Labels:** `backend`
**Depends on:** TASK-006, TASK-007

**Description:**
Create the server-side API layer for donation CRUD operations. These routes will be called by the frontend forms and list views.

**Tasks:**
- Create API route or Server Action: create donation
- Create API route or Server Action: read donations (with filtering by date range, scope, cause tag, status)
- Create API route or Server Action: update donation
- Create API route or Server Action: delete donation
- All routes must validate the authenticated user
- All routes must respect RLS (user can only modify their own donations)
- Include pagination support for donation list queries (cursor or offset)

**Acceptance Criteria:**
- [ ] All CRUD operations work correctly
- [ ] Unauthenticated requests return 401
- [ ] Users cannot modify other users' donations (enforced by RLS)
- [ ] List endpoint supports filtering by: date range, scope, cause tag, status (confirmed/pending)
- [ ] Pagination works correctly for large donation lists

---

### TASK-014: Build donation history list view with filtering and sorting

**Priority:** P1
**Labels:** `feature`, `frontend`
**Depends on:** TASK-012, TASK-013

**Description:**
Build the `/donations` page showing the user's donation history as a list or table. Include filtering and sorting to help users find specific donations.

**Tasks:**
- Build `/donations` page with list of all user donations
- Each donation row shows: date, organization, amount, scope badge, cause tag badge, status (confirmed/pending), recurring indicator
- Filter controls: date range picker, scope filter, cause tag filter, status filter (all/confirmed/pending)
- Sort options: date (newest/oldest), amount (high/low)
- Search by organization name
- Empty state for users with no donations (CTA to log first donation)
- Click a donation to view details or edit
- Responsive: card layout on mobile, table on desktop

**Acceptance Criteria:**
- [ ] All donations display with correct data
- [ ] Filters work correctly and can be combined
- [ ] Sort changes the list order immediately
- [ ] Organization search filters in real-time
- [ ] Pending donations are visually distinct from confirmed
- [ ] Recurring donations show a recurring indicator icon
- [ ] Empty state guides user to log first donation
- [ ] Responsive: cards on mobile, table/rows on desktop

---

### TASK-015: Build edit donation page

**Priority:** P1
**Labels:** `feature`, `frontend`
**Depends on:** TASK-012, TASK-013

**Description:**
Build the `/donations/[id]/edit` page that allows users to modify a previously logged donation. Pre-populate the form with existing values.

**Tasks:**
- Build `/donations/[id]/edit` page
- Fetch existing donation data and pre-populate the form
- Reuse the donation form component from TASK-012 in edit mode
- Handle 404 (donation not found) and 403 (not the owner)
- Save changes and redirect back to donation history with success toast
- Add per-donation privacy toggle (hide this specific donation regardless of tier setting)

**Acceptance Criteria:**
- [ ] Form pre-fills with existing donation data
- [ ] All fields are editable
- [ ] Save updates the donation in the database
- [ ] Per-donation privacy toggle works and persists
- [ ] 404 shows if donation doesn't exist; 403 if not the owner
- [ ] Success toast on save; redirect to history

---

### TASK-016: Implement delete donation with confirmation

**Priority:** P1
**Labels:** `feature`, `frontend`
**Depends on:** TASK-013

**Description:**
Add the ability to delete a donation from the history list or edit page. Requires a confirmation dialog to prevent accidental deletion.

**Tasks:**
- Add delete button on donation history rows and edit page
- Confirmation dialog: "Are you sure you want to delete this donation? This cannot be undone."
- On confirm, delete from database and remove from UI
- If the donation was tied to a recurring schedule, do NOT delete the schedule (just the single entry)
- Success toast on deletion

**Acceptance Criteria:**
- [ ] Delete button is accessible from both list view and edit page
- [ ] Confirmation dialog prevents accidental deletion
- [ ] Donation is removed from database and disappears from UI
- [ ] Deleting a recurring instance does not delete the recurring schedule
- [ ] Success toast confirms deletion

---

## Work Stream 5: Recurring Donations

### TASK-017: Build recurring schedule API routes (CRUD)

**Priority:** P1
**Labels:** `backend`
**Depends on:** TASK-006, TASK-007
**Blocks:** TASK-018, TASK-019

**Description:**
Create the server-side API layer for recurring schedule CRUD operations. TASK-013 covers donation CRUD, but recurring schedules have distinct operations (pause/resume, frequency changes, auto-confirm toggling) that need their own server actions or API routes.

**Tasks:**
- Create Server Action or API route: create recurring schedule (called when a donation is logged as recurring in TASK-012)
- Create Server Action or API route: read recurring schedules for the authenticated user (with filtering by status: active/paused)
- Create Server Action or API route: update recurring schedule (edit amount, frequency, organization, cause tag, etc.)
- Create Server Action or API route: pause/resume a schedule (toggle `is_active`)
- Create Server Action or API route: cancel/delete a schedule (soft delete or hard delete — recommend soft delete by setting `is_active = false` and a `cancelled_at` timestamp, so history is preserved)
- Create Server Action or API route: toggle `is_auto_confirm` on a schedule
- All routes must validate the authenticated user
- All routes must respect RLS (user can only modify their own schedules)

**Acceptance Criteria:**
- [ ] All CRUD operations work correctly for recurring schedules
- [ ] Unauthenticated requests return 401
- [ ] Users cannot modify other users' schedules (enforced by RLS)
- [ ] Pause/resume correctly toggles `is_active`
- [ ] Auto-confirm toggle updates `is_auto_confirm`
- [ ] Cancelling a schedule does not delete associated donation history

---

### TASK-018: Build recurring schedule management UI

**Priority:** P1
**Labels:** `feature`, `frontend`
**Depends on:** TASK-012, TASK-017

**Description:**
Build a dedicated view for managing recurring donation schedules. Users should be able to see all their active and paused recurring schedules, and manage them.

**Tasks:**
- Build recurring schedules section within `/donations` or as a `/donations/recurring` sub-page
- List all recurring schedules: organization, amount, frequency, next due date, status (active/paused), auto-confirm status
- Actions per schedule: pause, resume, edit, cancel (delete)
- Edit opens the schedule for modification (amount, frequency, org, cause tag, etc.)
- Cancel requires confirmation dialog
- Show consecutive confirmation count and auto-confirm status

**Acceptance Criteria:**
- [ ] All recurring schedules are listed with correct details
- [ ] User can pause and resume a schedule
- [ ] User can edit schedule fields (amount, frequency, org, etc.)
- [ ] User can cancel/delete a schedule with confirmation
- [ ] Auto-confirm status and confirmation count are visible
- [ ] Responsive on mobile and desktop

---

### TASK-019: Implement recurring donation pending entry generation

**Priority:** P1
**Labels:** `feature`, `backend`, `database`
**Depends on:** TASK-006

**Description:**
Build the backend system that generates pending donation entries based on recurring schedules. This needs a scheduled job that checks which schedules have a `next_due_date` that has passed and creates a pending donation entry.

**Decision needed:** Vercel Cron (via `vercel.json` cron config calling a Next.js API route) vs. Supabase `pg_cron` extension (runs a SQL function directly in the database). Vercel Cron is simpler to set up and debug; `pg_cron` keeps logic in the database and avoids a network round-trip. **Recommendation:** Use Vercel Cron calling a Next.js API route — it's easier to test locally, log, and debug for a solo developer. The API route uses the Supabase service role key (server-side only) to bypass RLS.

**Tasks:**
- Create a Vercel Cron job (configure in `vercel.json`) that runs daily at a fixed UTC time
- Create the API route it calls (e.g. `src/app/api/cron/generate-pending/route.ts`)
- Secure the route: verify the request comes from Vercel Cron via the `CRON_SECRET` header (Vercel sets `Authorization: Bearer <CRON_SECRET>`)
- Query all active recurring_schedules where `next_due_date <= today` and `is_active = true`
- For schedules with `is_auto_confirm = true`, create entries with `status = 'confirmed'`; otherwise `status = 'pending'`
- **Idempotency:** Before creating a pending entry, check that no donation already exists for this schedule + period (e.g., check for an existing donation with the same `recurring_schedule_id` and `donation_date` matching the `next_due_date`). This prevents duplicates if the cron runs multiple times in one day.
- Update the schedule's `next_due_date` based on frequency
- Handle edge cases: schedule created mid-cycle, paused schedules, timezone considerations (use UTC throughout)
- Log function execution for debugging (log number of entries created, any errors)
- After generating pending entries, trigger email notifications (see TASK-020)

**Acceptance Criteria:**
- [ ] Pending entries are created automatically when due date arrives
- [ ] Auto-confirmed schedules create entries with `status = 'confirmed'` directly
- [ ] next_due_date advances correctly for each frequency (weekly/monthly/quarterly/annually)
- [ ] Paused schedules do not generate pending entries
- [ ] No duplicate pending entries for the same period (idempotent on re-run)
- [ ] Cron route is secured and rejects unauthorized requests
- [ ] Function runs reliably on a daily schedule
- [ ] Works correctly in local development (can be triggered manually via API call)

---

### TASK-020: Implement email notifications for pending recurring donations

**Priority:** P1
**Labels:** `backend`, `feature`
**Depends on:** TASK-019
**Blocks:** TASK-033

**Description:**
The PRD requires that users receive notifications to confirm or skip pending recurring donation entries. Without notifications, users won't know they have pending donations unless they proactively open the app. This task implements email notifications as the MVP notification channel.

**Decision needed:** Email provider. **Recommendation:** Use Resend (generous free tier of 3,000 emails/month, simple API, good Next.js integration) or Supabase's built-in email via their auth infrastructure (limited customization). Resend is the better choice for transactional emails.

**Tasks:**
- Set up email provider (Resend recommended): install SDK, configure API key as server-only env var
- Create an email template for pending donation notifications. Content: "You have [N] pending donation(s) to confirm" with a list of pending donations (org name, amount, date) and a direct link to the dashboard/donations page.
- Integrate into the recurring entry generation cron job (TASK-019): after generating pending entries, send one summary email per user with all their new pending donations (not one email per donation)
- Add rate limiting / deduplication: don't email a user if they were already notified today
- Add an unsubscribe mechanism or email preference (can be a simple `email_notifications_enabled` boolean on the `profiles` table for Phase 1)

**Acceptance Criteria:**
- [ ] Users receive an email when new pending donations are generated
- [ ] Email contains a list of pending donations with org names and amounts
- [ ] Email includes a direct link to confirm/skip in the app
- [ ] One summary email per user per day (not one per donation)
- [ ] Users with auto-confirmed schedules don't receive emails for those entries
- [ ] Email preference can be toggled off in settings
- [ ] Emails render correctly on mobile and desktop email clients

---

### TASK-021: Build confirm/skip flow for pending donations

**Priority:** P1
**Labels:** `feature`, `frontend`, `backend`
**Depends on:** TASK-019, TASK-014

**Description:**
Build the UI for users to confirm or skip pending recurring donations. Pending donations should be prominently displayed and easy to action with a single tap.

**Tasks:**
- Display pending donations at the top of the dashboard and/or donation list with visual distinction (different color/border, "Pending" badge)
- Each pending donation shows: confirm button, skip button, edit button
- Confirm: changes status to 'confirmed', increments `consecutive_confirmations` on the schedule
- Skip: changes status to 'skipped', resets `consecutive_confirmations` to 0
- After 3 consecutive confirmations: show a toast/banner offering auto-confirm mode
- Accept auto-confirm: sets `is_auto_confirm = true` on the schedule; future entries auto-confirm
- Build a pending donation count indicator in the navigation (badge on nav item)

**Acceptance Criteria:**
- [ ] Pending donations are visually prominent and easy to find
- [ ] Confirm updates status and increments confirmation count
- [ ] Skip updates status and resets confirmation count
- [ ] After 3 consecutive confirmations, user is prompted to enable auto-confirm
- [ ] Auto-confirm mode works: future entries are created as 'confirmed' directly
- [ ] Navigation shows a count badge for pending donations
- [ ] One-tap confirm works well on mobile

---

## Work Stream 6: Personal Dashboard

### TASK-022: Build dashboard data aggregation layer

**Priority:** P1
**Labels:** `backend`
**Depends on:** TASK-013, TASK-008
**Blocks:** TASK-023, TASK-024, TASK-025, TASK-026, TASK-027, TASK-028

**Description:**
Build the server-side data aggregation queries that power the dashboard. The dashboard charts and summary cards each need specific grouped/aggregated data that goes beyond basic CRUD. This task creates a set of server actions or utility functions that the dashboard components will call.

**Tasks:**
- Create server action: **YTD summary** — returns total amount donated YTD, donation count YTD, and count of pending donations. Only counts donations with `status = 'confirmed'` for totals.
- Create server action: **Salary percentage** — decrypts the user's salary (via TASK-008 helpers), calculates `(YTD confirmed donations / yearly salary) * 100`. Returns the percentage and the current milestone target (1%, 2%, 3%, etc.). Returns `null` if salary is not set (so the UI can show the salary prompt).
- Create server action: **Monthly totals** — returns total donated per calendar month for the past 12 months (for bar chart). Months with no donations return `0`.
- Create server action: **Scope breakdown** — returns total amount and count grouped by scope (local/national/global) for the current year.
- Create server action: **Cause tag breakdown** — returns total amount and count grouped by cause_tag for the current year, sorted by amount descending. Donations with no cause tag are grouped as "Uncategorized".
- Create server action: **Giving streak** — calculates the current consecutive-month streak. Walk backward from the current (or previous) month; a month counts if it has at least one `status = 'confirmed'` donation. Stop at the first month with zero confirmed donations.
- Create server action: **MoM comparison** — returns current month total vs. previous month total, with percentage change.
- Create server action: **YoY comparison** — returns monthly totals for the current year and previous year (24 data points) for side-by-side chart.
- All queries filter to the authenticated user's own data only

**Acceptance Criteria:**
- [ ] All aggregation queries return correct results verified against raw data
- [ ] Salary percentage returns `null` when salary is not set
- [ ] Monthly totals include all 12 months even if some are `$0`
- [ ] Streak calculation correctly handles gaps (resets to 0 at the first missed month)
- [ ] All queries handle edge cases: 0 donations, 1 donation, first month of use, no prior year data
- [ ] Queries are performant (use appropriate indexes from TASK-006)
- [ ] Only confirmed donations count toward totals and streak (pending/skipped are excluded)

---

### TASK-023: Build dashboard page layout with summary cards

**Priority:** P1
**Labels:** `feature`, `frontend`, `charts`
**Depends on:** TASK-005, TASK-022

**Description:**
Build the main `/dashboard` page layout with summary statistic cards at the top and chart slots below. This is the structural foundation for all dashboard widgets.

**Tasks:**
- Build `/dashboard` page with responsive grid layout
- Top row: summary cards (YTD total donated, donation count this year, current giving streak in months, current salary % donated). **Streak definition:** A streak is the number of consecutive calendar months (ending with the current or previous month) in which the user has at least one donation with `status = 'confirmed'`. Pending donations do not count toward the streak. The streak is computed on the fly from donation data (see TASK-022 for the aggregation query), not stored as a column.
- Chart area: responsive grid that stacks on mobile (1-col) and shows 2-col on desktop
- Empty state: if no donations exist, show a welcoming message with CTA to log first donation
- Salary prompt banner: if salary is not set, show "Add your income to unlock percentage-based insights" with link to settings
- Pending donation alert: if pending donations exist, show a banner at the top

**Acceptance Criteria:**
- [ ] Summary cards show correct calculated values
- [ ] Layout is responsive (stacks on mobile, grid on desktop)
- [ ] Empty state displays for new users with no donations
- [ ] Salary prompt appears when salary is not set
- [ ] Pending donation alert appears when pending donations exist

---

### TASK-024: Build monthly donation totals bar chart

**Priority:** P1
**Labels:** `frontend`, `charts`
**Depends on:** TASK-023

**Description:**
Build a bar chart using Recharts showing the total amount donated each month over the past 12 months.

**Tasks:**
- Query donations grouped by month for the past 12 months
- Build a Recharts BarChart with months on the x-axis and total amounts on the y-axis
- Format amounts as currency on y-axis
- Show month abbreviations on x-axis (Jan, Feb, etc.)
- Tooltip on hover showing exact amount and month
- Handle months with $0 donated (show empty bar)
- Responsive sizing (chart resizes with container)

**Acceptance Criteria:**
- [ ] Chart shows correct totals per month
- [ ] Past 12 months are always shown, including $0 months
- [ ] Tooltip shows formatted dollar amount on hover
- [ ] Chart resizes correctly on different screen sizes
- [ ] Renders gracefully with 0, 1, or many donations

---

### TASK-025: Build salary percentage progress ring

**Priority:** P1
**Labels:** `frontend`, `charts`
**Depends on:** TASK-023

**Description:**
Build a circular progress ring showing the percentage of yearly salary donated YTD. The ring targets 1% initially, then advances to 2%, 3%, etc. as each milestone is reached.

**Tasks:**
- Build a circular progress ring component (Recharts RadialBarChart or custom SVG)
- Calculate: (YTD donations / yearly salary) * 100
- Dynamic target: if under 1%, target is 1%. Once 1% is reached, target becomes 2%, then 3%, etc.
- Display: percentage value in center, target label below (e.g., "0.7% of 1% goal")
- Celebration state when a milestone is reached (e.g., green color, checkmark)
- Fallback state when salary is not set: show total donated without percentage, with prompt to add salary

**Acceptance Criteria:**
- [ ] Ring accurately reflects YTD donations as a % of salary
- [ ] Target advances correctly (1% → 2% → 3% as milestones are hit)
- [ ] Celebration visual when a milestone is reached
- [ ] Graceful fallback when salary is not set
- [ ] Responsive sizing

---

### TASK-026: Build scope breakdown pie/donut chart (local/national/global)

**Priority:** P1
**Labels:** `frontend`, `charts`
**Depends on:** TASK-023

**Description:**
Build a pie or donut chart showing the distribution of donations across local, national, and global scopes.

**Tasks:**
- Query donations grouped by scope for the current year
- Build a Recharts PieChart (donut variant) with 3 segments
- Color-code: local (green), national (blue), global (purple) — or similar distinct palette
- Legend showing scope labels with counts and percentages
- Tooltip showing exact amount and count per scope on hover
- Handle case where only 1 or 2 scopes have data

**Acceptance Criteria:**
- [ ] Chart shows correct proportions for each scope
- [ ] Legend is clear and shows both count and percentage
- [ ] Works with 1, 2, or 3 scopes having data
- [ ] Responsive sizing

---

### TASK-027: Build cause tag breakdown chart

**Priority:** P1
**Labels:** `frontend`, `charts`
**Depends on:** TASK-023

**Description:**
Build a chart showing which of the 10 cause categories receive the most donations. This can be a horizontal bar chart or treemap for readability with 10 categories.

**Tasks:**
- Query donations grouped by cause_tag for the current year
- Build a horizontal bar chart (Recharts BarChart with layout="vertical") sorted by amount descending
- Show category name and total amount
- Handle donations with no cause tag (group as "Uncategorized")
- Handle case where user only donates to 1-2 categories

**Acceptance Criteria:**
- [ ] Chart shows all cause categories that have donations
- [ ] Sorted by total donated (highest first)
- [ ] "Uncategorized" group for donations without a cause tag
- [ ] Readable with 1-10 categories
- [ ] Responsive sizing

---

### TASK-028: Build month-over-month and year-over-year comparisons

**Priority:** P1 (PRD lists MoM and YoY as Phase 1 deliverables)
**Labels:** `frontend`, `charts`
**Depends on:** TASK-023

**Description:**
Add comparison metrics to the dashboard showing whether giving is trending up or down compared to previous periods.

**Tasks:**
- Month-over-month: compare current month total to previous month. Show as a percentage change with up/down arrow and color (green = up, red = down, gray = no change)
- Year-over-year: if previous year data exists, show side-by-side bar comparison (current year vs. previous year, month by month)
- Handle first-month and first-year users gracefully (no comparison available, show "—" or "Your first month!")

**Acceptance Criteria:**
- [ ] MoM comparison shows correct percentage change with directional arrow
- [ ] YoY comparison chart renders correctly with two years of data
- [ ] Graceful handling when no prior data exists
- [ ] Responsive on mobile (MoM can be a card, YoY can stack)

---

## Work Stream 7: Settings & Privacy

### TASK-029: Build profile settings page (edit name, bio, salary, photo)

**Priority:** P2
**Labels:** `feature`, `frontend`, `backend`
**Depends on:** TASK-011, TASK-008

**Description:**
Build a settings page where users can edit their profile information after onboarding. This includes the fields set during onboarding plus additional fields like bio and avatar.

**Tasks:**
- Build `/settings` page with profile editing form
- Editable fields: display name, bio (text area, 200 char limit), profile photo upload, salary (exact or range), salary update with "last updated" indicator
- Profile photo upload to Supabase Storage
- Save changes with optimistic UI and toast confirmation
- Annual salary update prompt: if `salary_updated_at` is more than 12 months ago, show a banner suggesting an update
- Email notification preference toggle (enable/disable pending donation emails from TASK-020)

**Acceptance Criteria:**
- [ ] User can edit all profile fields and save
- [ ] Profile photo uploads to Supabase Storage and displays correctly
- [ ] Toast confirms save; errors show clear messages
- [ ] Salary shows "Last updated: [date]" indicator (reads `salary_updated_at`)
- [ ] Annual update prompt appears when salary is stale (>12 months)
- [ ] Email notification toggle works and persists
- [ ] Responsive on mobile and desktop

---

### TASK-030: Build privacy settings page with tier selector

**Priority:** P1
**Labels:** `feature`, `frontend`, `privacy`
**Depends on:** TASK-007, TASK-011

**Description:**
Build the `/settings/privacy` page where users can view and change their privacy tier and customize individual field visibility.

**Tasks:**
- Build `/settings/privacy` page
- Tier selector: 3 visual cards (Private, Friends Only, Open Giver) showing what each tier exposes (use the tier definition table from the PRD)
- Current tier is highlighted; clicking another tier shows a confirmation of what will change
- Custom overrides section (collapsible/expandable "Customize" panel):
  - Toggle: Show donation amounts to followers (Tier 2+)
  - Toggle: Show salary percentage (Tier 2+)
  - Toggle: Show badges (Tier 1+)
  - Toggle: Appear in Explore/Leaderboards (overrides tier default)
- Save changes with toast confirmation
- Changes update the `profiles.privacy_tier` and `privacy_overrides` table

**Acceptance Criteria:**
- [ ] Tier selector clearly shows current tier and what each tier does
- [ ] Changing tier updates defaults for all fields
- [ ] Custom overrides can override individual tier defaults
- [ ] Changes persist to database
- [ ] Confirmation toast on save
- [ ] Responsive layout (cards stack on mobile)

---

## Work Stream 8: Responsive Design & Polish

### TASK-031: Mobile responsiveness pass across all pages

**Priority:** P1
**Labels:** `frontend`, `design`
**Depends on:** TASK-012, TASK-014, TASK-023, TASK-030

**Description:**
Perform a dedicated mobile responsiveness pass across all built pages. Both desktop and mobile are equal priority — both must be first-class experiences.

**Tasks:**
- Test and fix every page at mobile breakpoints (320px, 375px, 428px)
- Test and fix every page at tablet breakpoint (768px)
- Verify touch targets are at least 44x44px on mobile
- Verify form inputs are comfortable to use on mobile (no tiny inputs, proper spacing)
- Verify charts resize and remain readable on mobile
- Verify navigation works correctly on all breakpoints
- Test donation logging flow end-to-end on a mobile viewport — must be completable in under 30 seconds

**Acceptance Criteria:**
- [ ] All pages render correctly at 320px, 375px, 428px, 768px, and 1280px+ widths
- [ ] No horizontal scrolling on any page at any breakpoint
- [ ] Touch targets meet minimum size (44x44px)
- [ ] Charts are readable on mobile screens
- [ ] Donation logging is fast and comfortable on mobile
- [ ] Navigation adapts correctly between mobile and desktop

---

### TASK-032: Loading states, error handling, and toast notifications

**Priority:** P2
**Labels:** `frontend`, `design`
**Depends on:** TASK-012, TASK-014, TASK-023

**Description:**
Add consistent loading states, error handling, and toast notifications across the application. The app should never show a blank screen or fail silently.

**Tasks:**
- Add skeleton loading states for: dashboard charts, donation list, profile data
- Add error boundaries for each major section
- Standardize toast notifications: success (green), error (red), info (blue)
- Handle network errors gracefully (show retry option)
- Add loading spinners on form submissions
- Add optimistic UI updates where appropriate (donation list after add/delete)

**Acceptance Criteria:**
- [ ] Every data-loading page shows a skeleton or spinner while loading
- [ ] Errors show a clear message with retry option
- [ ] Toast notifications are consistent in style and positioning
- [ ] Form submissions show loading state and disable the submit button
- [ ] No blank screens or silent failures

---

## Work Stream 9: End-to-End Verification

### TASK-033: Phase 1 end-to-end verification testing

**Priority:** P1
**Labels:** `setup`
**Depends on:** All previous tasks

**Description:**
Execute the Phase 1 Verification Plan from the PRD. This is a manual end-to-end test to validate everything works together before considering Phase 1 complete.

**Test cases from PRD:**
- [ ] Create an account with salary input; verify salary is stored encrypted and not exposed via API
- [ ] Create an account by skipping salary; verify dashboard shows salary prompt
- [ ] Log 5+ donations across different categories, scopes, and dates
- [ ] Set up a recurring donation and verify pending entries appear on schedule
- [ ] Confirm and skip pending donations; verify auto-confirm offer after 3 confirmations
- [ ] Confirm all dashboard charts render correctly with real data
- [ ] Verify dashboard handles edge cases: 0 donations, 1 donation, many donations
- [ ] Toggle between privacy tiers and verify settings take effect
- [ ] Verify privacy via direct Supabase API calls (not just UI): query another user's data and confirm amounts/salary are hidden
- [ ] Test on desktop viewport (1280px+)
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test Google OAuth login flow end-to-end
- [ ] Test email/password flow including password reset
- [ ] Verify recurring donation email notifications are sent when pending entries are generated
- [ ] Verify logout works from all pages and clears the session

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] No critical bugs found
- [ ] Privacy enforcement verified at the API level
- [ ] Email notifications verified (received, correct content, links work)
- [ ] Mobile and desktop experiences are both polished

---

## Summary

| Work Stream | Task Count | Priority Breakdown |
|-------------|-----------|-------------------|
| 1. Project Setup & Infrastructure | 5 tasks | 5x P0 |
| 2. Database Schema & Privacy Foundation | 3 tasks | 3x P0 |
| 3. Authentication & Onboarding | 3 tasks | 3x P1 |
| 4. Donation Logging | 5 tasks | 5x P1 |
| 5. Recurring Donations | 5 tasks | 5x P1 |
| 6. Personal Dashboard | 7 tasks | 7x P1 |
| 7. Settings & Privacy | 2 tasks | 1x P1, 1x P2 |
| 8. Responsive Design & Polish | 2 tasks | 1x P1, 1x P2 |
| 9. End-to-End Verification | 1 task | 1x P1 |
| **Total** | **33 tasks** | **8x P0, 23x P1, 2x P2** |

### Suggested Execution Order

**Sprint 1 (Week 1-2): Foundation**
TASK-001 → TASK-002, TASK-003 (parallel) → TASK-004 → TASK-005 → TASK-006 → TASK-007, TASK-008 (parallel)

**Sprint 2 (Week 3-4): Auth + Donation Logging**
TASK-009 → TASK-010 → TASK-011 → TASK-012, TASK-013, TASK-017 (parallel) → TASK-014 → TASK-015 → TASK-016

**Sprint 3 (Week 5-7): Recurring + Dashboard**
TASK-018 → TASK-019 → TASK-020 → TASK-021 → TASK-022 → TASK-023 → TASK-024, TASK-025, TASK-026, TASK-027 (parallel) → TASK-028

**Sprint 4 (Week 8-9): Settings + Polish**
TASK-029 → TASK-030 → TASK-031 → TASK-032

**Sprint 5 (Week 10): Verification**
TASK-033
