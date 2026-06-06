import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // ── Extract poll ID from path ─────────────────────────────────────────
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const pollId = pathParts[pathParts.length - 1];
    if (!pollId || pollId === "poll") return json({ error: "Poll ID required" }, 400);

    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    // ── All queries in parallel ───────────────────────────────────────────
    // Collapses 4 sequential round-trip layers into 1
    const [
      pollResult,
      profileResult,
      voteRowsResult,
      rawCommentsResult,
      myCommentResult,
      commentCountResult,
      userVoteResult,
      redisYes,
      redisNo,
      redisTotal,
    ] = await Promise.all([
      supabase.from("polls").select("*").eq("id", pollId).maybeSingle(),
      supabase
        .from("users")
        .select("age_range, region, region_detail, political_lean, gender, comment_banned")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("votes")
        .select("value, users(age_range, region, political_lean, gender)")
        .eq("poll_id", pollId),
      supabase
        .from("comments")
        .select("id, content, created_at, users:user_id(age_range, region_detail, political_lean)")
        .eq("poll_id", pollId)
        .eq("ai_decision", "approved")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("comments")
        .select("id, content")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("poll_id", pollId)
        .eq("ai_decision", "approved"),
      supabase
        .from("votes")
        .select("value")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .maybeSingle(),
      redis.get<number>(`poll:${pollId}:yes`),
      redis.get<number>(`poll:${pollId}:no`),
      redis.get<number>(`poll:${pollId}:total`),
    ]);

    console.log(`[poll] parallel fetch: ${Date.now() - start}ms`);

    // ── Poll existence check ──────────────────────────────────────────────
    if (pollResult.error) {
      console.error("[poll] DB error:", pollResult.error);
      return json({ error: "Failed to fetch poll" }, 500);
    }
    if (!pollResult.data) return json({ error: "Poll not found" }, 404);

    const poll = pollResult.data;
    const profile = profileResult.data;

    // ── Counts: Redis first, fallback to vote_counts ──────────────────────
    let yesCount: number;
    let noCount: number;
    let totalCount: number;

    if (redisTotal !== null) {
      yesCount = Number(redisYes ?? 0);
      noCount = Number(redisNo ?? 0);
      totalCount = Number(redisTotal);
    } else {
      const { data: vc } = await supabase
        .from("vote_counts")
        .select("yes_count, no_count, total_count")
        .eq("poll_id", pollId)
        .maybeSingle();
      yesCount = vc?.yes_count ?? 0;
      noCount = vc?.no_count ?? 0;
      totalCount = vc?.total_count ?? 0;
    }

    // ── Build response ────────────────────────────────────────────────────
    const userVote: number | null = userVoteResult.data?.value ?? null;
    const myComment = myCommentResult.data;
    const commentCount = commentCountResult.count ?? 0;

    const { demographic_breakdown, full_breakdown } = buildDemographicBreakdown(
      voteRowsResult.data ?? [],
    );

    const comments = (rawCommentsResult.data ?? []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      age_range: c.users?.age_range ?? null,
      region_detail: c.users?.region_detail ?? null,
      political_lean: c.users?.political_lean ?? null,
    }));

    const userDemographics = {
      age_group: profile?.age_range ?? null,
      region: profile?.region ?? null,
      region_detail: profile?.region_detail ?? null,
      politics_label: profile?.political_lean != null ? politicalLabel(profile.political_lean) : null,
      gender: profile?.gender ?? null,
    };

    console.log(`[poll] done in ${Date.now() - start}ms`);

    return json({
      poll,
      yes_count: yesCount,
      no_count: noCount,
      total_count: totalCount,
      comment_count: commentCount,
      user_vote: userVote,
      demographic_breakdown,
      full_breakdown,
      user_demographics: userDemographics,
      comments,
      has_commented: myComment !== null,
      user_comment: myComment?.content ?? null,
      comment_banned: profile?.comment_banned ?? false,
    });
  } catch (err) {
    console.error("[poll]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

type VoteRow = {
  value: number;
  users: { age_range: string | null; region: string | null; political_lean: number | null; gender: string | null } | null;
};

type GroupCounts = Record<string, { yes: number; no: number }>;

function buildDemographicBreakdown(votes: VoteRow[]) {
  const byAge: GroupCounts = {};
  const byRegion: GroupCounts = {};
  const byPolitics: GroupCounts = {};
  const byGender: GroupCounts = {};

  for (const v of votes) {
    const isYes = v.value === 1;
    const u = v.users;
    if (!u) continue;

    const bump = (group: GroupCounts, key: string | null) => {
      if (!key) return;
      group[key] ??= { yes: 0, no: 0 };
      isYes ? group[key].yes++ : group[key].no++;
    };

    bump(byAge, u.age_range);
    bump(byRegion, u.region);
    bump(byGender, u.gender);
    if (u.political_lean !== null) bump(byPolitics, politicalLabel(u.political_lean));
  }

  const toPct = (group: GroupCounts) =>
    Object.fromEntries(
      Object.entries(group).map(([k, v]) => {
        const total = v.yes + v.no;
        return [k, { yes_pct: total > 0 ? Math.round((v.yes / total) * 100) : 0, total }];
      }),
    );

  const toSortedArray = (group: GroupCounts) =>
    Object.entries(group)
      .map(([label, v]) => {
        const total = v.yes + v.no;
        return { label, yes: v.yes, no: v.no, total, yes_pct: total > 0 ? Math.round((v.yes / total) * 100) : 0 };
      })
      .sort((a, b) => b.total - a.total);

  return {
    demographic_breakdown: {
      age: toPct(byAge),
      region: toPct(byRegion),
      politics: toPct(byPolitics),
      gender: toPct(byGender),
    },
    full_breakdown: {
      age: toSortedArray(byAge),
      region: toSortedArray(byRegion).slice(0, 10),
      politics: toSortedArray(byPolitics),
      gender: toSortedArray(byGender),
    },
  };
}

function politicalLabel(lean: number): string {
  if (lean <= -2) return "Very Liberal";
  if (lean === -1) return "Liberal";
  if (lean === 0) return "Moderate";
  if (lean === 1) return "Conservative";
  return "Very Conservative";
}

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
