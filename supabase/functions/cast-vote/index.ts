import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOTED_TTL = 2592000; // 30 days

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const start = Date.now();

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

    // ── Validate body ─────────────────────────────────────────────────────
    const body = await req.json() as { poll_id?: string; value?: number };
    const { poll_id, value } = body;
    if (!poll_id || (value !== 1 && value !== -1)) {
      return json({ error: "Body must contain poll_id and value (1 or -1)" }, 400);
    }

    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    // ── Duplicate-vote gate ───────────────────────────────────────────────
    const voteKey = `user:${userId}:voted:${poll_id}`;
    const alreadyVoted = await redis.get(voteKey);
    if (alreadyVoted) return json({ error: "Already voted on this poll" }, 409);

    // ── Parallel Redis counter update + voted flag ────────────────────────
    // incr the voted side, get the other, incr total, set voted flag — all at once
    const [yesRaw, noRaw, totalRaw] = await Promise.all([
      value === 1
        ? redis.incr(`poll:${poll_id}:yes`)
        : redis.get<number>(`poll:${poll_id}:yes`),
      value === -1
        ? redis.incr(`poll:${poll_id}:no`)
        : redis.get<number>(`poll:${poll_id}:no`),
      redis.incr(`poll:${poll_id}:total`),
      redis.set(voteKey, "1", { ex: VOTED_TTL }),
    ]);

    const yesCount = Number(yesRaw ?? 0);
    const noCount = Number(noRaw ?? 0);
    const total = Number(totalRaw);

    console.log(`[cast-vote] Redis done in ${Date.now() - start}ms`);

    // ── Broadcast immediately (before DB) ─────────────────────────────────
    supabase.channel(`poll:${poll_id}`).send({
      type: "broadcast",
      event: "vote_update",
      payload: { yes: yesCount, no: noCount, total },
    });

    // ── DB writes fire-and-forget (background, don't await) ──────────────
    Promise.allSettled([
      supabase
        .from("votes")
        .upsert(
          { poll_id, user_id: userId, value },
          { onConflict: "poll_id,user_id", ignoreDuplicates: true },
        )
        .then(({ error }) => {
          if (error) console.warn("[cast-vote] votes upsert failed:", error.message);
        }),
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
        .then(({ error }) => {
          if (error) console.warn("[cast-vote] vote_counts upsert failed:", error.message);
        }),
    ]);

    console.log(`[cast-vote] done in ${Date.now() - start}ms`);

    return json({ success: true, yes_count: yesCount, no_count: noCount, total });
  } catch (err) {
    console.error("[cast-vote]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
