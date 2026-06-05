import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FeedMode = "trending" | "fresh" | "closest" | "pending";

interface PollRow {
  id: string;
  question: string;
  category: string;
  poll_type: string;
  option_a: string | null;
  option_b: string | null;
  status: string;
  is_evergreen: boolean;
  expires_at: string | null;
  created_at: string;
  promoted_at: string | null;
  upvote_count: number;
}

interface PollWithCounts extends PollRow {
  yes_count: number;
  no_count: number;
  total_count: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

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

    // ── Query params ──────────────────────────────────────────────────────
    const url = new URL(req.url);
    const mode: FeedMode = (url.searchParams.get("mode") as FeedMode) ?? "fresh";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? atob(cursorParam) : null;

    // ── Fetch polls from PostgreSQL ───────────────────────────────────────
    const SELECT_COLS = "id, question, category, poll_type, option_a, option_b, status, is_evergreen, expires_at, created_at, promoted_at, upvote_count";
    const now = new Date().toISOString();

    let query = supabase.from("polls").select(SELECT_COLS).limit(limit + 1);

    if (mode === "pending") {
      query = query.eq("status", "pending").order("upvote_count", { ascending: false });
      if (cursor) query = query.lt("upvote_count", Number(atob(cursorParam!)));
    } else {
      // All live modes
      query = query
        .eq("status", "live")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("promoted_at", { ascending: false });

      if (cursor) query = query.lt("promoted_at", cursor);
    }

    const { data: polls, error: dbError } = await query;
    if (dbError) {
      console.error("[feed] DB error:", dbError);
      return json({ error: "Failed to fetch feed" }, 500);
    }

    const pagePolls = (polls as PollRow[]).slice(0, limit);

    // ── Enrich with counts from Redis, fallback to vote_counts ────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    const enriched: PollWithCounts[] = await Promise.all(
      pagePolls.map(async (poll) => {
        const [redisYes, redisNo, redisTotal] = await Promise.all([
          redis.get<number>(`poll:${poll.id}:yes`),
          redis.get<number>(`poll:${poll.id}:no`),
          redis.get<number>(`poll:${poll.id}:total`),
        ]);

        if (redisTotal !== null) {
          return {
            ...poll,
            yes_count: Number(redisYes ?? 0),
            no_count: Number(redisNo ?? 0),
            total_count: Number(redisTotal),
          };
        }

        const { data: vc } = await supabase
          .from("vote_counts")
          .select("yes_count, no_count, total_count")
          .eq("poll_id", poll.id)
          .maybeSingle();

        return {
          ...poll,
          yes_count: vc?.yes_count ?? 0,
          no_count: vc?.no_count ?? 0,
          total_count: vc?.total_count ?? 0,
        };
      }),
    );

    // Closest mode: re-sort by controversy score after enriching with counts
    if (mode === "closest") {
      enriched.sort((a, b) => {
        const controversy = (p: PollWithCounts) =>
          p.total_count === 0 ? 0 : 1 - Math.abs(p.yes_count / p.total_count - 0.5) * 2;
        return controversy(b) - controversy(a);
      });
    }

    // ── Cursor for next page ──────────────────────────────────────────────
    const hasMore = (polls as PollRow[]).length > limit;
    const lastItem = enriched[enriched.length - 1];
    const nextCursor = hasMore && lastItem?.promoted_at
      ? btoa(lastItem.promoted_at)
      : null;

    return json({ polls: enriched, cursor: nextCursor, has_more: hasMore });
  } catch (err) {
    console.error("[feed]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
