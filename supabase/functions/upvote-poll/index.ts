import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UPVOTE_THRESHOLD = 10; // upvotes needed to go live (beta)
const LIVE_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json();
    const { poll_id } = body;
    if (!poll_id || typeof poll_id !== "string") {
      return json({ error: "poll_id required" }, 400);
    }

    // ── Verify poll exists and is still pending ────────────────────────────
    const { data: poll } = await supabase
      .from("polls")
      .select("id, status")
      .eq("id", poll_id)
      .maybeSingle();

    if (!poll) return json({ error: "Poll not found" }, 404);
    if (poll.status !== "pending") {
      return json({ error: "Poll is no longer pending", promoted: poll.status === "live" }, 409);
    }

    // ── INSERT upvote (PK conflict = already upvoted) ─────────────────────
    const { error: upvoteError } = await supabase
      .from("poll_upvotes")
      .insert({ poll_id, user_id: userId });

    if (upvoteError) {
      if (upvoteError.code === "23505") {
        return json({ error: "Already upvoted", upvoted: false }, 409);
      }
      console.error("[upvote-poll] Insert failed:", upvoteError.message);
      return json({ error: "Failed to record upvote" }, 500);
    }

    console.log(`[upvote-poll] upvote inserted in ${Date.now() - start}ms`);

    // ── Count upvotes + Redis INCR — parallel ─────────────────────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    const [upvoteCount] = await Promise.all([
      supabase
        .from("poll_upvotes")
        .select("*", { count: "exact", head: true })
        .eq("poll_id", poll_id)
        .then((r) => r.count ?? 0),
      redis.incr(`poll:${poll_id}:upvotes`).catch(() => null),
    ]);

    // Update denormalized count fire-and-forget
    supabase.from("polls").update({ upvote_count: upvoteCount }).eq("id", poll_id)
      .then(({ error }) => {
        if (error) console.warn("[upvote-poll] upvote_count update failed:", error.message);
      });

    console.log(`[upvote-poll] count=${upvoteCount} in ${Date.now() - start}ms`);

    // ── Check promotion threshold ─────────────────────────────────────────
    if (upvoteCount >= UPVOTE_THRESHOLD) {
      const expiresAt = new Date(Date.now() + LIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const promotedAt = new Date().toISOString();

      const { data: promotedPoll } = await supabase
        .from("polls")
        .update({ status: "live", promoted_at: promotedAt, expires_at: expiresAt })
        .eq("id", poll_id)
        .eq("status", "pending") // atomic: only one caller wins
        .select("id")
        .maybeSingle();

      if (promotedPoll) {
        console.log(`[upvote-poll] poll ${poll_id} promoted to live!`);

        // Add to trending sorted set with seed score
        redis.zadd("feed:trending", { score: 10, member: poll_id }).catch(() => {});

        // Broadcast to feed:global so feed screens pick it up
        supabase.channel("feed:global").send({
          type: "broadcast",
          event: "feed_update",
          payload: { new: [poll_id] },
        }).catch(() => {});
      }

      console.log(`[upvote-poll] done in ${Date.now() - start}ms`);
      return json({ upvoted: true, promoted: !!promotedPoll, upvote_count: upvoteCount });
    }

    console.log(`[upvote-poll] done in ${Date.now() - start}ms`);
    return json({ upvoted: true, promoted: false, upvote_count: upvoteCount });
  } catch (err) {
    console.error("[upvote-poll]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
