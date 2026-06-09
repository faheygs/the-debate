-- Phase 8: Personal Board permissions

-- user_insights: authenticated users can read their own row
-- service_role (Edge Functions) can insert + update
GRANT SELECT ON public.user_insights TO authenticated;
GRANT INSERT, UPDATE ON public.user_insights TO service_role;

-- votes: authenticated users can read their own votes (for board history)
-- Already granted SELECT in migration 005 but adding explicit own-row RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_insights' AND policyname = 'users select own insights'
  ) THEN
    ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users select own insights" ON user_insights FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- index for user_insights lookup by user_id (PK already, but just in case)
CREATE INDEX IF NOT EXISTS idx_votes_user_id_created ON votes(user_id, created_at DESC);
