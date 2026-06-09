import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SELECT_COLS =
  "id, question, category, poll_type, option_a, option_b, status, is_evergreen, expires_at, created_at, promoted_at, upvote_count";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const start = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth (optional for search, required for explore) ──────────────────
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const authResult = await getAuthenticatedUser(
        authHeader.replace("Bearer ", ""),
        supabase,
      );
      userId = authResult?.userId ?? null;
    }

    // ── Query params ──────────────────────────────────────────────────────
    const url = new URL(req.url);
    const exploreMode = url.searchParams.get("explore")?.trim() ?? "";
    const q = url.searchParams.get("q")?.trim() ?? "";
    const category = url.searchParams.get("category")?.trim() ?? "";
    const sort = url.searchParams.get("sort")?.trim() ?? "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
    const cursorRaw = url.searchParams.get("cursor");
    const offset = cursorRaw ? parseInt(atob(cursorRaw)) : 0;

    // ── Explore mode ──────────────────────────────────────────────────────
    if (exploreMode) {
      if (!userId) return json({ error: "Unauthorized" }, 401);

      const now = new Date().toISOString();

      // Fetch user's voted poll IDs once — used to filter all explore modes
      const { data: votedRows } = await supabase
        .from("votes")
        .select("poll_id")
        .eq("user_id", userId);
      const votedSet = new Set((votedRows ?? []).map((v: any) => v.poll_id));

      // ── top10_global ────────────────────────────────────────────────────
      if (exploreMode === "top10_global") {
        const { data: vcRows } = await supabase
          .from("vote_counts")
          .select("poll_id, yes_count, no_count, total_count")
          .order("total_count", { ascending: false })
          .limit(60);

        const candidateIds = (vcRows ?? [])
          .filter((vc: any) => !votedSet.has(vc.poll_id))
          .map((vc: any) => vc.poll_id)
          .slice(0, 30);

        if (candidateIds.length === 0) {
          console.log(`[search] top10_global empty in ${Date.now() - start}ms`);
          return json({ polls: [] });
        }

        const { data: polls } = await supabase
          .from("polls")
          .select(SELECT_COLS)
          .in("id", candidateIds)
          .eq("status", "live")
          .or(`expires_at.is.null,expires_at.gt.${now}`);

        const vcMap: Record<string, number> = {};
        for (const vc of vcRows ?? []) vcMap[(vc as any).poll_id] = (vc as any).total_count;

        const sorted = (polls ?? [])
          .sort((a: any, b: any) => (vcMap[b.id] ?? 0) - (vcMap[a.id] ?? 0))
          .slice(0, 10);

        const enriched = await enrichPolls(supabase, sorted, sorted.map((p: any) => p.id), userId);
        console.log(`[search] top10_global done — ${enriched.length} polls in ${Date.now() - start}ms`);
        return json({ polls: enriched.filter((p: any) => p.user_vote === null) });
      }

      // ── top10_region ────────────────────────────────────────────────────
      if (exploreMode === "top10_region") {
        // Get user's region + region users in parallel
        const [userRow, regionUsersResult] = await Promise.all([
          supabase.from("users").select("region_detail, region").eq("id", userId).single(),
          // placeholder — resolved after we have region
          Promise.resolve(null as null),
        ]);

        const region = (userRow.data as any)?.region_detail ?? (userRow.data as any)?.region;
        if (!region) {
          return json({ polls: [], region: null });
        }

        // Get region users + their votes in parallel
        const [regionUsersRes, regionVotesOnCandidatesRes] = await Promise.all([
          supabase.from("users").select("id").eq("region_detail", region).limit(500),
          // Also get top poll ids from vote_counts to scope region vote query
          supabase
            .from("vote_counts")
            .select("poll_id")
            .order("total_count", { ascending: false })
            .limit(100),
        ]);

        const regionUserIds = (regionUsersRes.data ?? []).map((u: any) => u.id);
        const topPollIds = (regionVotesOnCandidatesRes.data ?? []).map((vc: any) => vc.poll_id);

        if (regionUserIds.length === 0) {
          return json({ polls: [], region });
        }

        // Get regional votes on top polls only (scoped to avoid huge query)
        const { data: regionVotes } = await supabase
          .from("votes")
          .select("poll_id")
          .in("user_id", regionUserIds)
          .in("poll_id", topPollIds.slice(0, 80))
          .limit(2000);

        // Aggregate regional vote counts by poll_id
        const pollRegionCounts: Record<string, number> = {};
        for (const v of regionVotes ?? []) {
          pollRegionCounts[(v as any).poll_id] = (pollRegionCounts[(v as any).poll_id] ?? 0) + 1;
        }

        const topRegionIds = Object.entries(pollRegionCounts)
          .sort((a, b) => b[1] - a[1])
          .filter(([id]) => !votedSet.has(id))
          .slice(0, 20)
          .map(([id]) => id);

        if (topRegionIds.length === 0) {
          return json({ polls: [], region });
        }

        const { data: polls } = await supabase
          .from("polls")
          .select(SELECT_COLS)
          .in("id", topRegionIds)
          .eq("status", "live")
          .or(`expires_at.is.null,expires_at.gt.${now}`);

        const sorted = (polls ?? [])
          .sort((a: any, b: any) => (pollRegionCounts[b.id] ?? 0) - (pollRegionCounts[a.id] ?? 0))
          .slice(0, 10);

        const enriched = await enrichPolls(supabase, sorted, sorted.map((p: any) => p.id), userId);
        console.log(`[search] top10_region(${region}) done — ${enriched.length} polls in ${Date.now() - start}ms`);
        return json({ polls: enriched.filter((p: any) => p.user_vote === null), region });
      }

      // ── blowing_up ──────────────────────────────────────────────────────
      if (exploreMode === "blowing_up") {
        // Recent polls (last 7 days) sorted by total_count as velocity proxy
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [recentPollsRes, vcRes] = await Promise.all([
          supabase
            .from("polls")
            .select("id, promoted_at")
            .eq("status", "live")
            .gt("promoted_at", sevenDaysAgo)
            .or(`expires_at.is.null,expires_at.gt.${now}`)
            .limit(100),
          supabase
            .from("vote_counts")
            .select("poll_id, total_count")
            .order("total_count", { ascending: false })
            .limit(100),
        ]);

        const recentIds = new Set(
          (recentPollsRes.data ?? [])
            .filter((p: any) => !votedSet.has(p.id))
            .map((p: any) => p.id),
        );

        const promotedAtMap: Record<string, string> = {};
        for (const p of recentPollsRes.data ?? []) {
          promotedAtMap[(p as any).id] = (p as any).promoted_at;
        }

        // Top recent polls by total_count
        const topIds = (vcRes.data ?? [])
          .filter((vc: any) => recentIds.has(vc.poll_id))
          .slice(0, 10)
          .map((vc: any) => vc.poll_id);

        if (topIds.length === 0) {
          return json({ polls: [] });
        }

        const { data: polls } = await supabase
          .from("polls")
          .select(SELECT_COLS)
          .in("id", topIds);

        const vcMap: Record<string, number> = {};
        for (const vc of vcRes.data ?? []) vcMap[(vc as any).poll_id] = (vc as any).total_count;

        const sorted = (polls ?? []).sort((a: any, b: any) => (vcMap[b.id] ?? 0) - (vcMap[a.id] ?? 0));
        const enriched = await enrichPolls(supabase, sorted, sorted.map((p: any) => p.id), userId);

        // Compute velocity = total_count / hours_since_promotion
        const withVelocity = enriched
          .filter((p: any) => p.user_vote === null)
          .map((p: any) => {
            const promotedAt = promotedAtMap[p.id];
            const hoursLive = promotedAt
              ? Math.max(1, (Date.now() - new Date(promotedAt).getTime()) / (1000 * 60 * 60))
              : 24;
            return { ...p, velocity: Math.round(p.total_count / hoursLive) };
          })
          .slice(0, 5);

        console.log(`[search] blowing_up done — ${withVelocity.length} polls in ${Date.now() - start}ms`);
        return json({ polls: withVelocity });
      }

      // ── universal ───────────────────────────────────────────────────────
      if (exploreMode === "universal") {
        const { data: vcRows } = await supabase
          .from("vote_counts")
          .select("poll_id, yes_count, no_count, total_count")
          .gte("total_count", 10)
          .order("total_count", { ascending: false })
          .limit(500);

        const consensusIds = (vcRows ?? [])
          .filter((vc: any) => {
            const pct = (vc.yes_count / vc.total_count) * 100;
            return (pct >= 88 || pct <= 12) && !votedSet.has(vc.poll_id);
          })
          .slice(0, 20)
          .map((vc: any) => vc.poll_id);

        if (consensusIds.length === 0) return json({ polls: [] });

        const { data: polls } = await supabase
          .from("polls")
          .select(SELECT_COLS)
          .in("id", consensusIds)
          .eq("status", "live")
          .or(`expires_at.is.null,expires_at.gt.${now}`);

        const enriched = await enrichPolls(supabase, polls ?? [], (polls ?? []).map((p: any) => p.id), userId);
        console.log(`[search] universal done — ${enriched.length} polls in ${Date.now() - start}ms`);
        return json({ polls: enriched.filter((p: any) => p.user_vote === null).slice(0, 8) });
      }

      // ── divided ─────────────────────────────────────────────────────────
      if (exploreMode === "divided") {
        const { data: vcRows } = await supabase
          .from("vote_counts")
          .select("poll_id, yes_count, no_count, total_count")
          .gte("total_count", 10)
          .order("total_count", { ascending: false })
          .limit(500);

        const dividedIds = (vcRows ?? [])
          .filter((vc: any) => {
            const pct = (vc.yes_count / vc.total_count) * 100;
            return pct >= 47 && pct <= 53 && !votedSet.has(vc.poll_id);
          })
          .slice(0, 20)
          .map((vc: any) => vc.poll_id);

        if (dividedIds.length === 0) return json({ polls: [] });

        const { data: polls } = await supabase
          .from("polls")
          .select(SELECT_COLS)
          .in("id", dividedIds)
          .eq("status", "live")
          .or(`expires_at.is.null,expires_at.gt.${now}`);

        const enriched = await enrichPolls(supabase, polls ?? [], (polls ?? []).map((p: any) => p.id), userId);
        console.log(`[search] divided done — ${enriched.length} polls in ${Date.now() - start}ms`);
        return json({ polls: enriched.filter((p: any) => p.user_vote === null).slice(0, 8) });
      }

      return json({ error: "Unknown explore mode" }, 400);
    }

    // ── Case 0: sort=closing → polls expiring soonest ─────────────────────
    if (sort === "closing") {
      const now = new Date().toISOString();
      const { data: closingPolls, error: closingError } = await supabase
        .from("polls")
        .select(SELECT_COLS)
        .eq("status", "live")
        .not("expires_at", "is", null)
        .gt("expires_at", now)
        .order("expires_at", { ascending: true })
        .limit(limit + 1);

      if (closingError) {
        console.error("[search] closing error:", closingError.message);
        return json({ error: "Failed to fetch closing polls" }, 500);
      }

      const pagePolls = (closingPolls ?? []).slice(0, limit);
      const hasMore = (closingPolls?.length ?? 0) > limit;
      const pollIds = pagePolls.map((p: any) => p.id);

      if (pollIds.length === 0) {
        return json({ polls: [], cursor: null, has_more: false });
      }

      const enriched = await enrichPolls(supabase, pagePolls, pollIds, userId);
      console.log(`[search] closing done — ${enriched.length} polls in ${Date.now() - start}ms`);
      return json({ polls: enriched, cursor: hasMore ? btoa(String(offset + limit)) : null, has_more: hasMore });
    }

    // ── Case 1: No params → return category counts only ───────────────────
    if (!q && !category) {
      const { data: catRows } = await supabase
        .from("polls")
        .select("category")
        .eq("status", "live");

      const counts: Record<string, number> = {};
      for (const row of catRows ?? []) {
        counts[(row as any).category] = (counts[(row as any).category] ?? 0) + 1;
      }
      const category_counts = Object.entries(counts).map(([cat, count]) => ({
        category: cat,
        count,
      }));

      console.log(`[search] category counts done in ${Date.now() - start}ms`);
      return json({ polls: [], cursor: null, has_more: false, category_counts });
    }

    // ── Case 2: Keyword search — FTS + ILIKE on category/options ─────────
    if (q) {
      const now = new Date().toISOString();

      const [ftsResult, ilikeResult] = await Promise.all([
        supabase
          .from("polls")
          .select(SELECT_COLS)
          .eq("status", "live")
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .textSearch("question", q, { type: "plain", config: "english" })
          .range(offset, offset + limit),
        supabase
          .from("polls")
          .select(SELECT_COLS)
          .eq("status", "live")
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .or(`category.ilike.%${q}%,option_a.ilike.%${q}%,option_b.ilike.%${q}%`)
          .range(offset, offset + limit),
      ]);

      if (ftsResult.error) {
        console.error("[search] FTS error:", ftsResult.error.message);
        return json({ error: "Failed to search" }, 500);
      }

      const ftsPolls = ftsResult.data ?? [];
      const ilikePolls = ilikeResult.data ?? [];
      const ftsIds = new Set(ftsPolls.map((p: any) => p.id));
      const extras = ilikePolls.filter((p: any) => !ftsIds.has(p.id));
      const merged = [...ftsPolls, ...extras];

      const pagePolls = merged.slice(0, limit);
      const hasMore = merged.length > limit;
      const pollIds = pagePolls.map((p: any) => p.id);
      const nextCursor = hasMore ? btoa(String(offset + limit)) : null;

      if (pollIds.length === 0) {
        return json({ polls: [], cursor: null, has_more: false });
      }

      const enriched = await enrichPolls(supabase, pagePolls, pollIds, userId);
      console.log(`[search] keyword done — ${enriched.length} polls in ${Date.now() - start}ms`);
      return json({ polls: enriched, cursor: nextCursor, has_more: hasMore });
    }

    // ── Case 3: Category filter — most recent first ───────────────────────
    {
      const now = new Date().toISOString();
      const { data: polls, error: dbError } = await supabase
        .from("polls")
        .select(SELECT_COLS)
        .eq("status", "live")
        .eq("category", category)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("promoted_at", { ascending: false })
        .range(offset, offset + limit);

      if (dbError) {
        console.error("[search] category DB error:", dbError.message);
        return json({ error: "Failed to search" }, 500);
      }

      const pagePolls = (polls ?? []).slice(0, limit);
      const pollIds = pagePolls.map((p: any) => p.id);
      const hasMore = (polls?.length ?? 0) > limit;
      const nextCursor = hasMore ? btoa(String(offset + limit)) : null;

      if (pollIds.length === 0) {
        return json({ polls: [], cursor: null, has_more: false });
      }

      const enriched = await enrichPolls(supabase, pagePolls, pollIds, userId);
      console.log(`[search] category done — ${enriched.length} polls in ${Date.now() - start}ms`);
      return json({ polls: enriched, cursor: nextCursor, has_more: hasMore });
    }
  } catch (err) {
    console.error("[search]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

// ── Shared enrichment: Redis counts + user votes ──────────────────────────────

async function enrichPolls(
  supabase: ReturnType<typeof createClient>,
  polls: any[],
  pollIds: string[],
  userId: string | null,
): Promise<any[]> {
  if (polls.length === 0) return [];

  const redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
  });

  const pipe = redis.pipeline();
  for (const poll of polls) {
    pipe.get(`poll:${poll.id}:yes`);
    pipe.get(`poll:${poll.id}:no`);
    pipe.get(`poll:${poll.id}:total`);
  }

  const userVoteMap: Record<string, 1 | -1> = {};
  let pipeResults: (number | null)[] = [];

  await Promise.all([
    userId
      ? supabase
          .from("votes")
          .select("poll_id, value")
          .eq("user_id", userId)
          .in("poll_id", pollIds)
          .then(({ data }) => {
            if (data) {
              for (const v of data) userVoteMap[(v as any).poll_id] = (v as any).value as 1 | -1;
            }
          })
      : Promise.resolve(),
    pipe.exec()
      .then((res) => { pipeResults = res as (number | null)[]; })
      .catch((e) => console.warn("[search] Redis pipeline error:", String(e))),
  ]);

  const missedIds = polls
    .filter((_p: any, i: number) => {
      const total = pipeResults[i * 3 + 2];
      return total === null || total === undefined;
    })
    .map((p: any) => p.id);

  const dbCountMap: Record<string, { yes_count: number; no_count: number; total_count: number }> = {};
  if (missedIds.length > 0) {
    const { data: vcRows } = await supabase
      .from("vote_counts")
      .select("poll_id, yes_count, no_count, total_count")
      .in("poll_id", missedIds);

    if (vcRows && vcRows.length > 0) {
      for (const row of vcRows) {
        dbCountMap[(row as any).poll_id] = {
          yes_count: (row as any).yes_count,
          no_count: (row as any).no_count,
          total_count: (row as any).total_count,
        };
      }

      const warmPipe = redis.pipeline();
      for (const row of vcRows) {
        warmPipe.set(`poll:${(row as any).poll_id}:yes`, (row as any).yes_count);
        warmPipe.set(`poll:${(row as any).poll_id}:no`, (row as any).no_count);
        warmPipe.set(`poll:${(row as any).poll_id}:total`, (row as any).total_count);
      }
      warmPipe.exec().catch((e: unknown) =>
        console.warn("[search] redis warmup failed:", String(e))
      );
    }
  }

  return polls.map((poll: any, i: number) => {
    const base = i * 3;
    const redisTotal = pipeResults[base + 2];
    if (redisTotal !== null && redisTotal !== undefined) {
      return {
        ...poll,
        yes_count: Number(pipeResults[base] ?? 0),
        no_count: Number(pipeResults[base + 1] ?? 0),
        total_count: Number(redisTotal),
        velocity: 0,
        user_vote: userVoteMap[poll.id] ?? null,
        comment_count: 0,
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
      comment_count: 0,
    };
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
