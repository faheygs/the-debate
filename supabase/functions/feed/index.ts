import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FeedMode = "trending" | "fresh" | "for_you" | "pending" | "review";

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
  user_upvoted?: boolean;
  tags: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const t0 = Date.now();

  try {
    // ── Auth (JWT cache — ~0ms on warm calls, ~50ms on cold) ──────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authResult = await getAuthenticatedUser(
      authHeader.replace("Bearer ", ""),
      supabase,
    );
    if (!authResult) return json({ error: "Unauthorized" }, 401);
    const { userId, cached: authCached } = authResult;

    const tAuth = Date.now() - t0;

    // ── Query params ──────────────────────────────────────────────────────
    const url = new URL(req.url);
    const mode: FeedMode = (url.searchParams.get("mode") as FeedMode) ?? "fresh";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? atob(cursorParam) : null;
    const categoryFilter = url.searchParams.get("category") ?? null;
    const timedFilter = url.searchParams.get("timed") === "true";
    const tagFilter = url.searchParams.get("tag") ?? null;

    const pfx = `[feed:${mode}]`;
    console.log(`${pfx} auth: ${tAuth}ms (${authCached ? "cache hit" : "cold"}) | limit=${limit} cursor=${cursor ?? "null"} category=${categoryFilter ?? "none"} timed=${timedFilter} tag=${tagFilter ?? "none"} userId=${userId}`);

    // ── Fetch polls from PostgreSQL ───────────────────────────────────────
    const SELECT_COLS = "id, question, category, poll_type, option_a, option_b, status, is_evergreen, expires_at, created_at, promoted_at, upvote_count";
    const now = new Date().toISOString();

    let query = supabase.from("polls").select(SELECT_COLS).limit(limit + 1);

    if (mode === "pending" || mode === "review") {
      query = query.eq("status", "pending").order("created_at", { ascending: false });
      if (cursor) query = query.lt("created_at", atob(cursorParam!));
    } else {
      query = query
        .eq("status", "live")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("promoted_at", { ascending: false });

      if (cursor) query = query.lt("promoted_at", cursor);
    }

    if (categoryFilter) query = query.eq("category", categoryFilter);
    if (timedFilter) query = query.not("expires_at", "is", null).gt("expires_at", now);

    const { data: polls, error: dbError } = await query;
    if (dbError) {
      console.error(`${pfx} DB error:`, dbError.message);
      return json({ error: "Failed to fetch feed" }, 500);
    }

    const tPollQuery = Date.now() - t0;
    console.log(`${pfx} poll query: ${tPollQuery}ms (${polls?.length ?? 0} rows)`);

    const pagePolls = (polls as PollRow[]).slice(0, limit);
    const pollIds = pagePolls.map((p) => p.id);

    if (pollIds.length === 0) {
      console.log(`${pfx} done (empty) in ${Date.now() - t0}ms`);
      return json({ polls: [], cursor: null, has_more: false });
    }

    // ── Redis client ──────────────────────────────────────────────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    // ── Redis pipeline + DB queries in parallel (both need only pollIds) ──
    const isReviewMode = mode === "review" || mode === "pending";

    const pipe = redis.pipeline();
    for (const poll of pagePolls) {
      pipe.get(`poll:${poll.id}:yes`);
      pipe.get(`poll:${poll.id}:no`);
      pipe.get(`poll:${poll.id}:total`);
      pipe.get(`poll:${poll.id}:velocity`);
    }

    const userVoteMap: Record<string, 1 | -1> = {};
    const commentCountMap: Record<string, number> = {};
    const userUpvoteSet = new Set<string>();
    let pipeResults: (number | null)[] = [];

    const tBatchStart = Date.now();

    await Promise.all([
      pipe.exec().then((results) => {
        pipeResults = results as (number | null)[];
        console.log(`${pfx} redis pipeline: ${Date.now() - t0}ms`);
      }).catch((redisErr) => {
        console.warn(`${pfx} redis pipeline error:`, String(redisErr));
      }),

      supabase
        .from("votes")
        .select("poll_id, value")
        .eq("user_id", userId)
        .in("poll_id", pollIds)
        .then(({ data }) => {
          if (data) {
            for (const v of data) userVoteMap[v.poll_id] = v.value as 1 | -1;
          }
          console.log(`${pfx} vote query: ${Date.now() - t0}ms`);
        }),

      supabase
        .from("comments")
        .select("poll_id")
        .in("poll_id", pollIds)
        .eq("ai_decision", "approved")
        .then(({ data }) => {
          if (data) {
            for (const c of data) {
              commentCountMap[c.poll_id] = (commentCountMap[c.poll_id] ?? 0) + 1;
            }
          }
          console.log(`${pfx} comment counts: ${Date.now() - t0}ms`);
        }),

      isReviewMode
        ? supabase
          .from("poll_upvotes")
          .select("poll_id")
          .eq("user_id", userId)
          .in("poll_id", pollIds)
          .then(({ data }) => {
            if (data) {
              for (const u of data) userUpvoteSet.add(u.poll_id);
            }
          })
        : Promise.resolve(),
    ]);

    // Tags query placeholder — wire in when migration 012 poll_tags is live.
    // Add to the Promise.all above:
    //   supabase.from("poll_tags").select("poll_id, tag").in("poll_id", pollIds)
    console.log(`${pfx} tags query: ${Date.now() - t0}ms (skipped — tags: [])`);

    const tBatch = Date.now() - tBatchStart;
    console.log(`${pfx} full batch (redis+votes+comments): ${tBatch}ms`);

    // ── DB fallback for Redis misses + warm Redis for next request ────────
    const missedIds: string[] = [];
    for (let i = 0; i < pagePolls.length; i++) {
      const total = pipeResults[i * 4 + 2];
      if (total === null || total === undefined) missedIds.push(pagePolls[i].id);
    }

    const dbCountMap: Record<string, { yes_count: number; no_count: number; total_count: number }> = {};
    if (missedIds.length > 0) {
      const { data: vcRows } = await supabase
        .from("vote_counts")
        .select("poll_id, yes_count, no_count, total_count")
        .in("poll_id", missedIds);

      if (vcRows && vcRows.length > 0) {
        // Populate the in-memory map for this response
        for (const row of vcRows) {
          dbCountMap[row.poll_id] = {
            yes_count: row.yes_count,
            no_count: row.no_count,
            total_count: row.total_count,
          };
        }

        // Write counts back to Redis so the next request hits cache.
        // Fire-and-forget pipeline — one HTTP call for all missed polls.
        const warmPipe = redis.pipeline();
        for (const row of vcRows) {
          warmPipe.set(`poll:${row.poll_id}:yes`, row.yes_count);
          warmPipe.set(`poll:${row.poll_id}:no`, row.no_count);
          warmPipe.set(`poll:${row.poll_id}:total`, row.total_count);
        }
        warmPipe.exec().catch((e: unknown) =>
          console.warn(`${pfx} redis warmup failed:`, String(e))
        );
      }

      console.log(`${pfx} db fallback (${missedIds.length} misses): ${Date.now() - t0}ms`);
    }

    // ── Enrich ────────────────────────────────────────────────────────────
    const enriched: PollWithCounts[] = pagePolls.map((poll, i) => {
      const base = i * 4;
      const redisTotal = pipeResults[base + 2];
      if (redisTotal !== null && redisTotal !== undefined) {
        return {
          ...poll,
          yes_count: Number(pipeResults[base] ?? 0),
          no_count: Number(pipeResults[base + 1] ?? 0),
          total_count: Number(redisTotal),
          velocity: Number(pipeResults[base + 3] ?? 0),
          user_vote: userVoteMap[poll.id] ?? null,
          comment_count: commentCountMap[poll.id] ?? 0,
          user_upvoted: userUpvoteSet.has(poll.id),
          tags: [],
        };
      }
      const vc = dbCountMap[poll.id];
      return {
        ...poll,
        yes_count: vc?.yes_count ?? 0,
        no_count: vc?.no_count ?? 0,
        total_count: vc?.total_count ?? 0,
        velocity: 0,
        user_vote: userVoteMap[poll.id] ?? null,
        comment_count: commentCountMap[poll.id] ?? 0,
        user_upvoted: userUpvoteSet.has(poll.id),
        tags: [],
      };
    });

    const hasMore = (polls as PollRow[]).length > limit;
    const lastItem = enriched[enriched.length - 1];
    const cursorField = isReviewMode ? lastItem?.created_at : lastItem?.promoted_at;
    const nextCursor = hasMore && cursorField ? btoa(cursorField) : null;

    const tTotal = Date.now() - t0;
    console.log(`${pfx} done — ${enriched.length} polls in ${tTotal}ms (auth=${tAuth}ms poll_query=${tPollQuery - tAuth}ms batch=${tBatch}ms)`);

    return json({ polls: enriched, cursor: nextCursor, has_more: hasMore });
  } catch (err) {
    console.error("[feed]", err);
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
