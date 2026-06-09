import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string | string[];
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

interface SendNotificationPayload {
  token: string;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
}

interface BatchSendPayload {
  tokens: string[];
  title?: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const start = Date.now();

  // Only callable from service role (other Edge Functions or cron jobs)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await req.json() as SendNotificationPayload | BatchSendPayload;

    const tokens = 'tokens' in body ? body.tokens : [body.token];
    const validTokens = tokens.filter(t => t?.startsWith('ExponentPushToken['));

    if (validTokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const messages: PushMessage[] = validTokens.map(token => ({
      to: token,
      title: body.title,
      body: body.body,
      data: body.data ?? {},
      sound: 'default',
    }));

    // Send in batches of 100 (Expo limit)
    const batches: PushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      batches.push(messages.slice(i, i + 100));
    }

    const results = await Promise.allSettled(
      batches.map(batch =>
        fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(batch),
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length * 100;
    console.log(`[send-notification] sent=${validTokens.length} batches=${batches.length} in ${Date.now() - start}ms`);

    return new Response(JSON.stringify({ sent: validTokens.length }), { status: 200 });
  } catch (err) {
    console.error('[send-notification] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
