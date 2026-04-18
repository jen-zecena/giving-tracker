# Figma Make → Production Port Plan (v2)

**Source:** `Charitable-Donations-Tracker` Figma Make project
(`https://www.figma.com/make/YLPPnOcPAkDqwZcB4PKwHe/Charitable-Donations-Tracker`)
**Target:** This repo (`giving-tracker`, Next.js 16 App Router + Supabase + shadcn/ui + Tailwind v4)
**Created:** 2026-04-12

---

## 1. Executive summary

Port **every Figma Make page** (15 pages) to this repo, wiring each to Supabase. The existing open backlog (22 TASK-0xx issues) will be closed — the plan below replaces it with ~52 new **DP-xxx** (Design Port) issues, sequenced into 8 sprints with parallelization noted at each step.

**Key decisions already made:**
- ✅ All 15 pages in scope (core loop + gamification + social + nonprofits + admin)
- ✅ Fine-grained issues with parallelization notes
- ✅ Everything behind auth (no public routes)
- ✅ Admin: `profiles.is_admin` boolean
- ✅ Nonprofit data source: Every.org API
- ✅ USD only (no multi-currency)
- ✅ Recurring donations: cron + confirm/skip + Resend + in-app notifications, **no auto-confirm after 3**
- ✅ Profile photos: placeholder avatars only (follow-up for real uploads)
- ✅ Close (not delete) old issues
- ✅ New issues added to GitHub Project #2
- ✅ Visual refresh to the Dashboard-Design-System-Community style is a **separate follow-up initiative** — not part of this port

---

## 2. Inventory of the Figma Make source (read, verified)

### Styling

- `src/styles/theme.css` — hex tokens (NOT oklch like our current `globals.css`). Primary `#5B5BDB`. Chart palette `#5B5BDB / #8B5CF6 / #10B981 / #F59E0B / #EF4444`. Metric card pastels `#E9E7FD / #EEF2FF / #D1FAE5 / #FEF3C7 / #FEE2E2`. Radius `0.75rem`. Semantic colors (`--success`, `--warning`, `--info`) and custom spacing scale (`--space-xs` through `--space-2xl`).
- Light mode is complete. **Dark mode is mostly default/placeholder oklch values** — the designer didn't finish it.
- `src/styles/tailwind.css` — imports `tailwindcss` + `tw-animate-css`. Compatible with our v4 setup.

### Shell

- `DashboardLayout.tsx` — outer wrapper: 260px left sidebar, sticky top bar with title/subtitle/notifications/add-button, optional 320px right sidebar, content area with 4/6/8 responsive padding.
- `Sidebar.tsx` — 9-item nav (Overview, My Donations, Add Donation, Feed, Discover, Profile, Nonprofits, Personal Goals, Milestones) + Settings at bottom. Mobile: fixed top header, hamburger drawer, 5-item fixed bottom nav (Overview, Donations, Add, Feed, Profile).
- `NotificationsDropdown.tsx` — bell button with unread badge, dropdown with 4 notification types (like/follow/badge/milestone), mark-all-as-read, click-through to `actionUrl`. Currently uses mock notifications.

### Routes (from `src/app/routes.tsx`)

```
/                       → Dashboard
/onboarding             → Onboarding
/my-donations           → MyDonations
/add-donation           → AddDonation
/settings               → Settings
/feed                   → Feed
/discover               → Discover
/profile                → Profile (own)
/profile/:userId        → UserProfile (public view)
/goals                  → Goals
/badges                 → Badges
/nonprofits             → NonprofitDirectory
/nonprofit/:nonprofitId → NonprofitDetail
/admin/review-queue     → AdminReviewQueue
/*                      → NotFound
```

### Data model implied by `lib/storage.ts` + `lib/nonprofits.ts` + `lib/gamification.ts` + `lib/goals.ts`

| Entity | Fields |
|---|---|
| **UserProfile** | name, salary, privacyTier (private/friends/open), onboardingComplete, bio, profilePhoto, showAmountsToFriends, showPercentagePublicly |
| **Donation** | id, userId, amount, organization, date, scope (local/national/global), causeTag, customTag, isRecurring, recurringFrequency, notes, taxDeductible, status (confirmed/pending), hideFromFeed |
| **RecurringSchedule** | amount, organization, frequency, causeTag, scope, startDate, nextDueDate, autoConfirm, confirmationCount, active |
| **Follow** | followerId, followingId, createdAt |
| **FollowRequest** | fromUserId, fromUserName, toUserId, status, createdAt |
| **Like** | userId, donationId, donationUserId, createdAt |
| **Goal** | title, description, type (amount/count/organizations/causes), target, current, timeframe (month/year/ongoing), createdAt |
| **Nonprofit** | ein, name, mission, category[], subcategory, location, website, donationUrl, verified, ratings[], logoUrl, description, founded, size, revenue, flagged, flagCount, tags[] |
| **NonprofitFlag** | nonprofitId, userId, userName, reason (fraud/outdated/duplicate/inappropriate/other), description, status (pending/reviewed/resolved/dismissed), adminNotes |
| **Badge** | Fully **derived** from donations — no table. 18 hardcoded badges across 5 categories: milestone, consistency, cause, impact, (social unused) |
| **Notification** | type (like/follow/badge/milestone), title, message, time, read, actionUrl |

### External packages the Figma Make project uses

**Must add to our repo:**
- `recharts` (area/pie/line charts — actively used by Dashboard)
- `react-countup` (animated metric numbers)
- `react-hook-form` (forms)
- `canvas-confetti` (celebrations on milestones — used in `lib/celebrations.ts`)
- `date-fns` (likely already present — confirm)
- `lucide-react` (likely already present)
- `sonner` (toasts — shadcn has it)
- `resend` + `react-email` (for recurring donation emails)
- Every.org API client (built-in fetch — no package needed)

**Can skip:**
- `@mui/material`, `@mui/icons-material` — legacy Figma Make bootstrap, not actually used in the pages I read
- `react-router` — replaced by Next.js App Router
- `react-dnd`, `react-slick`, `react-responsive-masonry`, `embla-carousel-react` — not used in any page we're porting
- `motion` (framer-motion) — only used for minor effects; Tailwind animations are enough

### shadcn/ui components the Figma Make project uses

All standard. These need to be installed in our repo if not already present:
accordion, alert-dialog, alert, avatar, badge, breadcrumb, button, calendar, card, checkbox, collapsible, dialog, drawer, dropdown-menu, form, input, label, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, sonner (toast), switch, table, tabs, textarea, tooltip.

### Key product rules learned from reading the pages

- **Privacy tiers** are enforced at render time in the Figma, but for production they must be enforced at the **RLS level**:
  - `private` — not discoverable, donations only visible to owner
  - `friends` — followers can see activity, amounts hidden by default (unless `showAmountsToFriends` is on)
  - `open` — publicly discoverable, amounts visible when `showAmountsToFriends`/`showPercentagePublicly` are on
- **Follow flow**: direct follow for `open` profiles, **follow request** required for `friends` profiles
- **UserProfile page** (public): if you don't have permission, renders "This profile is private"
- **Onboarding** = 4 steps (welcome → name → salary → privacy)
- **AddDonation** has a **Quick mode** (amount + org + date) and **Full mode** (all fields)
- **MyDonations** has **CSV export** built in
- **Badges** are 18 hardcoded, fully derived from donations — no table needed
- **Goals** are 4 types (amount, count, organizations, causes) with 3 timeframes (month, year, ongoing)
- **NonprofitDetail** has a flag dialog with 5 reasons (fraud/outdated/duplicate/inappropriate/other)
- **AdminReviewQueue** shows 4 stats (pending/resolved/dismissed/total) + 3 tabs (pending/reviewed/dismissed)
- **Streak** is computed as "consecutive months with at least one donation, counted within 31 days of today"

---

## 3. Target data model (Supabase)

Existing tables (already created, will be kept):
- `profiles` — add `is_admin boolean default false` + any fields missing from the Figma schema
- `donations` — add `hide_from_feed boolean default false`, `custom_tag text`, `notes text`, `tax_deductible boolean`, confirm columns match Figma shape
- `recurring_schedules` — already exists; remove `auto_confirm` semantics (column can stay, just unused)

New tables:
- `follows` (follower_id, following_id, created_at) — unique(follower_id, following_id)
- `follow_requests` (from_user_id, to_user_id, status, created_at) — unique(from_user_id, to_user_id)
- `likes` (user_id, donation_id, donation_user_id, created_at) — unique(user_id, donation_id)
- `goals` (user_id, title, description, type, target, current, timeframe, created_at)
- `notifications` (user_id, type, title, message, read, action_url, created_at, metadata jsonb)
- `nonprofits` (ein, name, mission, category[], location, website, donation_url, verified, logo_url, description, founded, size, revenue, tags[], synced_at) — primary key on `id` (uuid), unique on `ein`
- `nonprofit_flags` (nonprofit_id, user_id, reason, description, status, admin_notes, created_at)

RLS policies:
- Owner-only on: `goals`, `notifications`, `nonprofit_flags.user_id = auth.uid()` for insert, admin-only for update
- Social-aware on `donations`, `likes`, `follows`, `follow_requests`: tier-based SELECT
- `nonprofits` — public SELECT for authed users, INSERT/UPDATE admin-only (populated by sync job)
- `profiles` — admin-aware: admins can read all, non-admins can read own + followed (if tier allows)

---

## 4. Route mapping (Figma SPA → our App Router)

| Figma path | Our path | Route group |
|---|---|---|
| `/` | `/dashboard` (with `/` → redirect to `/dashboard` after auth) | `(app)` |
| `/onboarding` | `/onboarding` | `(auth)` |
| `/my-donations` | `/donations` | `(app)` |
| `/add-donation` | `/donations/new` | `(app)` |
| `/settings` | `/settings` | `(app)` |
| `/feed` | `/feed` | `(app)` |
| `/discover` | `/discover` | `(app)` |
| `/profile` | `/profile` | `(app)` |
| `/profile/:userId` | `/profile/[userId]` | `(app)` (behind auth per decision) |
| `/goals` | `/goals` | `(app)` |
| `/badges` | `/badges` | `(app)` |
| `/nonprofits` | `/nonprofits` | `(app)` |
| `/nonprofit/:id` | `/nonprofits/[id]` | `(app)` (singular/plural normalized) |
| `/admin/review-queue` | `/admin/review-queue` | `(app)` with admin middleware |

---

## 5. Theme token diff: current `globals.css` vs Figma `theme.css`

The current `globals.css` uses **oklch** everywhere. Figma uses **hex**. Both are shadcn-compatible. DP-001 swaps the values (keeping shadcn token names) and adds the missing custom tokens (metric pastels, semantic colors, spacing scale).

| Token | Current (oklch) | Figma (hex) |
|---|---|---|
| `--background` | `oklch(0.985 0 0)` | `#F7F9FB` |
| `--primary` | `oklch(0.55 0.18 250)` | `#5B5BDB` |
| `--accent` | `oklch(0.65 0.17 160)` | `#E9E7FD` |
| `--chart-1` | `oklch(0.55 0.18 250)` | `#5B5BDB` |
| `--chart-2` | `oklch(0.65 0.17 160)` | `#8B5CF6` |
| `--chart-3` | `oklch(0.6 0.15 200)` | `#10B981` |
| `--chart-4` | `oklch(0.7 0.12 180)` | `#F59E0B` |
| `--chart-5` | `oklch(0.45 0.14 250)` | `#EF4444` |
| `--radius` | `0.625rem` | `0.75rem` |

**New tokens Figma adds (not in current globals.css):**
`--metric-purple`, `--metric-blue`, `--metric-green`, `--metric-yellow`, `--metric-red`, `--success`, `--warning`, `--info`, `--space-xs` through `--space-2xl`, `--input-background`, `--switch-background`.

**Dark mode caveat:** Figma's dark mode block is mostly un-customized shadcn defaults (oklch greys). We'll either (a) ship light-only and mark dark-mode as a separate follow-up, or (b) derive a dark palette from the hex light palette. **Question for you — see §10.**

---

## 6. Sprint structure

```
Sprint 0 — Foundation (8 issues, mostly parallel)
   ↓ gates everything
Sprint 1 — Core loop port (7 issues, high parallelism)
   ↓ gates Dashboard richness
Sprint 2 — Shared components + notifications plumbing (5 issues, parallel)
   ↓
Sprint 3 — Gamification (7 issues, high parallelism)
Sprint 4 — Social (8 issues, RLS rewrite gates feed/public profile)
Sprint 5 — Recurring donations (rebuilt with Figma style) (7 issues, mostly sequential)
Sprint 6 — Nonprofits (7 issues, design-first then backend)
Sprint 7 — Polish + cleanup (6 issues)
```

Parallelization notation in each issue: **`⇅ parallel with`** lists issues that can run at the same time. **`← depends on`** lists blocking predecessors.

---

## 7. The issue list

### Sprint 0 — Foundation

#### DP-001 — Adopt Figma theme tokens in `globals.css`

**Labels:** `design`, `frontend`, `P0`
**Depends on:** *(nothing)*
**Parallel with:** DP-002, DP-003, DP-005, DP-006

**Description**
Replace current oklch token values in `src/app/globals.css` with the hex values from Figma Make's `theme.css`. Preserve shadcn token names. Add the new tokens Figma introduces (metric pastels, semantic colors, spacing scale). Dark mode block pending a follow-up decision (see DP-072).

**Tasks**
- [ ] Update `:root` with Figma hex values for all shadcn tokens
- [ ] Add `--metric-purple/blue/green/yellow/red` under `@theme inline`
- [ ] Add `--success`, `--warning`, `--info` semantic colors
- [ ] Add `--space-xs` through `--space-2xl` scale
- [ ] Update `--radius` from `0.625rem` to `0.75rem`
- [ ] Update `--chart-1…5` to Figma values
- [ ] Screenshot every existing page before + after (dashboard, donations, new, login)
- [ ] Leave a comment block at top of `globals.css` noting the tokens are from Figma Make

**Acceptance criteria**
- [ ] All existing pages render without console errors
- [ ] No regression in login/register/onboarding/dashboard/donations flows
- [ ] `--metric-*`, `--success`, `--warning`, `--info`, `--space-*` are usable as Tailwind classes (`bg-[--metric-purple]` or via theme inline)
- [ ] `npm run lint` and `npm run build` pass

---

#### DP-002 — Install runtime dependencies

**Labels:** `setup`, `P0`
**Depends on:** *(nothing)*
**Parallel with:** DP-001, DP-003, DP-005, DP-006

**Description**
Install Figma Make's runtime dependencies that we don't already have.

**Tasks**
- [ ] `npm i recharts react-countup react-hook-form canvas-confetti`
- [ ] `npm i date-fns lucide-react` if missing
- [ ] `npm i resend react-email` (for Sprint 5)
- [ ] Verify no peer dep conflicts with Next.js 16 + React
- [ ] Add an `ATTRIBUTIONS.md` entry if required by licenses

**Acceptance criteria**
- [ ] `npm run build` succeeds
- [ ] No console warnings about peer deps
- [ ] `package.json` has all listed packages

---

#### DP-003 — Install shadcn/ui components used by Figma

**Labels:** `setup`, `design`, `P0`
**Depends on:** *(nothing)*
**Parallel with:** DP-001, DP-002, DP-005, DP-006

**Description**
Install the shadcn/ui components the ported pages will need. Use the shadcn CLI, one command per component is fine.

**Tasks**
- [ ] Install: `accordion alert-dialog alert avatar badge button calendar card checkbox collapsible dialog drawer dropdown-menu form input label popover progress radio-group scroll-area select separator sheet skeleton sonner switch table tabs textarea tooltip`
- [ ] Ensure `components.json` path aliases match `@/components/ui/*`
- [ ] Verify sonner Toaster is mounted in the root layout

**Acceptance criteria**
- [ ] All listed components exist under `src/components/ui/`
- [ ] Demo route or Storybook (optional) shows each component rendering
- [ ] Sonner `<Toaster />` is in `src/app/layout.tsx` at the root

---

#### DP-004 — Port `DashboardLayout` shell into `(app)` route group

**Labels:** `design`, `frontend`, `P0`
**Depends on:** DP-001, DP-003
**Parallel with:** *(nothing — gate for every page port)*

**Description**
Replace our current `components/nav/app-shell.tsx` with a port of Figma's `DashboardLayout.tsx` + `Sidebar.tsx`. SPA router calls become Next.js `Link` + `usePathname`. The new shell provides: 260px left sidebar (9 items), sticky top bar (title/subtitle/notifications/add-button), optional 320px right sidebar slot (prop), content area with responsive padding. Mobile: top header with hamburger, drawer sidebar, 5-item fixed bottom nav. Hard-coded `#5B5BDB` references become `bg-primary` / `text-primary`.

**Tasks**
- [ ] Rewrite `src/components/nav/app-shell.tsx` (keep file location)
- [ ] Rewrite `src/components/nav/sidebar.tsx`
- [ ] Add `src/components/nav/notifications-dropdown.tsx` (shell only, mock data — real wiring in DP-023)
- [ ] Add `src/components/nav/bottom-nav.tsx` (mobile bottom 5-item)
- [ ] Add `DashboardLayoutProps` typed shell with `title`, `subtitle`, `rightSidebar`, `showAddButton`, `showSearch` slots
- [ ] Convert all hard-coded hex (`#5B5BDB`, `#4a4ab8`) to theme tokens (`bg-primary hover:bg-primary/90`)
- [ ] Wire active-state via `usePathname()` with the same `isActive` rules (startsWith for non-root)
- [ ] Verify keyboard nav (Tab, Esc on drawer)
- [ ] Screenshot at 375px, 768px, 1280px

**Acceptance criteria**
- [ ] Every page in `(app)/**` renders inside the new shell
- [ ] Active nav item highlights on route change
- [ ] Mobile drawer opens/closes, bottom nav visible, top header visible
- [ ] No hard-coded hex values remain in the shell files
- [ ] Screenshots match Figma to reasonable tolerance

---

#### DP-005 — DB migration: add `profiles.is_admin` + missing donation columns

**Labels:** `database`, `P0`
**Depends on:** *(nothing)*
**Parallel with:** DP-001, DP-002, DP-003, DP-006

**Description**
Add the profile + donation columns that the Figma data model needs but our current schema lacks.

**Tasks**
- [ ] Migration: `alter table profiles add column is_admin boolean default false`
- [ ] Migration: `alter table profiles add column bio text, add column profile_photo text, add column show_amounts_to_friends boolean default false, add column show_percentage_publicly boolean default false` (if missing)
- [ ] Migration: `alter table donations add column hide_from_feed boolean default false, add column custom_tag text, add column notes text, add column tax_deductible boolean default true` (if missing — audit first)
- [ ] Regenerate TypeScript types from Supabase

**Acceptance criteria**
- [ ] Migration runs clean on a fresh dev DB
- [ ] `is_admin` default is false
- [ ] Supabase types regenerated and committed
- [ ] Existing server actions still compile

---

#### DP-006 — DB migration: new tables (follows, follow_requests, likes, goals, notifications, nonprofits, nonprofit_flags)

**Labels:** `database`, `P0`
**Depends on:** *(nothing)*
**Parallel with:** DP-001, DP-002, DP-003, DP-005

**Description**
Create all new tables for social, gamification, notifications, and nonprofits. Column shapes must match §3 (`follows`, `follow_requests`, `likes`, `goals`, `notifications`, `nonprofits`, `nonprofit_flags`). Indexes on hot columns (follower_id, following_id, user_id, donation_id, created_at DESC for feeds, `ein` unique for nonprofits).

**Tasks**
- [ ] Write migration SQL per §3
- [ ] Add composite unique constraints (`follows(follower_id, following_id)`, `follow_requests(from_user_id, to_user_id)`, `likes(user_id, donation_id)`, `nonprofits(ein)`)
- [ ] Add indexes: `donations(user_id, date desc)`, `follows(follower_id)`, `follows(following_id)`, `notifications(user_id, read, created_at desc)`, `nonprofit_flags(status)`, `nonprofits(name, category)`
- [ ] Regenerate Supabase types
- [ ] No RLS yet (DP-007 covers it)

**Acceptance criteria**
- [ ] Migration runs clean
- [ ] Types regenerated
- [ ] Each table has a primary key, correct defaults, and the indexes/constraints listed above

---

#### DP-007 — RLS policies for all new + modified tables

**Labels:** `database`, `privacy`, `P0`
**Depends on:** DP-005, DP-006
**Parallel with:** *(none — DP-046 will tighten donations RLS later)*

**Description**
First pass at RLS. Owner-only on `goals`, `notifications`, `nonprofit_flags` (insert). Admin-aware on `nonprofits` (read for all, write admin-only). `follows`, `follow_requests`, `likes` get initial owner-write + permissive read — tightened by DP-046 when social lands. `donations` gets initial owner-read + authenticated-other-read (temporarily), to be tightened by DP-046.

**Tasks**
- [ ] `goals`: owner CRUD only
- [ ] `notifications`: owner read/update, server-side insert via service role
- [ ] `nonprofit_flags`: owner insert, admin update, everyone read flags on their own nonprofit view
- [ ] `nonprofits`: authenticated read, admin insert/update
- [ ] `follows`: follower inserts own row, both parties can read rows where they're involved
- [ ] `follow_requests`: sender inserts, sender/receiver read, receiver updates status
- [ ] `likes`: owner insert/delete, read open
- [ ] `profiles`: owner read/update, admin read all, tier-aware read for non-owners (placeholder — tightened later)
- [ ] Admin helper function `is_admin()` using `auth.jwt()` or profile lookup

**Acceptance criteria**
- [ ] All policies enabled on affected tables
- [ ] Unit tests (pgtap or manual curl) verify owner-only paths
- [ ] Non-admin cannot insert into `nonprofits`
- [ ] Admin can read all flags

---

#### DP-008 — Root redirect + admin route middleware

**Labels:** `backend`, `frontend`, `P0`
**Depends on:** DP-005, DP-007
**Parallel with:** DP-004

**Description**
Wire auth-aware root redirect (`/` → `/dashboard` if authed, `/` → landing if not) and admin middleware (`/admin/**` requires `profiles.is_admin`).

**Tasks**
- [ ] Update `src/app/page.tsx` to redirect based on auth state
- [ ] Add `src/middleware.ts` or server-component guard for `/admin/*`
- [ ] Non-admin visiting `/admin/*` → 404 or forbidden page
- [ ] E2E smoke test for both paths

**Acceptance criteria**
- [ ] Authed user lands on `/dashboard`
- [ ] Unauthed user lands on landing page
- [ ] Non-admin gets 404 on `/admin/review-queue`
- [ ] Admin can access `/admin/review-queue`

---

### Sprint 1 — Core loop port

#### DP-010 — Dashboard aggregation layer (server queries)

**Labels:** `backend`, `P0`
**Depends on:** DP-005, DP-006, DP-007
**Parallel with:** DP-012, DP-013, DP-014, DP-015, DP-016

**Description**
Server queries that power the Dashboard: YTD total, organizations supported, this-month total, MoM %, YoY %, monthly breakdown (area chart data), scope breakdown (pie chart data), cause breakdown (bar list data), most recent donations (right sidebar). Type-safe, paginated only if needed.

**Tasks**
- [ ] Create `src/lib/queries/dashboard.ts` with one exported function per card/chart
- [ ] All queries respect owner RLS
- [ ] Add a `DashboardData` aggregated type
- [ ] Cache with Next.js `unstable_cache` or `revalidate` (TBD per Cache Components docs)
- [ ] Unit tests for each query

**Acceptance criteria**
- [ ] All functions return correct shape for ported Figma Dashboard
- [ ] Empty state returns zeros/empty arrays (not throws)
- [ ] Tests pass

---

#### DP-011 — Port Dashboard page

**Labels:** `design`, `frontend`, `charts`, `P0`
**Depends on:** DP-004, DP-010, (DP-020, DP-021 for WelcomeChecklist + InsightsCard — can land without them initially with placeholders)
**Parallel with:** DP-012, DP-013, DP-014, DP-015, DP-016

**Description**
Port Figma's `Dashboard.tsx` into `src/app/(app)/dashboard/page.tsx`. RSC-first, data from DP-010. Right-sidebar content (Recent Activity + Quick Stats) passed as a prop to `AppShell`. Empty state when user has zero donations.

**Tasks**
- [ ] Scaffold dashboard page as RSC
- [ ] 4 metric cards (Total Donated, Organizations, This Month, Giving Streak) with pastel backgrounds `--metric-purple`, `--metric-blue`, `--metric-green`, `--metric-yellow`
- [ ] Animated number count-up using `react-countup` (client boundary only for that)
- [ ] Area chart (Recharts) for monthly donations
- [ ] Donut chart (Recharts) for scope breakdown
- [ ] Progress-bar list for cause breakdown (top 6)
- [ ] Right sidebar: Recent Activity list + Quick Stats gradient card
- [ ] Empty state CTA → `/donations/new`
- [ ] Skeletons for loading

**Acceptance criteria**
- [ ] Matches Figma at desktop (≥1280px)
- [ ] Mobile + tablet responsive
- [ ] Empty state visible when no donations
- [ ] Chart colors use `--chart-1…5` tokens (not hex literals)
- [ ] 2 agent-browser screenshot comparison rounds passed

---

#### DP-012 — Port Add Donation page (Quick + Full mode)

**Labels:** `design`, `frontend`, `P0`
**Depends on:** DP-001, DP-003, DP-004
**Parallel with:** DP-010, DP-011, DP-013, DP-014, DP-015, DP-016

**Description**
Rewrite `src/app/(app)/donations/new/page.tsx` to match Figma's `AddDonation.tsx`. Quick mode (amount + org + date presets) and Full mode (all fields: cause, scope, custom tag, tax deductible, recurring toggle + frequency, notes). Organization autocomplete from user's own history. Celebratory toasts on first donation / $1000+ / recurring / milestone counts.

**Tasks**
- [ ] Port quick/full toggle with purple gradient header
- [ ] Port organization autocomplete (query user's own past donations)
- [ ] Port date quick-presets (Today, Yesterday, Last Week, Pick Date)
- [ ] Wire to existing server action (or update it to match new fields — `custom_tag`, `notes`, `tax_deductible`, `hide_from_feed`)
- [ ] Port toast logic (first donation, $1000+, recurring, 10/25/50/100 milestones)
- [ ] When recurring, also create a row in `recurring_schedules`
- [ ] Replace hard-coded `#5B5BDB` with `bg-primary`

**Acceptance criteria**
- [ ] Both modes work end-to-end against Supabase
- [ ] Organization autocomplete returns unique orgs from user's history
- [ ] Date presets update the field
- [ ] Recurring toggle creates both a donation and a schedule row
- [ ] Toasts show per Figma copy

---

#### DP-013 — Port My Donations page

**Labels:** `design`, `frontend`, `P0`
**Depends on:** DP-001, DP-003, DP-004
**Parallel with:** DP-010, DP-011, DP-012, DP-014, DP-015, DP-016

**Description**
Rewrite `src/app/(app)/donations/page.tsx` to match Figma's `MyDonations.tsx`. 3 summary cards (count, total, organizations), filter row (search + cause + year + sort), list with row actions (edit, delete). CSV export. Replace browser `confirm()` with `AlertDialog`.

**Tasks**
- [ ] Port summary cards (purple/green/blue pastels)
- [ ] Port filter bar (search input + 3 selects)
- [ ] Port donation row (organization, cause badge, scope badge, recurring badge, date, amount, edit/delete icons)
- [ ] Wire filter/sort to URL search params
- [ ] CSV export using client-side blob download
- [ ] Delete confirmation with `AlertDialog` (not browser `confirm`)
- [ ] Empty state: "No donations yet" vs "No donations match filters"

**Acceptance criteria**
- [ ] Filters/sort/search update the list
- [ ] CSV export downloads correct shape
- [ ] Delete removes the row after confirmation + shows toast
- [ ] Empty states match Figma

---

#### DP-014 — Port Onboarding wizard (4 steps)

**Labels:** `design`, `frontend`, `privacy`, `P0`
**Depends on:** DP-001, DP-003
**Parallel with:** DP-010, DP-011, DP-012, DP-013, DP-015, DP-016

**Description**
Rewrite `src/app/(auth)/onboarding/*` to match Figma's `Onboarding.tsx`. 4 steps: welcome, name, salary (optional), privacy tier (with 3 visual cards). Final step sets `profiles.onboarding_complete = true`.

**Tasks**
- [ ] 4-step state machine (`welcome | name | salary | privacy`)
- [ ] Port welcome step (3 numbered features)
- [ ] Port name step
- [ ] Port salary step (optional, uses existing encryption helper)
- [ ] Port privacy step (3 radio cards with Shield / Users / Globe icons)
- [ ] Final submit writes profile + redirects to `/dashboard`

**Acceptance criteria**
- [ ] Back/next navigation preserves state
- [ ] Salary encrypts via existing helper (no plaintext storage)
- [ ] Privacy tier stored correctly
- [ ] Redirect to `/dashboard` on complete

---

#### DP-015 — Port Settings page

**Labels:** `design`, `frontend`, `privacy`, `P0`
**Depends on:** DP-001, DP-003, DP-004
**Parallel with:** DP-010, DP-011, DP-012, DP-013, DP-014, DP-016

**Description**
Rewrite `src/app/(app)/settings/page.tsx` to match Figma's `Settings.tsx`. 3 cards: Profile (name, bio, salary), Privacy (tier selector with visual cards + tier-specific feature lists), Data Management (CSV export placeholder, delete account placeholder).

**Tasks**
- [ ] Port profile card (name, bio, salary inputs)
- [ ] Port privacy card with 3 visual tier cards
- [ ] Port tier-specific feature bullet lists
- [ ] Port "Privacy Protection" info banner
- [ ] Port Data Management card (both actions disabled with "follow-up" labels)
- [ ] Wire save to existing profile server action
- [ ] Settings lives inside `AppShell` (unlike Figma which uses its own layout)

**Acceptance criteria**
- [ ] Save updates profile in Supabase
- [ ] Privacy tier change persists
- [ ] Visual matches Figma

---

#### DP-016 — Port own Profile page (with empty followers/following)

**Labels:** `design`, `frontend`, `P0`
**Depends on:** DP-001, DP-003, DP-004
**Parallel with:** DP-010, DP-011, DP-012, DP-013, DP-014, DP-015

**Description**
Rewrite `src/app/(app)/profile/page.tsx` to match Figma's `Profile.tsx`. Header (avatar, name, bio, privacy tier badge, Edit Profile button), 3 stats (total donated, count, followers), 3 tabs (Overview / Followers / Following). In this sprint, Followers/Following tabs show empty state — DP-047 wires them to real data.

**Tasks**
- [ ] Port profile header with gradient avatar placeholder
- [ ] Port 3 stat cards (purple/blue/green pastels)
- [ ] Port tabs (Overview / Followers / Following)
- [ ] Overview tab: recent 5 donations
- [ ] Followers/Following tabs: empty state placeholders
- [ ] Edit Profile → `/settings`

**Acceptance criteria**
- [ ] Stats reflect real user data
- [ ] Recent donations load from Supabase
- [ ] Empty states visible on Followers/Following (since no social data yet)
- [ ] Avatar shows first initial in gradient circle

---

### Sprint 2 — Shared components + notifications plumbing

#### DP-020 — Port `WelcomeChecklist` component

**Labels:** `design`, `frontend`, `P1`
**Depends on:** DP-001, DP-003
**Parallel with:** DP-021, DP-022, DP-023, DP-024

**Description**
Port Figma's `WelcomeChecklist.tsx` as a reusable client component. 4 items (profile/donation/goal/nonprofit), progress bar, dismiss button (persists via `localStorage` keyed as `hasSeenWelcome`). Used on Dashboard.

**Tasks**
- [ ] `src/components/welcome-checklist.tsx`
- [ ] Check completion from profile/donations/goals queries
- [ ] Dismissible with localStorage persistence
- [ ] `bg-primary` / `bg-accent` tokens, not hex

**Acceptance criteria**
- [ ] Shows for new users on Dashboard
- [ ] Items check off as the user completes them
- [ ] Dismiss hides permanently across sessions

---

#### DP-021 — Port `InsightsCard` component

**Labels:** `design`, `frontend`, `P1`
**Depends on:** DP-001, DP-003, DP-010
**Parallel with:** DP-020, DP-022, DP-023, DP-024

**Description**
Port Figma's `InsightsCard.tsx`. Generates up to 3 insights from donation data: MoM %, top cause, unique orgs this month, recurring consistency, most generous month. Used on Dashboard when `donations.length > 0`.

**Tasks**
- [ ] `src/components/insights-card.tsx`
- [ ] Port insight computation logic
- [ ] Use Dashboard aggregation layer (DP-010) where possible
- [ ] Icon + text row layout matching Figma

**Acceptance criteria**
- [ ] Shows 0–3 insights based on data
- [ ] No insights shown when data is empty (Dashboard hides the card)
- [ ] Hover state + styling match Figma

---

#### DP-022 — Port `EmptyState` component

**Labels:** `design`, `frontend`, `P1`
**Depends on:** DP-001, DP-003
**Parallel with:** DP-020, DP-021, DP-023, DP-024

**Description**
Shared empty-state component used by Dashboard, MyDonations, Feed, Discover, Nonprofits, Goals, Badges. Props: icon, title, description, action (label + handler).

**Tasks**
- [ ] `src/components/empty-state.tsx`
- [ ] Flexible layout: icon / title / description / optional CTA
- [ ] Matches Figma styling

**Acceptance criteria**
- [ ] Used by at least 2 pages in current sprint
- [ ] Icon prop accepts any `lucide-react` icon

---

#### DP-023 — NotificationsDropdown — real wiring

**Labels:** `backend`, `frontend`, `P1`
**Depends on:** DP-006, DP-007, DP-004
**Parallel with:** DP-020, DP-021, DP-022, DP-024

**Description**
Replace the mocked notifications in the shell's `NotificationsDropdown` with real queries against the `notifications` table. Server component for initial load, client component for mark-as-read interactions. Show unread count badge. "Mark all as read" bulk action.

**Tasks**
- [ ] Server query: latest 20 notifications for current user
- [ ] Server action: mark single as read
- [ ] Server action: mark all as read
- [ ] Click-through navigates to `action_url`
- [ ] Unread count badge in the bell icon
- [ ] Icons per type (like/follow/badge/milestone)

**Acceptance criteria**
- [ ] Real notifications display when rows exist in the table
- [ ] Empty state visible when no notifications
- [ ] Mark-as-read updates the row + removes the unread dot
- [ ] Unread count is accurate

---

#### DP-024 — Notification emit helpers

**Labels:** `backend`, `P1`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-020, DP-021, DP-022, DP-023

**Description**
Central module `src/lib/notifications.ts` with helpers to create notification rows. Other features call these when events happen. Examples: `notifyFollow(from, to)`, `notifyLike(fromName, donation)`, `notifyBadgeEarned(userId, badge)`, `notifyMilestone(userId, milestone)`. Each inserts a row into `notifications` with correct type + `action_url`.

**Tasks**
- [ ] `notifyFollow`, `notifyFollowRequest`, `notifyLike`, `notifyBadgeEarned`, `notifyMilestone` functions
- [ ] All writes respect the recipient user's notification preferences (add `profiles.email_notifications boolean` if needed — decide in DP-054)
- [ ] Unit tests

**Acceptance criteria**
- [ ] Helpers insert correct shape into `notifications` table
- [ ] Other sprints can call these helpers without duplicating insert logic

---

### Sprint 3 — Gamification

#### DP-030 — Goals: server actions (CRUD)

**Labels:** `backend`, `P1`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-032, DP-034

**Description**
Server actions for creating, reading, updating, and deleting goals. Goals are owner-only. The `current` value is computed server-side from donations based on `type` and `timeframe` (not stored, always derived).

**Tasks**
- [ ] `createGoal`, `listGoals`, `updateGoal`, `deleteGoal` in `src/lib/actions/goals.ts`
- [ ] `current` is derived per-goal-type from donations query
- [ ] Types for Goal (shared `src/types/goals.ts`)
- [ ] Zod validation on inputs
- [ ] Unit tests for each action + derivation logic

**Acceptance criteria**
- [ ] All 4 goal types compute `current` correctly
- [ ] Timeframe filtering (month/year/ongoing) works
- [ ] Non-owner cannot read another user's goal

---

#### DP-031 — Port Goals page

**Labels:** `design`, `frontend`, `P1`
**Depends on:** DP-004, DP-022, DP-030
**Parallel with:** DP-033, DP-035, DP-040, DP-041, DP-042

**Description**
Port Figma's `Goals.tsx` to `src/app/(app)/goals/page.tsx`. Info banner, create-goal dialog, goal cards with progress bars, quick-stats footer.

**Tasks**
- [ ] Create-goal dialog (4 types × 3 timeframes)
- [ ] Goal card with progress bar, complete state (green), delete action with AlertDialog
- [ ] Quick stats footer (completed / in-progress / total)
- [ ] Empty state using DP-022 EmptyState

**Acceptance criteria**
- [ ] Create/delete goals works end-to-end
- [ ] Progress bars reflect derived current value
- [ ] Complete state shows green background
- [ ] Matches Figma visually

---

#### DP-032 — Badges: server-side computation layer

**Labels:** `backend`, `P1`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-030, DP-034

**Description**
Port Figma's `lib/gamification.ts` badge list (18 badges across 5 categories) as a server-side computation. Returns an array of `Badge` objects with `earned`, `progress`, `target` fields computed from the user's donations + profile. **No `badges` table** — everything derived.

**Tasks**
- [ ] `src/lib/queries/badges.ts` with `getBadges(userId)` returning `Badge[]`
- [ ] Port the 18 badge definitions
- [ ] Port percentage-of-salary calculation (using existing decryption helper for salary)
- [ ] Port streak calculation (consecutive months with donations, within 31 days)
- [ ] Sort so earned badges come first
- [ ] Unit tests for each category

**Acceptance criteria**
- [ ] All 18 badges computed correctly
- [ ] Salary-based badges work when salary is set and gracefully skip when not
- [ ] Cause-based badges reflect `causeTag` counts

---

#### DP-033 — Port Badges page

**Labels:** `design`, `frontend`, `P1`
**Depends on:** DP-004, DP-032
**Parallel with:** DP-031, DP-035, DP-040, DP-041, DP-042

**Description**
Port Figma's `Badges.tsx` to `src/app/(app)/badges/page.tsx`. Progress summary card, category filter pills, 3 tabs (Earned / In Progress / All), responsive grid of badge cards.

**Tasks**
- [ ] Summary card with progress bar + % complete
- [ ] Category filter (5 pills: All / Milestones / Consistency / Causes / Impact)
- [ ] Tabs
- [ ] Badge card with emoji icon, name, description, progress bar, earned date
- [ ] Locked-state: opacity reduced, "Locked" badge

**Acceptance criteria**
- [ ] Tab switching filters correctly
- [ ] Category pill filters correctly
- [ ] Earned badges styled green, in-progress blue, locked gray

---

#### DP-034 — Streak calculation query

**Labels:** `backend`, `P1`
**Depends on:** DP-006
**Parallel with:** DP-030, DP-032

**Description**
Extract streak calculation as a standalone query used by both Dashboard (DP-010) and Badges (DP-032). Avoid duplicating the logic.

**Tasks**
- [ ] `getStreak(userId)` returning `{ current, longest, lastDonationDate }`
- [ ] Implementation matches Figma's `calculateStreak`

**Acceptance criteria**
- [ ] Function returns correct values for sample fixtures
- [ ] Used by DP-010 dashboard aggregation

---

#### DP-035 — Integrate streak + badges into Dashboard

**Labels:** `frontend`, `P1`
**Depends on:** DP-011, DP-032, DP-034
**Parallel with:** DP-031, DP-033, DP-040+

**Description**
The Dashboard (DP-011) initially ships with streak placeholder and no badges count. This issue updates the Dashboard to use real streak + earned-badges-count from DP-032/DP-034. Quick Stats sidebar also starts using real follower count (once DP-047 lands) and earned badges count.

**Tasks**
- [ ] Update dashboard aggregation layer to include `streakCurrent`, `earnedBadgesCount`, `uniqueOrganizations`
- [ ] Wire into Dashboard page
- [ ] Update Quick Stats right sidebar

**Acceptance criteria**
- [ ] Streak card on Dashboard shows real months
- [ ] Quick Stats shows real "earned badges / total badges"

---

#### DP-036 — Confetti + celebrations

**Labels:** `frontend`, `P2`
**Depends on:** DP-002, DP-031, DP-033
**Parallel with:** (any Sprint 3 follow-up)

**Description**
Port Figma's `lib/celebrations.ts`. Fires `canvas-confetti` when: first donation logged, new badge earned, goal completed, milestone hit (10/25/50/100 donations).

**Tasks**
- [ ] `src/lib/celebrations.ts` with `celebrateFirstDonation`, `celebrateBadge`, `celebrateGoal`, `celebrateMilestone`
- [ ] Wire to Add Donation flow (DP-012)
- [ ] Wire to Goals page (DP-031)

**Acceptance criteria**
- [ ] Confetti fires on the 4 events
- [ ] Accessibility: respects `prefers-reduced-motion`

---

### Sprint 4 — Social (Feed / Discover / public profile)

#### DP-040 — Follows: server actions

**Labels:** `backend`, `privacy`, `P1`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-041, DP-042, DP-031, DP-033

**Description**
Server actions for the `follows` table. `follow(targetId)` for `open` profiles (direct), `unfollow(targetId)`, `isFollowing(targetId)`, `getFollowingIds()`, `getFollowerIds()`. For `friends` profiles, `follow()` creates a `follow_request` instead (DP-041).

**Tasks**
- [ ] All actions in `src/lib/actions/follows.ts`
- [ ] `follow()` branches on target's `privacy_tier`
- [ ] Creates notification row via DP-024 helpers
- [ ] Unit tests

**Acceptance criteria**
- [ ] Following an `open` profile creates a row in `follows`
- [ ] Following a `friends` profile creates a row in `follow_requests` instead
- [ ] Following a `private` profile errors
- [ ] Unfollow removes the row

---

#### DP-041 — Follow requests: server actions

**Labels:** `backend`, `privacy`, `P1`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-040, DP-042, DP-031, DP-033

**Description**
Server actions for `follow_requests`: list pending for current user, accept, reject, check if pending. Accept creates the actual `follows` row.

**Tasks**
- [ ] `getPendingRequests`, `acceptRequest`, `rejectRequest`, `hasPendingRequest(targetId)`
- [ ] Accept also creates `follows` row + notification

**Acceptance criteria**
- [ ] Accept triggers `follows` insert + notification
- [ ] Only the recipient can accept/reject

---

#### DP-042 — Likes: server actions

**Labels:** `backend`, `P1`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-040, DP-041

**Description**
Server actions for `likes`: `toggleLike(donationId)`, `hasLiked(donationId)`, `getLikesCount(donationId)`. Notifies donation owner on like via DP-024.

**Tasks**
- [ ] All actions in `src/lib/actions/likes.ts`
- [ ] Unique constraint on `(user_id, donation_id)`
- [ ] Toggle returns new liked state

**Acceptance criteria**
- [ ] Liking a donation creates the row + notification
- [ ] Unliking removes it

---

#### DP-043 — Port Discover page

**Labels:** `design`, `frontend`, `privacy`, `P1`
**Depends on:** DP-004, DP-040, DP-041
**Parallel with:** DP-044, DP-045, DP-047

**Description**
Port Figma's `Discover.tsx` to `src/app/(app)/discover/page.tsx`. Search input, pending follow requests card (if any), list of users (filtered to exclude `private` tier and the current user), follow/unfollow/pending buttons per card.

**Tasks**
- [ ] Search by name
- [ ] Pending follow requests section with accept/reject
- [ ] User card: avatar, name, bio, privacy badge, follow button
- [ ] Button states: Follow / Request / Pending / Unfollow
- [ ] Avatar with gradient placeholder + first-initial

**Acceptance criteria**
- [ ] Search filters by name
- [ ] Private users hidden
- [ ] Current user hidden
- [ ] Follow button branches correctly by target tier

---

#### DP-044 — Port Feed page

**Labels:** `design`, `frontend`, `privacy`, `P1`
**Depends on:** DP-004, DP-040, DP-042, DP-046
**Parallel with:** DP-043, DP-045, DP-047

**Description**
Port Figma's `Feed.tsx` to `src/app/(app)/feed/page.tsx`. Shows donations from followed users (respecting privacy tier + `hide_from_feed`), like button per donation, amount visibility gated by viewer's `showAmountsToFriends` and target user's tier. Empty states: "start following" (no follows), "no recent activity" (follows but no donations).

**Tasks**
- [ ] Server query: donations from follows ordered by date desc
- [ ] Respect `hide_from_feed` flag
- [ ] Card renders user header (avatar + name + date) + donation info + like button
- [ ] Amount visibility logic per tier
- [ ] "You're all caught up!" footer
- [ ] Empty state with "Discover Users" CTA

**Acceptance criteria**
- [ ] Only shows donations from followed users
- [ ] Respects privacy (amount hidden unless allowed)
- [ ] Like button toggles + updates count
- [ ] Empty states match Figma

---

#### DP-045 — Port public UserProfile page

**Labels:** `design`, `frontend`, `privacy`, `P1`
**Depends on:** DP-004, DP-040, DP-046
**Parallel with:** DP-043, DP-044, DP-047

**Description**
Port Figma's `UserProfile.tsx` to `src/app/(app)/profile/[userId]/page.tsx`. Header with avatar/name/bio/tier, 3 stats cards, recent donations list. Privacy gate: if viewer can't see the profile, render "This profile is private" card.

**Tasks**
- [ ] Server component with userId param
- [ ] Privacy check: open → show, friends → show if following, private → "profile is private"
- [ ] Stats respect `show_amounts_to_friends` for donation totals
- [ ] Recent donations respect `hide_from_feed`
- [ ] Back button

**Acceptance criteria**
- [ ] All 3 tiers render correctly
- [ ] Non-follower of a `friends` profile sees the private card
- [ ] Own profile redirects to `/profile` (optional) or renders the same page

---

#### DP-046 — Tier-aware RLS for donations + profiles (hardening)

**Labels:** `database`, `privacy`, `P0`
**Depends on:** DP-007
**Parallel with:** *(gates DP-044, DP-045)*

**Description**
Replace the placeholder donations + profiles RLS from DP-007 with tier-aware policies. A user can SELECT another user's donations only if:
- They are the owner, OR
- Target's tier is `open` AND donation `hide_from_feed = false`, OR
- Target's tier is `friends` AND there is a row in `follows` where follower = auth.uid() and following = donation.user_id, AND `hide_from_feed = false`

Same logic for `profiles` visibility.

**Tasks**
- [ ] Drop placeholder policies from DP-007 for donations + profiles
- [ ] Write new tier-aware SELECT policies
- [ ] Add pgtap / manual tests covering each tier × each viewer type
- [ ] Confirm no query performance regression (use EXPLAIN)

**Acceptance criteria**
- [ ] Private user's donations invisible to all non-owners
- [ ] Friends user's donations visible only to followers
- [ ] Open user's donations visible to all authed users
- [ ] hide_from_feed rows invisible to non-owners
- [ ] Test suite covers all 9 combinations

---

#### DP-047 — Wire Profile page followers/following tabs to real data

**Labels:** `frontend`, `P1`
**Depends on:** DP-016, DP-040
**Parallel with:** DP-043, DP-044, DP-045

**Description**
Update the own-profile page (DP-016) to fetch real followers/following data. Add unfollow + remove-follower actions.

**Tasks**
- [ ] Query follower/following lists with user details
- [ ] Unfollow button on Following tab
- [ ] Remove-follower button on Followers tab
- [ ] Refresh after mutation

**Acceptance criteria**
- [ ] Tabs show real data
- [ ] Mutations update the list immediately
- [ ] Empty states visible when list is empty

---

### Sprint 5 — Recurring donations (rebuilt with Figma style)

> **Note:** The Figma Make project has no dedicated recurring management page. This sprint keeps the old behavior (cron + pending entries + confirm/skip + email) but builds a **new management page** in the Figma design style. **No auto-confirm after 3.**

#### DP-050 — Recurring schedule: server actions (CRUD + pause/resume)

**Labels:** `backend`, `P1`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-051 (after DP-050 lands)

**Description**
Server actions for `recurring_schedules`: create, list, update, delete, pause/resume.

**Tasks**
- [ ] All actions in `src/lib/actions/recurring.ts`
- [ ] Validation with zod
- [ ] Unit tests

**Acceptance criteria**
- [ ] CRUD works
- [ ] Pause sets `active = false`

---

#### DP-051 — Vercel Cron: daily pending donation generator

**Labels:** `backend`, `P1`
**Depends on:** DP-050
**Parallel with:** DP-052

**Description**
Daily cron at 07:00 UTC that reads `recurring_schedules` where `active = true` and `next_due_date <= today`, inserts a `donations` row with `status = 'pending'`, and advances `next_due_date` by `frequency`. Idempotent (don't double-create on retry).

**Tasks**
- [ ] `vercel.json` cron config
- [ ] `/api/cron/recurring` route handler (protected by cron secret)
- [ ] Idempotency key on insert
- [ ] Logs to observability
- [ ] Unit tests

**Acceptance criteria**
- [ ] Cron runs daily
- [ ] Creates correct pending donations
- [ ] Idempotent if rerun

---

#### DP-052 — Recurring management page (new, Figma-style)

**Labels:** `design`, `frontend`, `P1`
**Depends on:** DP-004, DP-050
**Parallel with:** DP-051

**Description**
Build a new page `/donations/recurring` (not in Figma but matching its visual style). Lists active schedules, allows pause/resume/edit/cancel. Top bar with "New Recurring" button.

**Tasks**
- [ ] `src/app/(app)/donations/recurring/page.tsx`
- [ ] Schedule list with cards: org, amount, frequency, next due, actions
- [ ] Pause/resume toggle
- [ ] Edit in a dialog
- [ ] Cancel with AlertDialog confirm
- [ ] Add nav entry in sidebar under "My Donations" (or wherever makes sense)
- [ ] Screenshots match Figma style (same card style, pastel badges)

**Acceptance criteria**
- [ ] All actions work end-to-end
- [ ] Matches Figma visual system
- [ ] Accessible from sidebar nav

---

#### DP-053 — Confirm/skip UI for pending donations

**Labels:** `frontend`, `backend`, `P1`
**Depends on:** DP-051, DP-004
**Parallel with:** DP-054

**Description**
Pending donations (generated by the cron) surface in: a banner on Dashboard, a badge on the sidebar "Donations" nav item, a filter section on MyDonations. Each pending donation has Confirm / Skip buttons. **No auto-confirm.**

**Tasks**
- [ ] Dashboard banner: "You have N pending donations to confirm"
- [ ] Sidebar nav badge (red dot + count)
- [ ] MyDonations page: "Pending" section at top
- [ ] Confirm server action: flip `status` to `confirmed`
- [ ] Skip server action: delete the pending donation
- [ ] Toast feedback

**Acceptance criteria**
- [ ] Pending count accurate in all 3 places
- [ ] Confirm moves to confirmed list + updates dashboard totals
- [ ] Skip removes the row

---

#### DP-054 — Resend integration (API key + email templates)

**Labels:** `backend`, `P1`
**Depends on:** DP-002
**Parallel with:** DP-053

**Description**
Install Resend, add `RESEND_API_KEY` env var, build React Email templates for the 2 email types needed: (1) daily pending-donation digest, (2) welcome email. Templates match Figma visual style.

**Tasks**
- [ ] Add Resend client wrapper in `src/lib/email.ts`
- [ ] React Email template for pending digest
- [ ] React Email template for welcome
- [ ] Send-in-test mode support
- [ ] Env vars documented in `.env.example`

**Acceptance criteria**
- [ ] Resend client callable from server code
- [ ] Templates render correctly in test mode
- [ ] Welcome email sends on signup completion

---

#### DP-055 — Daily email digest for pending donations

**Labels:** `backend`, `P1`
**Depends on:** DP-053, DP-054
**Parallel with:** *(nothing — end of sprint)*

**Description**
Extend the DP-051 cron (or add a second cron) that sends a daily digest email to users with pending donations. Uses the DP-054 template.

**Tasks**
- [ ] Query users with pending donations
- [ ] Respect user's email opt-out preference
- [ ] Send digest via Resend
- [ ] Log result

**Acceptance criteria**
- [ ] Email sends to users with pending donations
- [ ] Users with no pending donations get no email
- [ ] Opt-out respected

---

#### DP-056 — In-app notification on pending donation creation

**Labels:** `backend`, `P1`
**Depends on:** DP-024, DP-051
**Parallel with:** DP-055

**Description**
When cron creates a pending donation, also insert a notification row via DP-024 helper. Visible in NotificationsDropdown.

**Tasks**
- [ ] Wire cron to `notifyMilestone` (or add `notifyPendingDonation` helper)
- [ ] Type: `pending` (add to notification types enum)

**Acceptance criteria**
- [ ] Notification visible in bell dropdown
- [ ] Click-through navigates to MyDonations with pending filter

---

### Sprint 6 — Nonprofits

#### DP-060 — Port NonprofitDirectory page (with mock data first)

**Labels:** `design`, `frontend`, `P2`
**Depends on:** DP-004
**Parallel with:** DP-061, DP-062

**Description**
Port Figma's `NonprofitDirectory.tsx` to `src/app/(app)/nonprofits/page.tsx`. Search + filter panel (categories checkboxes, verified toggle, min rating), results list with rating badges. **Initially wired to a static fixture** (the Figma MOCK_NONPROFITS array) so design ships without waiting for Every.org integration. DP-063/064 swap it to real data.

**Tasks**
- [ ] Port info banner
- [ ] Port search bar
- [ ] Port filter panel (collapsible)
- [ ] Port nonprofit card with logo placeholder, name, location, EIN, rating, mission, category badges, donate button
- [ ] Use static fixture as data source
- [ ] Loading skeleton
- [ ] Empty state (no results matching filters)

**Acceptance criteria**
- [ ] Filters work against fixture
- [ ] Search works against fixture
- [ ] Rating badges render correctly
- [ ] Donate button opens external URL in new tab

---

#### DP-061 — Port NonprofitDetail page

**Labels:** `design`, `frontend`, `P2`
**Depends on:** DP-004, DP-006, DP-007
**Parallel with:** DP-060, DP-062

**Description**
Port Figma's `NonprofitDetail.tsx` to `src/app/(app)/nonprofits/[id]/page.tsx`. Header with name/verified badge/rating/donate/flag buttons, 3-column layout: about + ratings + categories / quick facts + external links + trust & safety. Flag dialog with 5 reasons.

**Tasks**
- [ ] Port header section
- [ ] Port About card
- [ ] Port Ratings & Verification card
- [ ] Port Categories & Tags card
- [ ] Port Quick Facts sidebar
- [ ] Port External Links sidebar
- [ ] Port Trust & Safety sidebar
- [ ] Port flag dialog wired to `createNonprofitFlag` action

**Acceptance criteria**
- [ ] All sections match Figma
- [ ] Flag dialog submits to `nonprofit_flags` table
- [ ] External links open in new tab
- [ ] 404 for unknown nonprofit

---

#### DP-062 — Port AdminReviewQueue page

**Labels:** `design`, `frontend`, `privacy`, `P2`
**Depends on:** DP-004, DP-006, DP-007, DP-008 (admin middleware)
**Parallel with:** DP-060, DP-061

**Description**
Port Figma's `AdminReviewQueue.tsx` to `src/app/(app)/admin/review-queue/page.tsx`. Admin-only (gated by DP-008 middleware). 4 stat cards, 3 tabs (pending/reviewed/dismissed), flag cards with resolve/dismiss actions and admin notes.

**Tasks**
- [ ] Port header with admin shield icon
- [ ] Port stats row
- [ ] Port tabs
- [ ] Port flag card with expand-to-review UX
- [ ] Resolve/Dismiss actions update `flag.status` + `admin_notes`
- [ ] 404/forbidden for non-admins (verified)

**Acceptance criteria**
- [ ] Non-admin cannot access
- [ ] Admin can review + resolve flags
- [ ] Stats update after resolution

---

#### DP-063 — Every.org API client + fetch helper

**Labels:** `backend`, `P2`
**Depends on:** DP-002
**Parallel with:** DP-064, DP-065

**Description**
Build a thin client around the Every.org public API. Functions: `searchNonprofits(query, filters)`, `getNonprofitBySlug(slug)`. Map Every.org's response shape to our `nonprofits` schema.

**Tasks**
- [ ] `src/lib/every-org.ts` with typed client
- [ ] Rate limiting / caching (Next.js `unstable_cache` 1 hour TTL)
- [ ] Error handling for 404 / rate limits
- [ ] Unit tests against recorded fixtures

**Acceptance criteria**
- [ ] Client returns typed results for sample queries
- [ ] Errors surface cleanly
- [ ] Response mapper handles missing fields gracefully

---

#### DP-064 — Nonprofit sync job (on-demand + daily)

**Labels:** `backend`, `database`, `P2`
**Depends on:** DP-006, DP-063
**Parallel with:** DP-065

**Description**
Replace the static fixture in DP-060/061 with real data from Every.org. Strategy: when user searches, query Every.org live and upsert results into our `nonprofits` table. Optional: daily cron to refresh `verified = true` records.

**Tasks**
- [ ] `syncNonprofitsFromSearch(query)` server action — fetches from Every.org, upserts into `nonprofits`
- [ ] Update DP-060 to call this instead of fixture
- [ ] Update DP-061 to read from our `nonprofits` table (not fixture)
- [ ] Optional daily cron to refresh popular records
- [ ] Migration to remove any fixture seed data

**Acceptance criteria**
- [ ] Search against real Every.org returns results
- [ ] Detail page reads from our table
- [ ] Duplicates deduped on `ein` unique constraint

---

#### DP-065 — Nonprofit flags: server actions

**Labels:** `backend`, `P2`
**Depends on:** DP-006, DP-007
**Parallel with:** DP-063, DP-064

**Description**
Server actions for `nonprofit_flags`: `createFlag`, `listFlagsForNonprofit`, `listFlagsByStatus`, `updateFlagStatus`.

**Tasks**
- [ ] All actions in `src/lib/actions/nonprofit-flags.ts`
- [ ] `updateFlagStatus` admin-only (check `is_admin`)
- [ ] Unit tests

**Acceptance criteria**
- [ ] Owner can create a flag
- [ ] Admin can update status
- [ ] Non-admin cannot update

---

#### DP-066 — Audit admin middleware against `/admin/*`

**Labels:** `backend`, `privacy`, `P2`
**Depends on:** DP-008, DP-062
**Parallel with:** *(cleanup step)*

**Description**
Final check: browser-test admin middleware. Attempt to access `/admin/review-queue` as a non-admin and confirm 404. Attempt as admin and confirm success. Attempt to call admin-only server actions as non-admin and confirm error.

**Acceptance criteria**
- [ ] Non-admin blocked from route + actions
- [ ] Admin passes
- [ ] Documented in `README.md` how to flip `is_admin` manually

---

### Sprint 7 — Polish + cleanup

#### DP-070 — Close old issues + set up new project board view

**Labels:** `setup`, `P0`
**Depends on:** *(sign-off on this plan)*
**Parallel with:** DP-001 (can run right at the start)

**Description**
Close the ~22 existing open TASK-0xx issues with a comment pointing to this plan. Add all DP-xxx issues to GitHub Project #2.

**Tasks**
- [ ] For each existing open issue: `gh issue close N --comment "Superseded by Figma Make port plan (FIGMA_PORT_PLAN.md). See DP-xxx issues for replacement work."`
- [ ] Create each DP-xxx issue from this doc
- [ ] Add each to project #2
- [ ] Apply correct labels
- [ ] Set up a project view grouped by sprint

**Acceptance criteria**
- [ ] All old issues closed with explanatory comment
- [ ] All DP-xxx issues created
- [ ] All DP-xxx issues on project board

---

#### DP-071 — Replace all browser `confirm()` with AlertDialog

**Labels:** `frontend`, `P2`
**Depends on:** DP-003
**Parallel with:** DP-072, DP-073, DP-074

**Description**
Figma uses `window.confirm()` in several places (MyDonations delete, Goals delete, others). Replace each with shadcn `AlertDialog` for consistency.

**Tasks**
- [ ] Audit all `confirm(` calls
- [ ] Replace with AlertDialog

**Acceptance criteria**
- [ ] No `window.confirm` calls remain
- [ ] All destructive actions use AlertDialog

---

#### DP-072 — Dark mode decision + implementation

**Labels:** `design`, `frontend`, `P2`
**Depends on:** DP-001
**Parallel with:** DP-071, DP-073, DP-074

**Description**
Figma Make's dark mode is incomplete. Two options:
- **(a)** Ship light-only. Remove `.dark` class usage. Follow-up issue files a dark mode initiative.
- **(b)** Derive a dark palette from the hex light palette and complete the `.dark` block.

**This issue requires a user decision** — see §10 open questions.

**Tasks**
- [ ] Pick (a) or (b) based on user answer
- [ ] Implement accordingly
- [ ] Test every page in chosen mode(s)

---

#### DP-073 — Mobile responsive screenshot pass

**Labels:** `design`, `frontend`, `P1`
**Depends on:** *(every page ported)*
**Parallel with:** DP-071, DP-072, DP-074

**Description**
Screenshot every page at 375px, 768px, 1280px using `agent-browser`. Compare against Figma. Fix mismatches.

**Tasks**
- [ ] Capture all 14 pages × 3 widths
- [ ] Document mismatches
- [ ] Fix issues

**Acceptance criteria**
- [ ] All pages pass at all 3 widths
- [ ] Sidebar drawer works on mobile
- [ ] Touch targets ≥44px

---

#### DP-074 — Loading / error / empty state audit

**Labels:** `frontend`, `design`, `P1`
**Depends on:** *(every page ported)*
**Parallel with:** DP-071, DP-072, DP-073

**Description**
Audit every data-driven page for the required three states: loading (skeleton), empty (helpful CTA), error (recovery path). Add missing ones.

**Acceptance criteria**
- [ ] Every page has a skeleton
- [ ] Every page has an empty state
- [ ] Every page has an error boundary

---

#### DP-075 — End-to-end verification

**Labels:** `setup`, `P1`
**Depends on:** *(everything)*
**Parallel with:** *(nothing — final gate)*

**Description**
Full e2e walkthrough: signup → onboarding → log donation → view dashboard → set goal → earn badge → follow a user → see feed → flag a nonprofit → receive email → confirm recurring. Document any gaps.

**Acceptance criteria**
- [ ] Happy path runs end-to-end with no blockers
- [ ] Screenshots captured for each step
- [ ] Known gaps documented as follow-ups

---

## 8. Critical path + parallelization summary

```
SPRINT 0 (gates everything):
  DP-001 ──┬─ DP-004 ──┐
  DP-002 ──┤           │
  DP-003 ──┘           │
  DP-005 ──┬─ DP-007 ──┤── DP-008
  DP-006 ──┘           │
                       ▼
SPRINT 1 (6-way parallel after DP-004 + DP-007):
  DP-010 ──── DP-011 (Dashboard depends on DP-010)
  DP-012 (Add Donation)
  DP-013 (My Donations)
  DP-014 (Onboarding)
  DP-015 (Settings)
  DP-016 (Profile)
                       ▼
SPRINT 2 (5-way parallel):
  DP-020 (WelcomeChecklist) ─┐
  DP-021 (InsightsCard) ─────┤─ iterate DP-011 with them
  DP-022 (EmptyState) ───────┤
  DP-023 (Notifications wire)┘
  DP-024 (Notification helpers)
                       ▼
SPRINT 3 (7-way parallel):
  DP-030 ── DP-031 (Goals)
  DP-032 ── DP-033 (Badges)
  DP-034 ── DP-035 (Streak → Dashboard update)
  DP-036 (Confetti)
                       ▼
SPRINT 4 (8 issues, RLS gates feed/public profile):
  DP-040 ─┐
  DP-041 ─┤─── DP-043 (Discover)
  DP-042 ─┘     DP-047 (Profile wiring)
  DP-046 ────── DP-044 (Feed)
                DP-045 (Public profile)
                       ▼
SPRINT 5 (mostly sequential):
  DP-050 ── DP-051 ── DP-053 ── DP-055 ── DP-056
            DP-052 (parallel with DP-051)
            DP-054 (parallel with DP-053)
                       ▼
SPRINT 6 (design first then backend):
  DP-060 ─┐
  DP-061 ─┤── (ships with fixture)
  DP-062 ─┘
  DP-063 ── DP-064 (swap fixture → real data)
  DP-065 (parallel)
  DP-066 (final audit)
                       ▼
SPRINT 7 (polish, mostly parallel):
  DP-070, DP-071, DP-072, DP-073, DP-074 parallel
  DP-075 (final gate)
```

**Peak parallelism:** Sprint 1 → 6 concurrent issues. Sprint 3 → 7 concurrent. Sprint 7 polish → 4 concurrent.

---

## 9. Dependencies added to `package.json`

```
recharts
react-countup
react-hook-form
canvas-confetti
resend
react-email
@react-email/components
```

Plus any shadcn/ui components not yet installed — see DP-003 task list.

---

## 10. Open questions for you (need answers to proceed)

### Q1: Dark mode strategy (DP-072)

The Figma theme only defines light mode properly. Do you want:

- **(a)** Ship **light-only** for now; file "add dark mode" as a post-port follow-up issue. *Fastest.*
- **(b)** I derive a **dark palette** from the light hex values during DP-001 and complete `.dark` myself. *Medium effort, not validated against Figma.*
- **(c)** I open a new regular Figma file via the MCP, design a dark variant, then port it. *Slowest, highest-fidelity.*

My recommendation: **(a)** — ship light-only, visit dark mode after the visual-refresh initiative (to Community-file look) since that'll re-token everything anyway.

### Q2: Nonprofit data: fixture vs Every.org — land in what order?

DP-060/061/062 can ship with the Figma fixture data immediately (design done), then DP-063/064 swap to Every.org real data. Alternative: delay DP-060/061/062 until Every.org is integrated. The fixture-first approach lets Nonprofits UI land in parallel with other sprints; the Every.org-first approach avoids shipping temporarily fake data.

My recommendation: **fixture first, swap later**. The fixture is good enough for internal review and doesn't block Sprint 6 completion.

### Q3: Email notifications — opt-out by default or opt-in?

Resend emails (pending donation digest + welcome). Add a `profiles.email_notifications boolean` column:

- **(a)** Default **on** (opt-out) — more engagement, possible complaints
- **(b)** Default **off** (opt-in) — requires user to enable during onboarding or settings

My recommendation: **(a) default on** with a clear unsubscribe link in every email.

### Q4: Badges table or derived only?

Figma's `gamification.ts` computes badges on every page load from donations. For a small user (dozens of donations) that's fine. For heavy users it's not:
- **(a)** Derived every time (my default, matches Figma)
- **(b)** Materialize earned badges into a `user_badges` table, track earned-date, compute progress live

My recommendation: **(a) derived**. We can migrate to (b) later if performance becomes an issue — and materializing would lose the "earned date = last relevant donation date" approximation Figma uses.

### Q5: `Profile.tsx` vs `UserProfile.tsx` — keep separate routes?

Figma has `/profile` (own) and `/profile/:userId` (public view). They share a lot of structure but have different action affordances. Options:

- **(a)** Keep as separate pages — `src/app/(app)/profile/page.tsx` and `src/app/(app)/profile/[userId]/page.tsx` (my default)
- **(b)** Unify into `src/app/(app)/profile/[userId]/page.tsx` where `userId = 'me'` loads own profile

My recommendation: **(a) keep separate**. Own-profile has tabs (Followers/Following management) that the public view doesn't. Conflating them hurts readability.

### Q6: Search integration into the shell?

Figma's `DashboardLayout` has a `showSearch` prop but no actual search component. The shell includes a notifications button and "Add Donation" button instead. I'm **dropping the search feature from scope** (it's not implemented in the Figma). Confirm that's OK.

---

## 11. Sprint-level effort estimate (very rough, for planning only)

| Sprint | Issues | Est. serial days | With max parallelism |
|---|---|---|---|
| 0 | 8 | 8 | 3 |
| 1 | 7 | 10 | 3–4 |
| 2 | 5 | 4 | 1–2 |
| 3 | 7 | 7 | 3 |
| 4 | 8 | 10 | 4 |
| 5 | 7 | 8 | 4 |
| 6 | 7 | 8 | 3–4 |
| 7 | 6 | 4 | 2 |
| **Total** | **55** | **~59 serial days** | **~24 parallel days** |

*(These are rough estimates assuming 1 engineer. Adjust as needed.)*

---

## 12. After plan sign-off: execution steps

Once you approve this plan:

1. **I close the ~22 existing open issues** with the comment from DP-070
2. **I create the ~55 DP-xxx issues** from this document via `gh issue create`, one by one
3. **I add each to GitHub Project #2** and set the sprint/label fields
4. **I start DP-001 and DP-002 in parallel** (foundation), confirming each PR against the plan

No code changes happen before you sign off.

---

## 13. Notes on what this plan intentionally skips

- **Google OAuth** — not in the Figma Make project. Can be added later; not required for Phase 1 port.
- **Multi-currency** — explicitly USD-only per your answer.
- **Real profile photo uploads** — placeholder avatars only; file as follow-up.
- **Fonts.css** — doesn't exist in the Figma Make project (I verified). We keep Inter + Geist Mono.
- **Visual refresh to Dashboard Design System Community** — separate follow-up initiative, not part of this port.
- **Mobile app / PWA** — not in scope.
