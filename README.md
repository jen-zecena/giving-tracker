# Giving Tracker

"Strava for charitable donations" — a web app to track, visualize, and share
your charitable giving. Freemium, tracking-only (no payment processing).
Licensed under Apache 2.0.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database & Auth:** Supabase (PostgreSQL with Row-Level Security)
- **Deployment:** Vercel

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in the values (see comments in the file)
npm run dev                  # http://localhost:3000
```

## Commands

```bash
npm run dev      # Start the dev server
npm run build    # Production build
npm run start    # Start the production server
npm run lint     # Run ESLint
```

## Tests

Tests are standalone scripts run with `tsx` — no test runner or config:

```bash
npx tsx tests/<name>.test.ts       # run one test file
```

Each file prints per-assertion `✅ / ❌` lines and exits non-zero on failure.

## Admin Access

Admin-only surfaces live under `/admin/*` (e.g. `/admin/review-queue`). There
is **no self-serve admin signup** — an account becomes an admin only when its
`profiles.is_admin` column is flipped to `true` directly in the database.

Access is enforced in two independent layers (defense in depth):

1. **Route guard** — `src/app/(app)/admin/layout.tsx` is a Server Component
   that loads the current user, looks up `profiles.is_admin`, and calls
   `notFound()` for anyone who is not signed in **or** not an admin. Non-admins
   get the **404** not-found page — the admin area doesn't reveal that it
   exists. Because the guard lives in the segment layout, every current and
   future page under `/admin/*` inherits it.
2. **Database RLS** — the `is_admin()` Postgres helper gates every write to
   `nonprofits` and `nonprofit_flags`, and the admin-only server actions
   (`listFlagsByStatus`, `updateFlagStatus`) re-check `is_admin` in TypeScript.
   Even if a request reaches the server, Postgres rejects admin-only writes
   from non-admin users.

The sidebar's **"Review Queue"** link is only rendered for admins — the
`(app)` layout resolves `is_admin` server-side and passes it to the nav, so
non-admins never see a path into `/admin/*`. This is a UX convenience only;
the two layers above are the actual boundary.

### Granting admin (manual `is_admin` flip)

There is intentionally no UI for this. Flip the flag directly in Supabase.

**Option A — Supabase dashboard (recommended)**

1. Open your project → **SQL Editor**.
2. Run, substituting the target account's email:

   ```sql
   update public.profiles
   set is_admin = true
   where id = (select id from auth.users where email = 'person@example.com');
   ```

3. Have the user sign out and back in (or reload) — the guard re-checks
   `is_admin` on the next request, so no deploy is needed.

**Option B — service role key from a script**

`SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`) bypasses RLS and can run the
same `update`. Keep it server-side only; never expose it to the browser.

### Revoking admin

Reverse the flip:

```sql
update public.profiles
set is_admin = false
where id = (select id from auth.users where email = 'person@example.com');
```

### Verifying the gate

- As a **non-admin**, visiting `/admin/review-queue` returns a 404.
- As an **admin**, the same URL renders the admin page.
- `npx tsx tests/admin-guard-audit.test.ts` statically checks that both the
  route guard and the RLS admin gates are intact.
