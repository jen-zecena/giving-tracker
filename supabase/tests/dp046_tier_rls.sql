-- DP-046 tier-aware RLS behavioral tests.
--
-- Exercises the 9 core combinations spelled out in the issue
-- (3 tiers × 3 viewer relationships) plus the two hide_from_feed
-- variants for the non-private tiers, and confirms admin + owner
-- overrides still work. Designed to run against a fresh schema with
-- the 004 + 005 migrations applied.
--
-- How to run:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--         -f supabase/tests/dp046_tier_rls.sql
--
-- Any failing assertion raises an exception and aborts the script, so
-- the exit code is non-zero on regression.

\set ON_ERROR_STOP on

BEGIN;

DO $dp046$
DECLARE
  priv_id   uuid := '11111111-1111-1111-1111-111111111111';
  fr_id     uuid := '22222222-2222-2222-2222-222222222222';
  open_id   uuid := '33333333-3333-3333-3333-333333333333';
  follower  uuid := '44444444-4444-4444-4444-444444444444';
  other     uuid := '55555555-5555-5555-5555-555555555555';
  admin_id  uuid := '66666666-6666-6666-6666-666666666666';
  n bigint;

  -- Small helper procedures live inline: PL/pgSQL doesn't let us
  -- CREATE functions inside a DO block, so we inline login / expect
  -- logic using plain PERFORM + IF calls.
BEGIN
  -- ── 1. Fixture rows ───────────────────────────────────────────
  INSERT INTO auth.users (id, email) VALUES
    (priv_id,  'priv-target@test.local'),
    (fr_id,    'friends-target@test.local'),
    (open_id,  'open-target@test.local'),
    (follower, 'follower@test.local'),
    (other,    'other@test.local'),
    (admin_id, 'admin@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, display_name, privacy_tier, is_admin) VALUES
    (priv_id,  'Priv Target',    'private',      false),
    (fr_id,    'Friends Target', 'friends_only', false),
    (open_id,  'Open Target',    'open_giver',   false),
    (follower, 'Follower',       'open_giver',   false),
    (other,    'Other',          'open_giver',   false),
    (admin_id, 'Admin',          'open_giver',   true)
  ON CONFLICT (id) DO UPDATE SET
    privacy_tier = EXCLUDED.privacy_tier,
    is_admin     = EXCLUDED.is_admin;

  INSERT INTO follows (follower_id, following_id)
    VALUES (follower, fr_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO donations (
    id, user_id, organization_name, amount, donation_date,
    scope, status, hide_from_feed
  ) VALUES
    ('aaaaaaaa-0001-0000-0000-000000000001', priv_id,
       'Priv Org',            10, '2026-04-01', 'local', 'confirmed', false),
    ('aaaaaaaa-0002-0000-0000-000000000002', fr_id,
       'Friends Org',         20, '2026-04-01', 'local', 'confirmed', false),
    ('aaaaaaaa-0002-0000-0000-000000000003', fr_id,
       'Friends Org Hidden',  21, '2026-04-02', 'local', 'confirmed', true),
    ('aaaaaaaa-0003-0000-0000-000000000004', open_id,
       'Open Org',            30, '2026-04-01', 'local', 'confirmed', false),
    ('aaaaaaaa-0003-0000-0000-000000000005', open_id,
       'Open Org Hidden',     31, '2026-04-02', 'local', 'confirmed', true)
  ON CONFLICT (id) DO NOTHING;

  -- Helper — assert a count under a specific logged-in user.
  -- (Repeated inline via PERFORM below; wrapped in a closure-like
  -- function would require CREATE, which we can't do inside DO.)

  -- ── 2. Owner read ─────────────────────────────────────────────
  RAISE NOTICE 'Owner read (self always wins):';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', priv_id::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT count(*) INTO n FROM donations WHERE user_id = priv_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ private owner sees own donation: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ private owner sees own donation';

  SELECT count(*) INTO n FROM profiles WHERE id = priv_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ private owner sees own profile: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ private owner sees own profile';

  -- ── 3. Private tier, non-owner viewers ────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE 'Private tier (non-owner viewers):';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', other::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM donations WHERE user_id = priv_id;
  IF n <> 0 THEN RAISE EXCEPTION '  ❌ other sees private donations: got %, want 0', n; END IF;
  RAISE NOTICE '  ✅ other cannot read private donations';

  SELECT count(*) INTO n FROM profiles WHERE id = priv_id;
  IF n <> 0 THEN RAISE EXCEPTION '  ❌ other sees private profile: got %, want 0', n; END IF;
  RAISE NOTICE '  ✅ other cannot read private profile';

  -- A follower-of-someone-else still cannot read private target's rows.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', follower::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM donations WHERE user_id = priv_id;
  IF n <> 0 THEN RAISE EXCEPTION '  ❌ follower-of-friends-target sees private donations: got %', n; END IF;
  RAISE NOTICE '  ✅ non-follower-of-private cannot read private donations';

  -- ── 4. Friends-only tier ──────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE 'Friends-only tier:';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', other::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM donations WHERE user_id = fr_id;
  IF n <> 0 THEN RAISE EXCEPTION '  ❌ non-follower sees friends donations: got %', n; END IF;
  RAISE NOTICE '  ✅ non-follower cannot read friends donations';

  SELECT count(*) INTO n FROM profiles WHERE id = fr_id;
  IF n <> 0 THEN RAISE EXCEPTION '  ❌ non-follower sees friends profile: got %', n; END IF;
  RAISE NOTICE '  ✅ non-follower cannot read friends profile';

  -- Follower sees 1 of 2 rows (hidden one excluded).
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', follower::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM donations WHERE user_id = fr_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ follower sees friends donations: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ follower reads only non-hidden friends donation';

  SELECT count(*) INTO n FROM profiles WHERE id = fr_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ follower sees friends profile: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ follower reads friends profile';

  -- ── 5. Open-giver tier ────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE 'Open-giver tier:';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', other::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM donations WHERE user_id = open_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ other reads open donations: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ other reads open donations (hidden row excluded)';

  SELECT count(*) INTO n FROM profiles WHERE id = open_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ other reads open profile: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ other reads open profile';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', follower::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM donations WHERE user_id = open_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ follower sees open donations: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ follower also sees only non-hidden open row';

  -- ── 6. Admin override ─────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE 'Admin override:';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', admin_id::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO n FROM donations WHERE id::text LIKE 'aaaaaaaa-%';
  IF n <> 5 THEN RAISE EXCEPTION '  ❌ admin reads all donations: got %, want 5', n; END IF;
  RAISE NOTICE '  ✅ admin reads every donation (5 fixture rows)';

  SELECT count(*) INTO n FROM profiles WHERE id = priv_id;
  IF n <> 1 THEN RAISE EXCEPTION '  ❌ admin reads private profile: got %, want 1', n; END IF;
  RAISE NOTICE '  ✅ admin reads private profile';

  -- ── 7. Cleanup ────────────────────────────────────────────────
  PERFORM set_config('request.jwt.claims', NULL, true);
  PERFORM set_config('role', NULL, true);

  DELETE FROM donations WHERE id::text LIKE 'aaaaaaaa-%';
  DELETE FROM follows  WHERE follower_id = follower AND following_id = fr_id;
  DELETE FROM profiles WHERE id IN (priv_id, fr_id, open_id, follower, other, admin_id);
  DELETE FROM auth.users WHERE id IN (priv_id, fr_id, open_id, follower, other, admin_id);

  RAISE NOTICE '';
  RAISE NOTICE 'All DP-046 RLS assertions passed.';
END
$dp046$;

COMMIT;

-- ── 8. EXPLAIN — confirm no obvious perf regression ───────────────
-- These run outside the fixture txn; inspect by eye. Expect an index
-- scan on follows (follower_id, following_id) and no Seq Scan on
-- profiles.

\echo ''
\echo 'EXPLAIN donations_select path (single-user filter):'
EXPLAIN (COSTS OFF)
  SELECT id FROM donations
  WHERE user_id = '00000000-0000-0000-0000-000000000000';

\echo ''
\echo 'EXPLAIN profiles_select path:'
EXPLAIN (COSTS OFF)
  SELECT id FROM profiles
  WHERE id = '00000000-0000-0000-0000-000000000000';
