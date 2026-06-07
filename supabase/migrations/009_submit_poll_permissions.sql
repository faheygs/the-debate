-- Permissions for poll submission and upvoting
GRANT INSERT ON public.polls TO authenticated;
GRANT INSERT ON public.polls TO service_role;
GRANT SELECT, UPDATE ON public.polls TO service_role;

GRANT INSERT, SELECT ON public.poll_upvotes TO authenticated;
GRANT INSERT, SELECT ON public.poll_upvotes TO service_role;

-- Index for pending poll feed ordering
CREATE INDEX IF NOT EXISTS idx_polls_status_created ON polls(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_upvotes_poll_id ON poll_upvotes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_upvotes_user_poll ON poll_upvotes(user_id, poll_id);

-- Add option_a / option_b if not present (added in migration 004 but guard anyway)
ALTER TABLE polls ADD COLUMN IF NOT EXISTS option_a TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS option_b TEXT;
