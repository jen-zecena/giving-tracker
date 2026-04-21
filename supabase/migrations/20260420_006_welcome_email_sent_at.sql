-- DP-054: Track whether the one-time welcome email has been sent to a
-- given profile. The auth callback checks this flag before dispatching
-- so repeated callback visits (e.g. password resets, OAuth re-auth)
-- don't re-trigger the welcome.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.welcome_email_sent_at IS
  'First time the DP-054 welcome email was dispatched. NULL = not yet sent.';
