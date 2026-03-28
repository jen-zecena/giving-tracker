# Giving Tracker — Product Requirements Document

**Version:** 1.0
**Date:** March 27, 2026
**Status:** Pre-Development
**Author:** Jennifer Zecena
**Confidential — For Internal Use Only**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision & Core Principles](#2-vision--core-principles)
3. [Target Users](#3-target-users)
4. [Key Decisions](#4-key-decisions)
5. [Technology Stack](#5-technology-stack)
6. [Feature Requirements](#6-feature-requirements)
   - 6.1 Account & Profile
   - 6.2 Donation Logging
   - 6.3 Recurring Donation Auto-Logging
   - 6.4 Personal Dashboard & Analytics
   - 6.5 Privacy & Visibility Controls
   - 6.6 Badge System
   - 6.7 Social Features
   - 6.8 Nonprofit Directory & Verification
   - 6.9 Opt-In Discovery & Leaderboards
   - 6.10 Freemium Tier Split
7. [Phased Roadmap](#7-phased-roadmap)
8. [Key Tradeoffs](#8-key-tradeoffs)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Verification Plan](#10-verification-plan)
11. [Future Enhancements (Post-V1)](#11-future-enhancements-post-v1)
12. [Immediate Next Steps](#12-immediate-next-steps)

---

## 1. Executive Summary

Giving Tracker is a web application that empowers individuals to track, visualize, and share their charitable donations over time. Inspired by how Strava motivates physical activity through social accountability, Giving Tracker applies the same principles to charitable giving — encouraging users to donate at least 1% of their yearly salary while providing full control over what they share publicly.

The platform combines personal analytics (donation trends, salary-percentage tracking, cause-area and category breakdowns) with a privacy-first social layer (hybrid follow model, granular 3-tier visibility presets, community inspiration). A hybrid nonprofit directory integrating established APIs with community verification and editorial curation rounds out the experience.

The application will be built as a solo developer project using Next.js, TypeScript, and Supabase, deployed on Vercel. Monetization follows a freemium model: core tracking and social features are free, with premium analytics and convenience features available via subscription.

---

## 2. Vision & Core Principles

### Vision

A world where tracking and sharing charitable giving is as normal and motivating as tracking your fitness.

### Mission

To make charitable giving more visible, measurable, and social — helping people understand their giving patterns and inspiring them to do more, starting with the goal of 1% of yearly salary.

### Core Principles

- **Privacy First:** Everything is private by default (Tier 1). Users opt in to sharing, never opt out.
- **Encouragement Over Judgment:** The platform celebrates giving at any level. Leaderboards never show amounts. The tone is always aspirational, not shaming.
- **Trust & Legitimacy:** Every featured organization is verified through IRS data, third-party ratings, and community review.
- **Simplicity:** Logging a donation should take under 30 seconds. Privacy should be understandable at a glance (pick a tier).
- **Data Accuracy:** Recurring donations default to pending-with-confirmation to prevent false dashboard data. Salary is optional and self-reported with annual update prompts.

---

## 3. Target Users

### Primary Personas

- **The Conscious Professional:** Ages 25-45, salaried, already donates occasionally but lacks visibility into overall giving. Wants to be more intentional and track progress toward a percentage goal.
- **The Social Giver:** Motivated by community. Wants to see what friends support, discover new causes, and share their own impact within a trusted circle.
- **The Goal-Setter:** Competitive personality. Loves badges, streaks, and measurable progress. The gamification layer is built for this person.

### Secondary Personas

- **Nonprofit Advocates:** People who work for or closely support nonprofits and want to amplify their cause within their network.
- **Giving Circle Members:** Friend groups who give collectively and want shared tracking and mutual accountability.

---

## 4. Key Decisions

The following strategic and technical decisions have been finalized and guide all subsequent planning:

| Area | Decision | Rationale |
|------|----------|-----------|
| Payment Processing | None — tracking and logging only | Avoids PCI compliance, money transmission laws, and significant engineering complexity. Users donate directly through nonprofit websites. |
| Monetization | Freemium ($5-8/month premium tier) | Core loop stays free for adoption; premium adds depth (advanced analytics, exports, unlimited follows) and convenience (tax reports, receipt storage). |
| Target Audience | Individuals and friend groups first | Corporate features (admin dashboards, matching, reporting) deferred. The social follow system naturally supports friend groups. |
| Social Model | Hybrid — friends-only default, opt-in public discovery | Balances privacy with discoverability. Users must accept follow requests unless they opt into the public "Open Giver" tier. |
| Privacy Model | 3-tier presets + per-field custom overrides | Simplicity for most users (pick a tier), granularity for power users (customize individual fields). |
| Recurring Donations | Auto-log as pending; user confirms or skips | Avoids false data from lapsed donations. After 3 consecutive confirmations, offer auto-confirm. |
| Mobile vs. Desktop | Equal priority — responsive-first design | Users log donations on mobile but explore dashboards on desktop. Both must be first-class. |
| Nonprofit Verification | Community + data hybrid (APIs + flagging + manual review) | IRS database for baseline, Charity Navigator/GuideStar for ratings, community flagging for edge cases. |
| Leaderboard Privacy | Amounts always private on leaderboards | Rank by donation count, streaks, % of salary (opt-in), and badges. Dollar amounts are never shown. |
| Cause Tagging | Fixed categories + one optional custom tag | 10 fixed categories for consistency and analytics; one custom tag for flexibility. |
| Tech Stack | Next.js + TypeScript + Supabase + Tailwind + shadcn/ui + Recharts | Solo-developer productivity, generous free tiers, massive ecosystem, RLS for privacy model. |

---

## 5. Technology Stack

The stack is chosen for solo-developer productivity, generous free tiers, and the ability to ship quickly without sacrificing quality.

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js (App Router) | Full-stack in one framework: API routes + frontend, SSR/SSG, massive ecosystem |
| Language | TypeScript | Type safety across the entire stack, better DX and refactoring confidence for a solo developer |
| Database + Auth | Supabase (PostgreSQL) | Row-Level Security maps directly to the 3-tier privacy model, built-in auth (email + OAuth), generous free tier, standard Postgres underneath |
| Styling | Tailwind CSS | Utility-first, responsive design out of the box for mobile/desktop parity |
| UI Components | shadcn/ui | Accessible, customizable, copy-paste components (not a runtime dependency) |
| Charts | Recharts | React-native charting library, well-suited for bar charts, progress rings, pie charts |
| Deployment | Vercel | Push-to-deploy, excellent Next.js integration, edge functions, preview deployments for testing |

> **Architectural note:** Supabase's Row-Level Security (RLS) is a major advantage. The 3-tier privacy model (Private / Friends Only / Open Giver) can be enforced at the database level, meaning privacy rules are guaranteed even if the application code has bugs.

---

## 6. Feature Requirements

### 6.1 Account & Profile

During registration, users provide standard account information via email/password or Google OAuth. The onboarding flow collects name, optional yearly salary (with option to skip and add later), and privacy tier selection (defaulting to Tier 1: Private). Salary is stored encrypted and used only for percentage calculations — it is never displayed publicly. Only the derived percentage is shown, and only if the user opts in (Tier 3 or custom override).

**Requirements:**
- Email/password registration
- Google OAuth registration
- Onboarding flow: name, optional salary, privacy tier selection
- Salary stored encrypted at rest
- Salary supports exact figures or ranges to reduce friction
- Contextual prompt on dashboard: "Add your income to unlock percentage-based insights" (shown when salary is not set)
- Annual salary update prompt (beginning of each calendar year)
- Profile fields: display name, bio, profile photo (optional)

### 6.2 Donation Logging

The core interaction of the app. Users log donations manually in the MVP.

**Required Fields:**
- Organization name (autocomplete from nonprofit directory when available; free-text in Phase 1)
- Donation amount
- Date of donation
- Scope: local, national, or global
- One-time or recurring (if recurring: frequency — weekly, monthly, quarterly, annually)

**Optional Fields:**
- Cause tag: choose from 10 fixed categories + one optional custom tag
- Notes or personal motivation
- Tax-deductible flag
- Receipt upload (image or PDF) — premium feature in Phase 4

**Fixed Cause Tag Categories:**
1. Education
2. Health
3. Environment
4. Disaster Relief
5. Hunger
6. Housing
7. Arts
8. Animal Welfare
9. Human Rights
10. Religious

Users can edit and delete past entries at any time. Logging a donation should take under 30 seconds.

### 6.3 Recurring Donation Auto-Logging

When a user marks a donation as recurring, the system creates pending entries at each interval based on the defined frequency. The user receives a push or email notification to confirm or skip each pending entry. The dashboard distinguishes between pending and confirmed donations.

**Requirements:**
- User defines: amount, organization, frequency (weekly / monthly / quarterly / annually)
- System creates pending entries at each interval
- Push or email notification to confirm or skip each pending entry
- Dashboard visually distinguishes pending vs. confirmed donations
- After 3 consecutive confirmations of the same recurring donation, the system offers to switch to auto-confirm mode
- User can pause, edit, or cancel any recurring schedule at any time

### 6.4 Personal Dashboard & Analytics

The dashboard is the heart of the user experience. It provides at-a-glance insight into giving patterns and progress toward goals.

| Chart / Metric | Description | Tier |
|----------------|-------------|------|
| Monthly donation totals | Bar chart showing total donated each month over the past 12 months | Free |
| Salary percentage tracker | Progress ring showing % of yearly salary donated YTD. Targets 1%, then advances to 2%, 3%, etc. as each milestone is reached | Free |
| Local vs. national vs. global breakdown | Pie or donut chart showing scope distribution | Free |
| Cause tag breakdown | Chart showing which of the 10 categories receive the most donations | Free |
| Running total for current year | Summary card with year-to-date donation total | Free |
| Month-over-month comparison | Trend indicator or sparkline showing if giving is increasing or decreasing | Free |
| Year-over-year comparison | Side-by-side bars comparing current year to previous years by month | Free |
| Multi-year trend analysis | Long-term giving patterns across 2+ years | Premium |
| Giving by category over time | How cause-area allocation shifts over months and years | Premium |
| Predicted year-end total | Projection based on current pace of giving | Premium |
| "What if" calculator | If I increase by X%, I'd reach Y goal — interactive scenario modeling | Premium |
| Recurring vs. one-time split | Visual showing proportion of giving that is recurring | Premium |
| Organization diversity | Count of unique orgs supported, with top recipients listed | Premium |

### 6.5 Privacy & Visibility Controls

Privacy is foundational to user trust. The system uses a 3-tier preset model that provides simplicity for most users while allowing power users to customize individual settings.

**Tier Definitions:**

| Setting | Tier 1: Private (Default) | Tier 2: Friends Only | Tier 3: Open Giver |
|---------|--------------------------|---------------------|-------------------|
| Profile in search | Hidden | Visible to followers | Publicly discoverable |
| Donations visible to | Only you | Followers (amounts hidden) | Everyone (amounts hidden) |
| Donation amounts | Hidden | Hidden | Hidden |
| Salary % donated | Hidden | Hidden | Visible |
| Badges | Hidden | Visible to followers | Visible to all |
| Appears in Explore/Leaderboards | No | No | Yes |

**Custom Overrides:**
- After choosing a tier, users can toggle individual settings
- Example: pick Tier 2 but also show donation amounts to friends
- Example: pick Tier 3 but hide specific individual donations
- Per-donation privacy overrides allow hiding any single donation regardless of tier

**Hard Rules:**
- Salary is **never** displayed publicly — only the derived percentage, and only in Tier 3 or via custom override
- Donation amounts are hidden by default across all tiers (opt-in only via custom overrides)
- Privacy enforcement happens at the database level via Supabase RLS, not just in the UI

### 6.6 Badge System

Badges serve as milestones and motivation. The system includes both salary-based badges (tied to giving percentage) and activity-based badges (tied to behavior and consistency). Each badge can be shown or hidden independently, following the visibility rules of the user's chosen privacy tier.

**Salary-Based Badges:**
- 1% Club — awarded when YTD donations reach 1% of salary
- 2% Club — awarded at 2%
- 5% Club — awarded at 5%
- 10% Club — awarded at 10%
- These reset annually and re-earn each year, creating a recurring achievement loop

**Activity-Based Badges:**
- First Donation — welcome badge on first logged donation
- First Recurring Donation — awarded when the user sets up their first recurring schedule
- Consistency Streak — donated at least once per month for 3, 6, and 12 consecutive months
- Diversifier — donated to 5, 10, or 20 different organizations
- Local Hero — 10+ donations to local causes
- Global Citizen — 10+ donations to global causes

**Free vs. Premium Badge Access:**

| Tier | Badges Available |
|------|-----------------|
| Free | First Donation, 1% Club, 3-Month Streak |
| Premium | All badges (full library) |

This creates a natural upgrade prompt as users engage more deeply.

### 6.7 Social Features

**Hybrid Follow Model:**
- Users with Friends Only profiles (Tier 2) require mutual follow requests
- Open Giver profiles (Tier 3) can be followed directly
- Private profiles (Tier 1) cannot be found or followed
- Search for others by name or email
- Invite friends via a shareable link

**Social Feed:**
- Chronological feed of followed users' shared activity
- Each feed entry shows: user, organization, date (and amount only if the donor chose to share it)
- Heart/like button on feed items to show support
- Tapping an organization name opens its profile in the nonprofit directory

**Public Profiles:**
- Display name, bio, badges earned, giving streak
- Donation history (respecting per-item privacy settings)
- Total donated (if user opts in)
- Percentage of salary (if user opts in)
- All fields respect the user's per-item privacy overrides

**Design Principle:**
> The feed and leaderboards emphasize frequency, consistency, and cause diversity over raw amounts. Leaderboards rank by donation count, streak length, % of salary (opt-in), and badges earned. Dollar amounts are never shown on leaderboards. This avoids unhealthy social comparison between people with different income levels.

### 6.8 Nonprofit Directory & Verification

A browseable, searchable directory of verified nonprofit organizations that serves as both a discovery tool and a trust layer.

**Directory Features:**
- Search by name, cause category, geography (local/national/global)
- Organization info cards: mission statement, category, location, charity rating, website
- External link to the organization's own donation page (no in-app payments)
- Community signals: how many Giving Tracker users have donated to this org
- "People who donated to X also donated to Y" recommendations

**Verification Pipeline:**
- **Layer 1 — IRS Baseline:** Auto-verify against the IRS Exempt Organizations (501(c)(3)) database
- **Layer 2 — Ratings APIs:** Pull charity ratings and financial transparency data from Charity Navigator and/or GuideStar (Candid) APIs
- **Layer 3 — Community Flagging:** Users can flag suspicious organizations. Flagged orgs enter an admin review queue
- **Layer 4 — Manual Review:** Admin review for flagged organizations and user-submitted orgs not found in existing databases

> **Phase 1 Strategy:** In the MVP, allow users to type any organization name as free text for personal tracking. The nonprofit directory and verification system launch in Phase 3. Don't block the MVP on verification — personal tracking has value even without it.

### 6.9 Opt-In Discovery & Leaderboards

An Explore page shows only users who have opted into public discovery (Tier 3 "Open Giver" or via custom override).

**Leaderboard Rankings (non-monetary metrics only):**
- Donation count
- Streak length
- Percentage of salary (opt-in)
- Badges earned

Dollar amounts are **never** shown on leaderboards.

### 6.10 Freemium Tier Split

| Feature | Free | Premium ($5-8/mo) |
|---------|------|-------------------|
| Donation logging (manual) | Yes | Yes |
| Basic dashboard (current month + YTD) | Yes | Yes |
| Privacy controls (3-tier presets) | Yes | Yes |
| Follow other users | Up to 25 | Unlimited |
| Badges | 3 core badges | All badges |
| Social feed | Yes | Yes |
| Advanced analytics (multi-year, predictions, "what if") | — | Yes |
| Detailed category breakdowns over time | — | Yes |
| CSV / PDF export | — | Yes |
| Tax summary reports | — | Yes |
| Receipt upload and storage | — | Yes |
| Priority in discovery / Explore page | — | Yes |
| Custom giving goals | — | Yes |

> **Freemium Balance:** The core loop (log donations, see basic dashboard, follow friends) must always be free. Premium gates depth and convenience, never core social features.

---

## 7. Phased Roadmap

Each phase delivers a usable, valuable product on its own.

### Phase 1: Core MVP (Foundation)

*Goal: A usable product that one person can use to track their own giving.*

1. User registration: email/password + Google OAuth
2. Onboarding flow: name, optional salary (skip/add later), privacy tier selection (default: Private)
3. Manual donation logging: amount, org name (free text), date, scope, cause tag, one-time/recurring
4. Recurring donation auto-logging with pending/confirm flow and notifications
5. Personal dashboard: monthly totals bar chart, salary % progress ring, scope breakdown, cause tag breakdown, MoM and YoY comparisons, YTD running total
6. 3-tier privacy presets with custom overrides
7. Edit and delete past donation entries
8. Responsive design (mobile + desktop)
9. Deployed on Vercel with Supabase backend

### Phase 2: Social Layer

*Goal: Make giving a shared, encouraging experience.*

1. User search by name/email and friend invite links
2. Follow request system (required for Tier 2; direct follow for Tier 3)
3. Chronological social feed with hearts/likes
4. Public profile pages (name, bio, badges, streak, donation history per privacy settings)
5. Click-through from feed to organization info

### Phase 3: Gamification & Discovery

*Goal: Drive engagement and help users find new causes.*

1. Full badge system (salary-based and activity-based)
2. Per-badge public/hidden toggle
3. Nonprofit directory: searchable, filterable by name/category/geography
4. Organization info cards with mission, ratings, and external donation links
5. Verification pipeline: IRS database + Charity Navigator/GuideStar APIs + community flagging + admin review
6. Explore page for Tier 3 users with leaderboards (non-monetary metrics only)
7. "People who donated to X also donated to Y" recommendations

### Phase 4: Premium & Polish

*Goal: Monetize and serve power users.*

1. Stripe integration for premium subscriptions ($5-8/month)
2. Feature gating: free vs. premium tier enforcement
3. Advanced analytics: multi-year trends, category over time, predicted year-end, "what if" calculator
4. Tax summary reports grouped by organization
5. CSV and PDF export
6. Receipt upload and storage per donation (photo/PDF)
7. Custom giving goals
8. Unlimited follows and full badge library for premium users

---

## 8. Key Tradeoffs

### 8.1 Broad Audience vs. Focused Launch

**Tension:** Individuals, friend groups, and corporate programs all have different needs.
**Decision:** Launch Phase 1-2 focused on individuals and friend groups (they share 90% of the same features). Corporate features (admin dashboards, matching, reporting) are deferred. The social follow system naturally supports friend groups without dedicated group infrastructure.

### 8.2 Privacy Complexity vs. UX Simplicity

**Tension:** Granular privacy controls are a core value prop, but they create a complex settings surface.
**Risk:** Users get overwhelmed and either leave everything default (defeating the purpose) or abandon onboarding.
**Decision:** 3-tier privacy presets with optional per-field overrides. Users pick a tier during onboarding (defaulting to Private), then customize further if they want. Simplicity for most, control for power users.

### 8.3 Nonprofit Verification Quality vs. Speed

**Tension:** API integrations (IRS, Charity Navigator, GuideStar) take time to build.
**Risk:** If verification is incomplete at launch, users log donations to unverified orgs, which could undermine trust.
**Decision:** Phase 1 allows free-text org names for personal tracking. The directory and verification system launch in Phase 3, by which time the API integrations are built.

### 8.4 Auto-Log Recurring vs. Manual Confirmation

**Tension:** Auto-logging is convenient, but if a user cancels a real donation and forgets to update the app, their dashboard shows false data.
**Risk:** Inaccurate data erodes trust and makes percentage calculations meaningless.
**Decision:** Default to pending + notification. After 3 consecutive confirmations, offer auto-confirm. This balances accuracy with convenience.

### 8.5 Salary Input Sensitivity

**Tension:** Salary is needed for the core "% of income" feature, but asking for it during signup is a significant friction point.
**Risk:** Users abandon signup or enter fake numbers.
**Decision:** Salary is optional during onboarding, prompted contextually on the dashboard, and can be entered as a range rather than exact figure. Never displayed publicly.

### 8.6 Freemium Balance

**Tension:** Free tier must attract users, but premium must drive conversions.
**Decision:** Core loop (log, dashboard, follow friends) is always free. Premium offers depth (multi-year analytics, predictions, exports) and convenience (tax reports, receipt storage). Social features are never gated.

---

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Users don't return to log donations (retention) | High | Recurring donation reminders, streak badges, email digests, and eventual receipt scanning to reduce friction |
| Sensitive financial data breach | Critical | Supabase RLS for database-level privacy enforcement, salary encrypted at rest, OWASP guidelines, security audit before launch |
| Social comparison causes negative feelings | Medium | Activity-based feed defaults, leaderboards never show amounts, celebratory (not competitive) badge language |
| Nonprofit data becomes stale or inaccurate | Medium | Automated API refresh schedules, community flagging, clear "last verified" dates on org profiles |
| Low initial user base makes social features feel empty | High | Phase 1 focuses on personal dashboard value. Social features are additive (Phase 2), not required for core value |
| Recurring auto-log creates false data | Medium | Pending + confirmation model by default. Auto-confirm only offered after 3 consecutive confirmations |
| Freemium conversion too low to sustain | Medium | Monitor engagement metrics. Premium features (multi-year trends, exports) become more valuable as users accumulate data over time |
| Salary-based badges feel exclusionary | Medium | Emphasize activity badges equally, celebrate all giving levels, badge language avoids judgment |

---

## 10. Verification Plan

End-to-end tests to validate each phase before moving to the next.

### Phase 1 Verification
- Create an account with salary input; verify salary is stored encrypted and not exposed via API
- Log 5+ donations across different categories, scopes, and dates
- Set up a recurring donation and verify pending entries appear on schedule with notification
- Confirm all dashboard charts render correctly with real data
- Toggle between privacy tiers and verify settings take effect (check API responses, not just UI)
- Test on both desktop and mobile viewports

### Phase 2 Verification
- Create 2+ test accounts and follow each other
- Verify feed shows donations according to each user's privacy settings
- Confirm that hidden amounts/orgs are truly hidden in API responses
- Test follow request flow for Tier 2 profiles; test direct follow for Tier 3
- Test friend invite link flow

### Phase 3 Verification
- Search nonprofit directory and verify data accuracy against source APIs
- Earn badges by meeting criteria and verify they appear on profile per visibility settings
- Flag an organization and verify it enters the admin review queue
- Opt into discovery (Tier 3) and verify profile appears on Explore page
- Verify leaderboards never display dollar amounts under any configuration

### Phase 4 Verification
- Test Stripe subscription flow: subscribe, cancel, resubscribe
- Verify premium features are correctly gated for free vs. premium users
- Export CSV and verify data accuracy and completeness
- Test with 12+ months of data to verify multi-year analytics render correctly
- Upload receipts and verify storage and retrieval

---

## 11. Future Enhancements (Post-V1)

These features are intentionally out of scope for the initial roadmap but worth capturing for future prioritization based on user feedback and growth.

- **Plaid Integration:** Connect bank accounts to auto-detect charitable transactions and pre-fill donation logs. High-value but significant security and compliance requirements.
- **Receipt Scanning (OCR):** Auto-fill amount, org, and date from uploaded donation receipts. Reduces logging friction dramatically.
- **Giving Goals & Challenges:** Personal goals ("Donate $5,000 this year") or community challenges ("March Giving Madness"). Strong engagement driver.
- **Team / Group Pages:** Dedicated pages for friend groups, churches, or companies with combined stats. Natural viral growth mechanism.
- **Employer Matching Integration:** Flag donations eligible for employer matching and track combined impact (personal + match).
- **Impact Stories:** Partner with nonprofits to show what donations accomplished ("Your $50 provided 200 meals"). Requires nonprofit partnerships.
- **Social Sharing Cards:** Generate shareable visuals for social media ("I've donated X% of my income this year"). High viral potential.
- **Annual Giving Wrapped:** Year-end summary (like Spotify Wrapped) with total donated, top causes, badges earned, and impact highlights. High viral potential.
- **Seasonal Campaigns:** Built-in giving campaigns around Giving Tuesday, end-of-year, and disaster relief events.
- **Email Digests:** Weekly or monthly summary emails with giving stats and friend activity.
- **Public API:** Allow other platforms (budgeting apps, banking apps) to push donation data into Giving Tracker with user consent.

---

## 12. Immediate Next Steps

| # | Action Item | Purpose | Timeline |
|---|------------|---------|----------|
| 1 | Design the data model: users, donations (with cause tags), organizations, recurring schedules, follows, badges, privacy settings (3-tier model) | The data model is the backbone. Supabase RLS policies depend on getting this right. | Week 1-2 |
| 2 | Create wireframes for 4 key screens: onboarding (with privacy tier selection), donation log form (with cause tags), personal dashboard (with progress ring + charts), social feed | Validates UX assumptions before building. Cheap to iterate on wireframes. | Week 2-3 |
| 3 | Set up the project: initialize Next.js + TypeScript, connect Supabase, configure Tailwind + shadcn/ui, deploy to Vercel | Removes friction for all future development. Push-to-deploy from day one. | Week 3 |
| 4 | Build Phase 1: start with donation logging and the personal dashboard | These are the core value proposition. Everything else builds on top of a working tracker. | Weeks 4-10 |
| 5 | Recruit 10-20 beta testers from your personal network | Real usage data and feedback will be worth more than any amount of planning. | Weeks 8-10 |

---

*This document is a living plan. Revisit and update it as user feedback, technical discoveries, and market conditions evolve.*
