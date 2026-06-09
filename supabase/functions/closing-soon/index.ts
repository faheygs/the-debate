// Scheduled cron function — run every 15 minutes
// pg_cron: SELECT cron.schedule('closing-soon', '*/15 * * * *', 'SELECT net.http_post(...)');
// Notifies users who have NOT voted on polls expiring in the next 2 hours.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const start = Date.now();

  if (req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);

    // Polls closing in 1–2 hours
    const { data: closingPolls } = await supabase
      .from('polls')
      .select('id, question')
      .eq('status', 'live')
      .gt('expires_at', oneHourFromNow.toISOString())
      .lte('expires_at', twoHoursFromNow.toISOString());

    if (!closingPolls || closingPolls.length === 0) {
      console.log('[closing-soon] no closing polls in window');
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // For each closing poll, find users with push tokens who haven't voted
    let totalSent = 0;

    await Promise.allSettled(closingPolls.map(async (poll) => {
      // Get user IDs who HAVE voted on this poll
      const { data: voters } = await supabase
        .from('votes')
        .select('user_id')
        .eq('poll_id', poll.id);

      const voterIds = new Set((voters ?? []).map(v => v.user_id));

      // Get push tokens for users who haven't voted
      const { data: users } = await supabase
        .from('users')
        .select('id, expo_push_token')
        .not('expo_push_token', 'is', null)
        .limit(500);

      if (!users || users.length === 0) return;

      const tokens = users
        .filter(u => !voterIds.has(u.id))
        .map(u => u.expo_push_token)
        .filter(Boolean) as string[];

      if (tokens.length === 0) return;

      await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          tokens,
          title: 'Debate closing soon',
          body: 'This debate closes in 2 hours — have your say',
          data: { type: 'closing_soon', poll_id: poll.id },
        }),
      });

      totalSent += tokens.length;
    }));

    console.log(`[closing-soon] sent=${totalSent} for ${closingPolls.length} polls in ${Date.now() - start}ms`);
    return new Response(JSON.stringify({ sent: totalSent }), { status: 200 });
  } catch (err) {
    console.error('[closing-soon] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
