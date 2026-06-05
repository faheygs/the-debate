-- Grant authenticated role access to all tables.
-- This fixes the permission denied errors that occur with RLS enabled.

GRANT SELECT, INSERT         ON public.polls          TO authenticated;
GRANT SELECT, INSERT         ON public.votes          TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users          TO authenticated;
GRANT SELECT, INSERT         ON public.comments       TO authenticated;
GRANT SELECT, INSERT         ON public.comment_flags  TO authenticated;
GRANT SELECT, INSERT         ON public.poll_upvotes   TO authenticated;
GRANT SELECT                 ON public.vote_counts    TO authenticated;
GRANT SELECT                 ON public.user_insights  TO authenticated;

-- Allow service role (Edge Functions) to write vote_counts
GRANT SELECT, INSERT, UPDATE ON public.vote_counts    TO service_role;
GRANT SELECT, INSERT         ON public.votes          TO service_role;

-- ── pg_cron jobs ───────────────────────────────────────────────────────────
-- Enable the pg_cron and pg_net extensions if not already enabled.
-- Run in Supabase dashboard: Database → Extensions → enable pg_cron and pg_net.
--
-- After enabling extensions, replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY
-- with real values, then run these statements in the SQL editor:
--
-- SELECT cron.schedule(
--   'background-sync',
--   '*/10 * * * *',
--   $$
--   SELECT net.http_post(
--     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/background-sync',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type',  'application/json'
--     ),
--     body    := '{}'::jsonb
--   )
--   $$
-- );
--
-- SELECT cron.schedule(
--   'ranking-update',
--   '*/30 * * * *',
--   $$
--   SELECT net.http_post(
--     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ranking-update',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type',  'application/json'
--     ),
--     body    := '{}'::jsonb
--   )
--   $$
-- );
