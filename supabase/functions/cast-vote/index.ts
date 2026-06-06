import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOTED_TTL = 2592000; // 30 days in seconds

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = user.id;

    // ── Validate body ─────────────────────────────────────────────────────
    const body = await req.json() as { poll_id?: string; value?: number };
    const { poll_id, value } = body;
    if (!poll_id || (value !== 1 && value !== -1)) {
      return json({ error: "Body must contain poll_id and value (1 or -1)" }, 400);
    }

    // ── Redis ─────────────────────────────────────────────────────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    // Duplicate-vote check — Redis is the fast gate
    const voteKey = `user:${userId}:voted:${poll_id}`;
    const alreadyVoted = await redis.get(voteKey);
    if (alreadyVoted) {
      return json({ error: "Already voted on this poll" }, 409);
    }

    // Increment Redis counters
    let yesCount: number;
    let noCount: number;

    if (value === 1) {
      yesCount = await redis.incr(`poll:${poll_id}:yes`);
      noCount = Number((await redis.get(`poll:${poll_id}:no`)) ?? 0);
    } else {
      noCount = await redis.incr(`poll:${poll_id}:no`);
      yesCount = Number((await redis.get(`poll:${poll_id}:yes`)) ?? 0);
    }
    const total = await redis.incr(`poll:${poll_id}:total`);

    // Mark voted in Redis (30-day TTL) — must succeed before we return
    await redis.set(voteKey, "1", { ex: VOTED_TTL });

    // ── PostgreSQL writes (synchronous, best-effort) ───────────────────────
    // Both writes run in parallel. Failures are logged but do not fail the
    // request — Redis is already updated and the user's vote is counted.
    const [votesResult, countsResult] = await Promise.allSettled([
      // Record the individual vote
      supabase
        .from("votes")
        .upsert(
          { poll_id, user_id: userId, value },
          { onConflict: "poll_id,user_id", ignoreDuplicates: true },
        )
        .then(({ error }) => { if (error) throw error; }),

      // Keep vote_counts as a near-real-time PG mirror of Redis totals
      supabase
        .from("vote_counts")
        .upsert(
          {
            poll_id,
            yes_count: yesCount,
            no_count: noCount,
            total_count: total,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "poll_id" },
        )
        .then(({ error }) => { if (error) throw error; }),
    ]);

    if (votesResult.status === "rejected") {
      console.warn("[cast-vote] votes upsert failed:", String(votesResult.reason));
    }
    if (countsResult.status === "rejected") {
      console.warn("[cast-vote] vote_counts upsert failed:", String(countsResult.reason));
    }

    // ── Realtime broadcast ────────────────────────────────────────────────
    await supabase.channel(`poll:${poll_id}`).send({
      type: "broadcast",
      event: "vote_update",
      payload: { yes: yesCount, no: noCount, total },
    });

    return json({ success: true, yes_count: yesCount, no_count: noCount, total });
  } catch (err) {
    console.error("[cast-vote]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
