# Giving Tracker - Project Overview & Roadmap

## Context

Giving Tracker is a "Strava for charitable donations" — a web app that helps people track, visualize, and share their giving over time. The core thesis: tracking your donations creates awareness, and awareness drives behavior change toward more generous giving. The app encourages users to donate at least 1% of their yearly salary and fosters a community around charitable giving.

This is a **solo developer** project with a **freemium** business model. The app is **tracking-only** (no payment processing) with **equal mobile/desktop priority**.

---

## Key Decisions Made

| Area | Decision |
|------|----------|
| Payment processing | None — tracking/logging only |
| Nonprofit verification | Community + data hybrid (APIs + community flagging + manual review) |
| Target audience | Individuals & friend groups first (corporate later) |
| Social model | Hybrid — friends-only by default, opt-in public discovery |
| Recurring donations | Auto-log with reminders (user confirms/skips each period) |
| Mobile vs. desktop | Equal priority — responsive-first design |
| Monetization | Freemium (core free, premium analytics/features behind subscription) |
| Nonprofit browsing | Info cards + external donation links |
| Tech stack | **Next.js + TypeScript + Supabase + Tailwind + shadcn/ui + Recharts** |
| Leaderboard privacy | Amounts always private — rank by donation count, streaks, % of salary (opt-in), badges |
| Cause tagging | Fixed categories + one optional custom tag per donation |
| Privacy model | 3 preset tiers + optional per-field customization |

---

## Tech Stack (Confirmed)

**Next.js + TypeScript + Supabase + Tailwind CSS + shadcn/ui + Recharts**

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js (App Router) | Full-stack in one framework, API routes + frontend, massive ecosystem |
| Language | TypeScript | Type safety across the stack, better DX for a solo developer |
| Database + Auth | Supabase (PostgreSQL) | Row-Level Security for privacy model, built-in auth, generous free tier, standard Postgres underneath |
| Styling | Tailwind CSS | Utility-first, responsive design out of the box for mobile/desktop parity |
| UI Components | shadcn/ui | Accessible, customizable, copy-paste components (not a dependency) |
| Charts | Recharts | React-native charting, good for bar charts, progress rings, pie charts |
| Deployment | Vercel | Push-to-deploy, great Next.js integration, edge functions |

---

## Feature Breakdown & Phased Roadmap

### Phase 1: Core MVP (Foundation)
*Goal: A usable product that one person can use to track their own giving.*

1. **User registration & profile**
   - Email/password + OAuth (Google)
   - Onboarding flow: name, yearly salary (with option to skip/add later), privacy defaults
   - Salary stored securely, used only for percentage calculations

2. **Donation logging**
   - Manual entry: amount, organization name, date, scope (local/national/global), notes
   - **Cause tag:** Choose from fixed categories (education, health, environment, disaster relief, hunger, housing, arts, animal welfare, human rights, religious) + one optional custom tag
   - Mark as one-time or set up recurring schedule
   - Edit and delete past entries

3. **Recurring donation auto-logging**
   - User defines: amount, org, frequency (weekly/monthly/quarterly/annually)
   - System creates pending entries at each interval
   - Push/email notification to confirm or skip
   - Dashboard shows pending vs. confirmed

4. **Personal dashboard**
   - Monthly donation totals (bar chart)
   - Yearly percentage of salary donated (progress ring — targets 1%, then advances to 2%, 3%, etc. as each milestone is reached)
   - Local vs. national vs. global breakdown (pie/donut chart)
   - Cause tag breakdown (what categories you donate to most)
   - Month-over-month and year-over-year comparisons
   - Running total for current year

5. **Privacy settings (3-tier preset model)**
   - **Tier 1 — "Private"** (default): Profile hidden from search, donations only visible to you, salary/percentage hidden
   - **Tier 2 — "Friends Only"**: Profile visible to followers, donations visible to followers (amounts hidden), percentage hidden
   - **Tier 3 — "Open Giver"**: Profile publicly discoverable, donations visible to all (amounts hidden), percentage of salary visible
   - **Custom overrides**: After choosing a tier, users can toggle individual settings (e.g., pick Tier 2 but also show donation amounts to friends, or pick Tier 3 but hide specific donations)
   - Salary is **never** displayed publicly — only the derived percentage, and only in Tier 3 or via custom override

### Phase 2: Social Layer
*Goal: Make giving a shared, encouraging experience.*

6. **Follow system**
   - Search users by name/email
   - Send follow requests (if profile is friends-only) or follow directly (if public)
   - Invite friends via shareable link

7. **Social feed**
   - Chronological feed of followed users' public donations
   - Each entry shows: user, organization, date (and amount if they chose to share it)
   - Heart/like button on donations
   - Click organization name to see more info

8. **Public profiles**
   - Display name, bio, badges earned, giving streak
   - Donation history (respecting per-item privacy settings)
   - Total donated (if user opts in)
   - Percentage of salary (if user opts in)

### Phase 3: Gamification & Discovery
*Goal: Drive engagement and help users find new causes.*

9. **Badge system**
   - Percentage milestones: 1%, 2%, 5%, 10% of salary
   - Category badges: "Local Hero" (10+ local donations), "Global Citizen" (10+ global donations)
   - Streak badges: donated every month for 3, 6, 12 months
   - First donation badge, first recurring donation badge
   - Each badge can be public or hidden independently

10. **Nonprofit directory**
    - Searchable database of verified nonprofits
    - Info cards: mission statement, category, location, charity rating, website
    - External link to organization's donation page
    - Data sourced from IRS 501(c)(3) database + Charity Navigator/GuideStar APIs

11. **Nonprofit verification system**
    - Auto-verify against IRS Exempt Organizations database
    - Pull ratings from Charity Navigator / GuideStar (Candid) APIs
    - Community flagging: users can report suspicious organizations
    - Admin review queue for flagged or user-submitted organizations

12. **Opt-in discovery**
    - Explore page (only shows users who opted in — Tier 3 "Open Giver" or custom opt-in)
    - Leaderboards ranked by **non-monetary metrics only**: donation count, streak length, % of salary (opt-in), badges earned. Dollar amounts are **never** shown on leaderboards.
    - "People who donated to X also donated to Y" suggestions

### Phase 4: Premium & Polish
*Goal: Monetize and serve power users.*

13. **Freemium tier split**
    - **Free:** Donation logging, basic dashboard (current month + YTD), 3 badges, follow up to 25 people, basic privacy controls
    - **Premium ($5-8/month):** Advanced analytics (multi-year trends, detailed breakdowns), unlimited badges, unlimited follows, CSV/PDF export, tax summary reports, priority in discovery, custom giving goals

14. **Advanced analytics (premium)**
    - Multi-year trend analysis
    - Giving by category over time
    - Predicted year-end total based on current pace
    - "What if" calculator (if I increase by X%, I'd reach Y goal)

15. **Tax & reporting features (premium)**
    - Annual giving summary grouped by organization
    - CSV export for tax preparation
    - Receipt upload/attachment per donation (photo/PDF)

---

## Tradeoffs Identified

### 1. Broad Audience vs. Focused Launch
**Tension:** Individuals, friend groups, and corporate programs all have different needs.
**Decision:** Launch Phase 1-2 focused on **individuals and friend groups** (they share 90% of the same features). Corporate features (admin dashboards, matching, reporting) deferred to a later phase. The social follow system naturally supports friend groups without needing dedicated group infrastructure.

### 2. Privacy Complexity vs. UX Simplicity
**Tension:** Granular privacy controls (per-donation, per-field, per-badge) are a core value prop, but they create a complex settings surface.
**Risk:** Users get overwhelmed by privacy options and either (a) leave everything default (defeating the purpose) or (b) abandon onboarding.
**Decision:** 3-tier privacy presets (Private → Friends Only → Open Giver) with optional per-field overrides. Users pick a tier during onboarding (defaulting to "Private"), then can customize further if they want. This gives simplicity to most users and control to power users.

### 3. Nonprofit Verification Quality vs. Speed
**Tension:** The hybrid verification model is the right call, but API integrations (IRS, Charity Navigator, GuideStar) take time to build and maintain.
**Risk:** If verification is incomplete at launch, users may log donations to unverified orgs, which undermines trust.
**Recommendation:** For Phase 1, allow users to type any organization name (free-text) for their personal tracking. The nonprofit directory (Phase 3) is where verification matters — by then you'll have time to build the API integrations. Don't block the MVP on verification.

### 4. Auto-Log Recurring vs. Manual Confirmation
**Tension:** Auto-logging is convenient, but if a user cancels a recurring donation and forgets to update the app, their dashboard shows false data.
**Risk:** Inaccurate data erodes trust in the platform and makes the percentage calculations meaningless.
**Recommendation:** Default to **pending + notification** rather than auto-confirmed. A recurring donation creates a pending entry that the user confirms with one tap. After 3 consecutive confirmations, offer to switch to auto-confirm.

### 5. Salary Input Sensitivity
**Tension:** Salary is needed for the core "% of income" feature, but asking for it during signup is a significant friction point.
**Risk:** Users abandon signup because they don't want to share salary, or enter fake numbers.
**Recommendation:** Make salary optional during onboarding. Show a prompt like "Add your income to unlock percentage-based insights" when they first view the dashboard. Allow salary ranges instead of exact figures. Never display salary publicly — only the derived percentage, and only if the user opts in.

### 6. Freemium Balance
**Tension:** The free tier needs to be useful enough to attract users, but limited enough to drive conversions.
**Risk:** If free tier is too generous, nobody pays. If it's too restrictive, users leave for a spreadsheet.
**Recommendation:** The core loop (log donations, see basic dashboard, follow friends) should always be free. Premium should offer **depth** (advanced analytics, multi-year trends, exports) and **convenience** (auto-reports, receipt storage), not gate core social features.

---

## Possible Future Enhancements

These are features to consider post-v1 that could significantly increase value:

1. **Plaid integration** — Connect bank accounts to auto-detect charitable transactions and pre-fill donation logs
2. **Receipt scanning** — OCR on uploaded donation receipts to auto-fill amount, org, and date
3. **Giving goals & challenges** — Set personal goals ("Donate $5,000 this year") or join community challenges ("March Giving Madness")
4. **Team/group pages** — Dedicated pages for friend groups, churches, or companies with combined stats
5. **Employer matching integration** — Flag donations that are eligible for employer matching programs
6. **Impact stories** — Partner with nonprofits to show what donations accomplished ("Your $50 provided 200 meals")
7. **Social sharing** — Generate shareable cards for social media ("I've donated X% of my income this year")
8. **Seasonal campaigns** — Built-in giving campaigns around Giving Tuesday, end-of-year, disaster relief
9. **Email digests** — Weekly/monthly summary emails with giving stats and friend activity
10. **API for developers** — Public API so others can build on top of the giving data (with user consent)

---

## Verification Plan

To test the end-to-end implementation after each phase:

### Phase 1 Verification
- Create an account with salary input
- Log 5+ donations across different categories and dates
- Set up a recurring donation and verify pending entries appear on schedule
- Confirm dashboard charts render correctly with real data
- Toggle privacy settings and verify they take effect
- Test on both desktop and mobile viewports

### Phase 2 Verification
- Create 2+ test accounts and follow each other
- Verify feed shows donations according to privacy settings
- Confirm that hidden amounts/orgs are truly hidden (check API responses, not just UI)
- Test follow request flow for friends-only profiles

### Phase 3 Verification
- Search nonprofit directory and verify data accuracy against source APIs
- Earn a badge by meeting criteria and verify it appears on profile
- Flag an organization and verify it enters the admin review queue
- Opt into discovery and verify profile appears on explore page

### Phase 4 Verification
- Test Stripe subscription flow (subscribe, cancel, resubscribe)
- Verify premium features are gated correctly
- Export CSV and verify data accuracy
- Test with 12+ months of data to verify multi-year analytics

---

## Immediate Next Steps

1. **Design the data model** — users, donations (with cause tags), organizations, recurring schedules, follows, badges, privacy settings (3-tier model)
2. **Create wireframes** for the 4 key screens: onboarding (with privacy tier selection), donation log form (with cause tags), personal dashboard (with progress ring + charts), social feed
3. **Set up the project** — initialize Next.js + TypeScript, connect Supabase, configure Tailwind + shadcn/ui, deploy to Vercel
4. **Build Phase 1** — start with donation logging and the personal dashboard, as these are the core value proposition
