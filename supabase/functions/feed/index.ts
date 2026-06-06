import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FeedMode = "trending" | "fresh" | "closest" | "for_you" | "pending";

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
  velocity: number;
  user_vote: 1 | -1 | null;
  comment_count: number;
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

    console.log(`[feed] mode=${mode} limit=${limit} cursor=${cursor ?? "null"} userId=${user.id}`);

    // ── Fetch polls from PostgreSQL ───────────────────────────────────────
    const SELECT_COLS = "id, question, category, poll_type, option_a, option_b, status, is_evergreen, expires_at, created_at, promoted_at, upvote_count";
    const now = new Date().toISOString();

    let query = supabase.from("polls").select(SELECT_COLS).limit(limit + 1);

    if (mode === "pending") {
      query = query.eq("status", "pending").order("upvote_count", { ascending: false });
      if (cursor) query = query.lt("upvote_count", Number(atob(cursorParam!)));
    } else {
      query = query
        .eq("status", "live")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("promoted_at", { ascending: false });

      if (cursor) query = query.lt("promoted_at", cursor);
    }

    const { data: polls, error: dbError } = await query;
    if (dbError) {
      console.error("[feed] DB error:", dbError.message, dbError.details, dbError.hint);
      return json({ error: "Failed to fetch feed", detail: dbError.message }, 500);
    }

    console.log(`[feed] DB returned ${polls?.length ?? 0} rows`);

    const pagePolls = (polls as PollRow[]).slice(0, limit);
    const pollIds = pagePolls.map((p) => p.id);

    // ── Batch: user votes + comment counts ────────────────────────────────
    const userVoteMap: Record<string, 1 | -1> = {};
    const commentCountMap: Record<string, number> = {};

    await Promise.all([
      // User votes for this page
      supabase
        .from("votes")
        .select("poll_id, value")
        .eq("user_id", user.id)
        .in("poll_id", pollIds)
        .then(({ data, error }) => {
          if (error) {
            console.warn("[feed] user-vote query error:", error.message);
          } else if (data) {
            for (const v of data) {
              userVoteMap[v.poll_id] = v.value as 1 | -1;
            }
            console.log(`[feed] user has voted on ${data.length} polls in this page`);
          }
        }),

      // Comment counts for this page (approved only)
      supabase
        .from("comments")
        .select("poll_id")
        .in("poll_id", pollIds)
        .eq("ai_decision", "approved")
        .then(({ data, error }) => {
          if (error) {
            console.warn("[feed] comment count query error:", error.message);
          } else if (data) {
            for (const c of data) {
              commentCountMap[c.poll_id] = (commentCountMap[c.poll_id] ?? 0) + 1;
            }
          }
        }),
    ]);

    // ── Enrich with counts from Redis, fallback to vote_counts ────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    const enriched: PollWithCounts[] = await Promise.all(
      pagePolls.map(async (poll) => {
        let velocity = 0;
        try {
          const [redisYes, redisNo, redisTotal, redisVelocity] = await Promise.all([
            redis.get<number>(`poll:${poll.id}:yes`),
            redis.get<number>(`poll:${poll.id}:no`),
            redis.get<number>(`poll:${poll.id}:total`),
            redis.get<number>(`poll:${poll.id}:velocity`),
          ]);

          velocity = Number(redisVelocity ?? 0);

          if (redisTotal !== null) {
            return {
              ...poll,
              yes_count: Number(redisYes ?? 0),
              no_count: Number(redisNo ?? 0),
              total_count: Number(redisTotal),
              velocity,
              user_vote: userVoteMap[poll.id] ?? null,
              comment_count: commentCountMap[poll.id] ?? 0,
            };
          }
        } catch (redisErr) {
          console.warn(`[feed] Redis error for poll ${poll.id}:`, String(redisErr));
        }

        // Fall back to vote_counts table
        const { data: vc, error: vcErr } = await supabase
          .from("vote_counts")
          .select("yes_count, no_count, total_count")
          .eq("poll_id", poll.id)
          .maybeSingle();

        if (vcErr) {
          console.warn(`[feed] vote_counts error for poll ${poll.id}:`, vcErr.message);
        }

        return {
          ...poll,
          yes_count: vc?.yes_count ?? 0,
          no_count: vc?.no_count ?? 0,
          total_count: vc?.total_count ?? 0,
          velocity,
          user_vote: userVoteMap[poll.id] ?? null,
          comment_count: commentCountMap[poll.id] ?? 0,
        };
      }),
    );

    console.log(`[feed] returning ${enriched.length} enriched polls`);

    if (mode === "closest") {
      enriched.sort((a, b) => {
        const controversy = (p: PollWithCounts) =>
          p.total_count === 0 ? 0 : 1 - Math.abs(p.yes_count / p.total_count - 0.5) * 2;
        return controversy(b) - controversy(a);
      });
    }

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
