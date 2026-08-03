# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working With the User

- **Ask, don't assume.** If anything is unclear — scope, design intent, requirements, naming, behavior — ask a clarifying question before acting. A short clarification round is cheaper than rework.
- **Be transparent about uncertainty.** When you proceed without full confidence, say so explicitly ("I'm assuming X — let me know if that's wrong" / "I'm not sure about Y, going with Z because…"). Don't paper over gaps.
- **Applies to subagents too.** When spawning a subagent, instruct it to surface questions back rather than guess, and relay those questions to the user.

## Project

Giving Tracker — "Strava for charitable donations." A web app that helps people track, visualize, and share their charitable giving. Solo developer project, freemium model, tracking-only (no payment processing). Licensed under Apache 2.0.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (to be installed)
- **Database & Auth:** Supabase (PostgreSQL with RLS)
- **Charts:** Recharts (to be installed)
- **Deployment:** Vercel

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
src/
  app/           # Next.js App Router pages and layouts
  components/    # Reusable React components
  lib/           # Utilities, Supabase clients, helpers
  types/         # Shared TypeScript type definitions (DB schema types, form types, dashboard aggregation types)
```

## GitHub Issue Workflow

When asked to work on a GitHub issue, follow this process:

1. **Start:** Move the issue to "In Progress" on the project board. Create a new branch named `task-XXX/<short-description>` off `main`.
2. **Build:** Work through each item in the issue's **Tasks** section. As each task is completed, update the issue to check off that item (`- [x]`).
3. **Validate:** Once all tasks are done, verify every item in the **Acceptance Criteria** section. Check off each criterion on the issue as it passes (`- [x]`).
4. **Ship:** Commit the changes (reference the issue with `Closes #N`), push the branch, and create a PR for review. Move the issue to "In Review" on the project board.

GitHub project: "Giving Tracker" (project number 2, owner jen-zecena). Use `gh` CLI for all issue/project operations.

## Key Architecture Decisions

- **Privacy model:** 3-tier presets (Private, Friends Only, Open Giver) enforced at database level via Supabase RLS — not just UI
- **Salary:** Encrypted at rest, never exposed via API. Only derived percentage shown, only if user opts in
- **Recurring donations:** Default to pending + user confirmation. Auto-confirm offered after 3 consecutive confirmations
- **Currency:** Phase 1 is USD-only
- **Path aliases:** Use `@/` imports (maps to `src/`)


## Frontend Code Rules

### Always Do First
- Run the `react-best-practices` and `shadcn` skills before writing frontend component code.
- Read `src/app/globals.css` to confirm current theme tokens before using any color/spacing values.

### Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch using shadcn/ui components and the guardrails below.
- Screenshot your output with `agent-browser`, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds.

### Design System (canonical)
- **The canonical design reference is the "Giving Tracker Design System"** — the warm earth-tone system (forest green `#2e6b4e` primary, sand `#fbf8f3` page, warm ink text; clay/honey/slate-blue accents; berry destructive). Local export: `~/Downloads/Giving Tracker Design System` (claude.ai/design project `0fa4b6fc-7e42-4981-900a-e39eba6a0af7`). It supersedes both the Figma Make palette and the SnowUI retheme (PR #157, closed).
- **`src/app/globals.css` is the source of truth for token values** — a 1:1 port of the DS `tokens/*.css`, remapped onto the shadcn token names.
- **Layout DNA:** 260px sand sidebar + sticky top bar (breadcrumbs, notifications, account menu — no global search yet); content max 1180px; white cards (16px radius, hairline ring + warm ink-tinted shadow) floating on sand — no full-width white bars. Flat colour backgrounds; the only gradients allowed are the Overview sand-to-green band and the green→blue wash behind cover-less nonprofit cards.
- **When porting a screen:** read the matching screen in the DS `ui_kits/giving-tracker-app/Screens.jsx` and its README first — layout, spacing, and copy come from there. Don't improve the design — match it.
- **IA decisions (2026-08-02):** Discover is folded into Feed (no sidebar item; reached via "Find people"); Goals lives in Settings → "Goals & income"; Recurring is a tab inside My giving; copy renames "Badges" → "Milestones" and feed "likes" → "cheers" (routes unchanged).
- **Historical:** the Figma Make project (`Charitable-Donations-Tracker`, file `YLPPnOcPAkDqwZcB4PKwHe`) remains the original structural source the app was ported from — consult only for pre-redesign history, not for new styling.

### Dev Server & Screenshots
- Dev server: `npm run dev` (serves at `http://localhost:3000`). Start in background before any screenshots.
- Use the `agent-browser` skill to screenshot and visually verify pages on localhost. Never screenshot a `file:///` URL.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px".
- Check: spacing/padding, font size/weight/line-height, colors, alignment, border-radius, shadows, image sizing.

### Component & Styling Defaults
- Build with React Server Components by default. Only add `'use client'` when interactivity or browser APIs are needed.
- Use shadcn/ui components (`@/components/ui/*`) — do not build raw HTML equivalents when a primitive exists.
- Style with Tailwind v4 utility classes. Use shadcn/ui CSS variable tokens (`bg-primary`, `text-muted-foreground`, `border-border`, etc.) — not raw Tailwind palette colors.
- Responsive and mobile-first.

### Typography
- **Body/UI text:** Figtree (`font-sans`) — 400 body, 500 labels, 600 headings and actions. Default UI size is 15px.
- **Every number** (amounts, percentages, dates, EINs, counts, streaks): IBM Plex Mono (`font-mono`), tabular.
- **Marketing display / pull-quotes only:** Instrument Serif (`font-display`) — never in app chrome.
- Headings run tight (`tracking-tight`, −0.02em); body runs 1.5 line-height. Sentence case everywhere; the only uppercase is 12px tracked table headers/eyebrows.
- Do not introduce additional font families without explicit approval. (Supersedes the earlier Inter choice — confirmed 2026-08-02.)

### Design Guardrails
- **Colors:** Use the shadcn/ui theme tokens defined in `globals.css` (`--primary`, `--accent`, `--muted`, `--chart-1` through `--chart-5`, etc.). Never hardcode hex/oklch values or use default Tailwind palette colors (indigo-500, blue-600, etc.) directly.
- **Dark mode:** The app is **light-only** (decision 2026-08-02): the design system defines no dark palette, so don't invent one. Don't add `dark:` styling to new surfaces.
- **Shadows:** Use shadcn/ui's shadow tokens or layered, low-opacity shadows. Avoid flat `shadow-md` with no thought.
- **Animations:** Only animate `transform` and `opacity`. Never use `transition-all`. Use subtle easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. Use shadcn/ui's built-in states where available.
- **Spacing:** Use consistent Tailwind spacing tokens — not random increments. Maintain a visual rhythm.
- **Depth:** Surfaces should have a clear layering system (background → card → popover/floating). Use the `card`, `popover`, and `background` theme tokens to establish this.
- **Empty/loading/error states:** Every data-driven component must handle all three. Never leave a blank screen on loading or an unhandled error.

### Hard Rules
- Do not add sections, features, or content not in the reference.
- Do not "improve" a reference design — match it.
- Do not stop after one screenshot pass.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as primary color — use the theme tokens.
- Do not build custom components when a shadcn/ui primitive covers the use case.

