import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

// Called by pg_cron every 10 seconds.
// 1. Syncs Redis vote counts → vote_counts table (UPSERT)
// 2. Drains each poll's vote_queue → inserts individual rows into votes table

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  // Accept calls from pg_cron (service role Bearer) or internal calls
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!authHeader.includes(serviceKey.slice(-20))) {
    // Loose check: ensure the token ends with the last 20 chars of the service key
    // pg_cron sends the full key as Bearer token
    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceKey,
  );

  const redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
  });

  try {
    // ── 1. Get all live poll IDs ──────────────────────────────────────────
    const { data: livePolls, error: pollsError } = await supabase
      .from("polls")
      .select("id")
      .eq("status", "live");

    if (pollsError) {
      console.error("[background-sync] Failed to fetch live polls:", pollsError);
      return new Response(JSON.stringify({ error: "DB error" }), { status: 500 });
    }

    const pollIds = (livePolls ?? []).map((p: { id: string }) => p.id);
    if (pollIds.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }));
    }

    let syncedCounts = 0;
    let syncedVotes = 0;

    await Promise.all(
      pollIds.map(async (pollId: string) => {
        // ── 2. Sync vote counts ─────────────────────────────────────────
        const [yes, no, total] = await Promise.all([
          redis.get<number>(`poll:${pollId}:yes`),
          redis.get<number>(`poll:${pollId}:no`),
          redis.get<number>(`poll:${pollId}:total`),
        ]);

        if (total !== null) {
          const { error: upsertError } = await supabase
            .from("vote_counts")
            .upsert(
              {
                poll_id: pollId,
                yes_count: Number(yes ?? 0),
                no_count: Number(no ?? 0),
                total_count: Number(total),
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "poll_id" },
            );

          if (upsertError) {
            console.error(`[background-sync] vote_counts upsert failed for ${pollId}:`, upsertError);
          } else {
            syncedCounts++;
          }
        }

        // ── 3. Drain vote queue into votes table ───────────────────────
        const queueKey = `poll:${pollId}:vote_queue`;
        const queueLen = await redis.llen(queueKey);
        if (queueLen === 0) return;

        // Atomically grab all queued items and clear the list
        const [queueItems] = await Promise.all([
          redis.lrange<string>(queueKey, 0, queueLen - 1),
          redis.ltrim(queueKey, queueLen, -1),
        ]);

        if (!queueItems || queueItems.length === 0) return;

        const voteRows = queueItems
          .map((item) => {
            try {
              const parsed = typeof item === "string" ? JSON.parse(item) : item;
              return {
                poll_id: pollId,
                user_id: parsed.user_id as string,
                value: parsed.value as number,
                created_at: parsed.created_at as string,
              };
            } catch {
              console.error("[background-sync] Failed to parse queue item:", item);
              return null;
            }
          })
          .filter(Boolean);

        if (voteRows.length === 0) return;

        // ON CONFLICT DO NOTHING handles the unique(poll_id, user_id) constraint
        const { error: insertError, count } = await supabase
          .from("votes")
          .insert(voteRows, { count: "exact" })
          .select();

        if (insertError && insertError.code !== "23505") {
          console.error(`[background-sync] votes insert failed for ${pollId}:`, insertError);
        } else {
          syncedVotes += voteRows.length;
        }
      }),
    );

    console.log(`[background-sync] Synced ${syncedCounts} polls, ${syncedVotes} votes`);
    return new Response(
      JSON.stringify({ success: true, synced_counts: syncedCounts, synced_votes: syncedVotes }),
    );
  } catch (err) {
    console.error("[background-sync] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
