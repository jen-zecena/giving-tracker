# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Key Architecture Decisions

- **Privacy model:** 3-tier presets (Private, Friends Only, Open Giver) enforced at database level via Supabase RLS — not just UI
- **Salary:** Encrypted at rest, never exposed via API. Only derived percentage shown, only if user opts in
- **Recurring donations:** Default to pending + user confirmation. Auto-confirm offered after 3 consecutive confirmations
- **Currency:** Phase 1 is USD-only
- **Path aliases:** Use `@/` imports (maps to `src/`)
