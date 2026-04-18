-- DP-007: First-pass RLS policies for new + modified tables.
--
-- Covers: is_admin() helper, enables RLS on the 7 DP-006 tables, and adds
-- policies per FIGMA_PORT_PLAN.md §7. Also expands profiles + donations
-- SELECT policies to include admin/tier placeholders — DP-046 will tighten
-- donations + profiles to full tier-aware behavior.

-- =============================================================
-- 1. Admin helper
-- =============================================================
-- SECURITY DEFINER bypasses RLS on profiles, which is essential to avoid
-- recursion when is_admin() is called from a profiles policy. The empty
-- search_path forces fully-qualified table references.

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = check_user_id),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- =============================================================
-- 2. profiles — expand SELECT to admin + tier placeholder
-- =============================================================
-- Existing profiles_select (owner-only) is replaced with a union that adds
-- admin read and a placeholder tier-aware branch. DP-046 tightens this.

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

-- =============================================================
-- 3. donations — expand SELECT to admin + authenticated-other placeholder
-- =============================================================
-- Placeholder per DP-007 plan: owner-read + admin-read + authenticated-other-read
-- gated by hide_from_feed. DP-046 tightens to full tier-aware behavior.

DROP POLICY IF EXISTS donations_select ON donations;

CREATE POLICY donations_select ON donations
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR public.is_admin()
    OR (
      (select auth.uid()) IS NOT NULL
      AND hide_from_feed = false
    )
  );

-- =============================================================
-- 4. follows — follower inserts own row, both parties read
-- =============================================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows FORCE ROW LEVEL SECURITY;

CREATE POLICY follows_insert ON follows
  FOR INSERT WITH CHECK ((select auth.uid()) = follower_id);

CREATE POLICY follows_select ON follows
  FOR SELECT USING (
    (select auth.uid()) = follower_id
    OR (select auth.uid()) = following_id
    OR public.is_admin()
  );

CREATE POLICY follows_delete ON follows
  FOR DELETE USING ((select auth.uid()) = follower_id);

-- =============================================================
-- 5. follow_requests — sender inserts, both read, receiver updates
-- =============================================================

ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY follow_requests_insert ON follow_requests
  FOR INSERT WITH CHECK ((select auth.uid()) = from_user_id);

CREATE POLICY follow_requests_select ON follow_requests
  FOR SELECT USING (
    (select auth.uid()) = from_user_id
    OR (select auth.uid()) = to_user_id
    OR public.is_admin()
  );

CREATE POLICY follow_requests_update ON follow_requests
  FOR UPDATE USING ((select auth.uid()) = to_user_id);

CREATE POLICY follow_requests_delete ON follow_requests
  FOR DELETE USING (
    (select auth.uid()) = from_user_id
    OR (select auth.uid()) = to_user_id
  );

-- =============================================================
-- 6. likes — owner insert/delete, authenticated read
-- =============================================================

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes FORCE ROW LEVEL SECURITY;

CREATE POLICY likes_insert ON likes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY likes_select ON likes
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY likes_delete ON likes
  FOR DELETE USING ((select auth.uid()) = user_id);

-- =============================================================
-- 7. goals — owner CRUD only
-- =============================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;

CREATE POLICY goals_select ON goals
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY goals_insert ON goals
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY goals_update ON goals
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY goals_delete ON goals
  FOR DELETE USING ((select auth.uid()) = user_id);

-- =============================================================
-- 8. notifications — owner read/update/delete, service-role insert
-- =============================================================
-- No INSERT policy is defined. With FORCE RLS, inserts are blocked for
-- authenticated/anon roles; notifications must be created server-side via
-- the service role key (DP-024 emit helpers).

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY notifications_delete ON notifications
  FOR DELETE USING ((select auth.uid()) = user_id);

-- =============================================================
-- 9. nonprofits — authenticated read, admin write
-- =============================================================

ALTER TABLE nonprofits ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonprofits FORCE ROW LEVEL SECURITY;

CREATE POLICY nonprofits_select ON nonprofits
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY nonprofits_insert ON nonprofits
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY nonprofits_update ON nonprofits
  FOR UPDATE USING (public.is_admin());

CREATE POLICY nonprofits_delete ON nonprofits
  FOR DELETE USING (public.is_admin());

-- =============================================================
-- 10. nonprofit_flags — owner insert + read own, admin read/update all
-- =============================================================

ALTER TABLE nonprofit_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonprofit_flags FORCE ROW LEVEL SECURITY;

CREATE POLICY nonprofit_flags_select ON nonprofit_flags
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR public.is_admin()
  );

CREATE POLICY nonprofit_flags_insert ON nonprofit_flags
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY nonprofit_flags_update ON nonprofit_flags
  FOR UPDATE USING (public.is_admin());

CREATE POLICY nonprofit_flags_delete ON nonprofit_flags
  FOR DELETE USING (public.is_admin());
