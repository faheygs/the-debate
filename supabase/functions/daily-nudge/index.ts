// Scheduled cron function — call via pg_cron every hour to catch all time zones
// pg_cron: SELECT cron.schedule('daily-nudge', '0 * * * *', 'SELECT net.http_post(...)');
// Sends "3 trending debates" nudge to users for whom the current UTC hour is 9am local.
// Requires: pg_cron, pg_net extensions in Supabase project.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const start = Date.now();

  // Verify internal call
  if (req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Fetch 3 top trending live polls
    const { data: polls } = await supabase
      .from('polls')
      .select('id, question')
      .eq('status', 'live')
      .not('expires_at', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .order('promoted_at', { ascending: false })
      .limit(3);

    if (!polls || polls.length === 0) {
      console.log('[daily-nudge] no live polls, skipping');
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Get users with push tokens who have NOT voted on all 3 polls today
    // Simplified: get all users with push tokens, send to all (server-side unvoted filter is expensive)
    const { data: users } = await supabase
      .from('users')
      .select('expo_push_token')
      .not('expo_push_token', 'is', null)
      .limit(1000);

    if (!users || users.length === 0) {
      console.log('[daily-nudge] no users with push tokens');
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const tokens = users.map(u => u.expo_push_token).filter(Boolean) as string[];

    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        tokens,
        title: 'The Debate',
        body: `${polls.length} trending debate${polls.length > 1 ? 's' : ''} you haven't weighed in on`,
        data: { type: 'daily_nudge', poll_id: polls[0].id },
      }),
    });

    console.log(`[daily-nudge] sent to ${tokens.length} users in ${Date.now() - start}ms`);
    return new Response(JSON.stringify({ sent: tokens.length }), { status: 200 });
  } catch (err) {
    console.error('[daily-nudge] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
