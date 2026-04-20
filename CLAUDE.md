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

### Figma Make Source (canonical reference for ports)
- **Figma Make project:** `Charitable-Donations-Tracker` — https://www.figma.com/make/YLPPnOcPAkDqwZcB4PKwHe/Charitable-Donations-Tracker
- **File key:** `YLPPnOcPAkDqwZcB4PKwHe`
- **Pull via MCP (preferred, always current):** call `mcp__figma__get_design_context` with `fileKey: "YLPPnOcPAkDqwZcB4PKwHe"` and `nodeId: "0:1"` to list resources, then `mcp__figma__ReadMcpResourceTool` (server `figma`) with the returned `file://figma/make/source/...` URIs to read individual pages/components/styles. First run in a new session will prompt for Figma OAuth — complete it once and every worktree in the session can read from the project.
- **Offline mirror (partial):** A local snapshot of frequently referenced pages lives at `~/Projects/giving-tracker-figma-source/` (not checked in). Treat the MCP as canonical — the mirror is only for grep / offline reading, not guaranteed current.
- **When porting a page:** pull the matching `src/app/pages/*.tsx` via MCP, match its layout/spacing/copy, and map its literal `blue-*`/`purple-*`/`green-*` Tailwind colors onto our theme tokens (`--primary`, `--accent`, `--success`, `--info`, `--metric-*`) per the Design Guardrails below. Don't improve the design — match it.

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
- **Body/UI text:** Inter (`font-sans`).
- **Code, metrics, IDs, timestamps:** Geist Mono (`font-mono`).
- Apply tight tracking (`tracking-tight`) on large headings, generous line-height on body text.
- Do not introduce additional font families without explicit approval.

### Design Guardrails
- **Colors:** Use the shadcn/ui theme tokens defined in `globals.css` (`--primary`, `--accent`, `--muted`, `--chart-1` through `--chart-5`, etc.). Never hardcode hex/oklch values or use default Tailwind palette colors (indigo-500, blue-600, etc.) directly.
- **Dark mode:** Dashboard and data-heavy pages should default to dark mode. The `.dark` class on `<html>` activates the dark theme tokens already defined in `globals.css`.
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

