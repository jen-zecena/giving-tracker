-- DP-046: Tier-aware RLS hardening for donations + profiles.
--
-- Replaces the DP-007 placeholder policies with the full tier logic from
-- FIGMA_PORT_PLAN.md §7. After this migration, a user can SELECT another
-- user's donations only when:
--   * they are the owner, OR
--   * they are an admin, OR
--   * the target's privacy_tier is `open_giver`   AND hide_from_feed = false, OR
--   * the target's privacy_tier is `friends_only` AND hide_from_feed = false
--     AND an active `follows` row exists (follower = auth.uid(),
--     following = donation.user_id).
--
-- Private donations are invisible to non-owners; admin / self read is
-- always preserved. The same tier logic (minus hide_from_feed, which
-- doesn't exist on profiles) gates profiles SELECT.
--
-- Implementation notes:
-- * A SECURITY DEFINER helper `privacy_tier_of(uuid)` reads the target's
--   tier while bypassing profiles RLS. This sidesteps the circular
--   dependency that would otherwise arise from donations_select
--   consulting profiles_select, which in turn consults follows.
-- * `profiles_select` is re-asserted even though its DP-007 shape is
--   already tier-aware. Keeping the DROP + CREATE pair makes the DP-046
--   contract explicit in one place.

-- =============================================================
-- 1. privacy_tier_of() helper
-- =============================================================
-- Returns the target user's privacy_tier bypassing RLS. STABLE because
-- the underlying row changes rarely per statement; SECURITY DEFINER so
-- RLS on profiles does not block the lookup.

CREATE OR REPLACE FUNCTION public.privacy_tier_of(target_user_id uuid)
RETURNS privacy_tier
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT privacy_tier FROM public.profiles WHERE id = target_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.privacy_tier_of(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.privacy_tier_of(uuid) TO authenticated;

-- =============================================================
-- 2. donations — tier-aware SELECT
-- =============================================================

DROP POLICY IF EXISTS donations_select ON donations;

CREATE POLICY donations_select ON donations
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR public.is_admin()
    OR (
      hide_from_feed = false
      AND (
        public.privacy_tier_of(user_id) = 'open_giver'
        OR (
          public.privacy_tier_of(user_id) = 'friends_only'
          AND EXISTS (
            SELECT 1 FROM public.follows
            WHERE follower_id = (select auth.uid())
              AND following_id = donations.user_id
          )
        )
      )
    )
  );

-- =============================================================
-- 3. profiles — tier-aware SELECT (re-asserted)
-- =============================================================
-- profiles doesn't carry hide_from_feed, so the policy is tier-only.
-- Re-creating it under DP-046 keeps the contract documented here even
-- though DP-007's shape already matched.

DROP POLICY IF EXISTS profiles_select ON profiles;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    (select auth.uid()) = id
    OR public.is_admin()
    OR privacy_tier = 'open_giver'
    OR (
      privacy_tier = 'friends_only'
      AND EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = (select auth.uid())
          AND following_id = profiles.id
      )
    )
  );
