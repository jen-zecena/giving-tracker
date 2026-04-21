-- =============================================================
-- DP-051: Idempotency guard for the recurring-donation cron
-- =============================================================
--
-- Ensures that a second run of `/api/cron/recurring` on the same UTC day
-- cannot double-insert a pending donation for the same schedule. The
-- cron handler also guards the advance step with an atomic UPDATE...
-- WHERE next_due_date = <original>, but this index is the durable
-- backstop at the DB level.
--
-- The index is partial because one-off (non-recurring) donations have
-- `recurring_schedule_id IS NULL` and there can be many of those per
-- user per day — we only want to reject duplicates that originate from
-- the cron.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_donations_schedule_date
  ON donations (recurring_schedule_id, donation_date)
  WHERE recurring_schedule_id IS NOT NULL;
