import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Internal utility called by pg_cron to warm Redis with current vote_counts.
// No auth — warming Redis is harmless to anyone who calls it.
//
//   curl -X POST https://<project>.supabase.co/functions/v1/warm-redis

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const start = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Read all vote_counts ──────────────────────────────────────────────
    const { data: rows, error: dbError } = await supabase
      .from("vote_counts")
      .select("poll_id, yes_count, no_count, total_count");

    if (dbError) {
      console.error("[warm-redis] DB error:", dbError.message);
      return json({ error: "Failed to read vote_counts" }, 500);
    }

    const allRows = rows ?? [];
    console.log(`[warm-redis] read ${allRows.length} rows in ${Date.now() - start}ms`);

    if (allRows.length === 0) {
      return json({ warmed: 0, message: "No vote_counts rows found" });
    }

    // ── Write all counts to Redis in a single pipeline ────────────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    // Upstash pipeline limit: 1000 commands. Batch in chunks of 300 polls
    // (3 keys each = 900 commands per batch — safely under the limit).
    const CHUNK = 300;
    let warmed = 0;

    for (let i = 0; i < allRows.length; i += CHUNK) {
      const chunk = allRows.slice(i, i + CHUNK);
      const pipe = redis.pipeline();
      for (const row of chunk) {
        pipe.set(`poll:${row.poll_id}:yes`, row.yes_count);
        pipe.set(`poll:${row.poll_id}:no`, row.no_count);
        pipe.set(`poll:${row.poll_id}:total`, row.total_count);
      }
      await pipe.exec();
      warmed += chunk.length;
    }

    const elapsed = Date.now() - start;
    console.log(`[warm-redis] warmed ${warmed} polls in ${elapsed}ms`);

    return json({ warmed, elapsed_ms: elapsed });
  } catch (err) {
    console.error("[warm-redis]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
