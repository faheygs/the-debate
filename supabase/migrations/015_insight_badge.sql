-- Add insight_seen and week_start_date to user_insights
ALTER TABLE user_insights
  ADD COLUMN IF NOT EXISTS insight_seen BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS week_start_date TIMESTAMPTZ;

-- Add insight_badge to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS insight_badge BOOLEAN DEFAULT FALSE;

-- Grant new column access
GRANT UPDATE(insight_seen) ON public.user_insights TO authenticated;
GRANT UPDATE(insight_badge) ON public.users TO authenticated;
