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

    // ── Extract poll ID from path: /functions/v1/poll/{id} ────────────────
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const pollId = pathParts[pathParts.length - 1];

    if (!pollId || pollId === "poll") {
      return json({ error: "Poll ID required" }, 400);
    }

    // ── Fetch poll metadata ───────────────────────────────────────────────
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .maybeSingle();

    if (pollError) {
      console.error("[poll] DB error:", pollError);
      return json({ error: "Failed to fetch poll" }, 500);
    }
    if (!poll) {
      return json({ error: "Poll not found" }, 404);
    }

    // ── Current counts: Redis first, fallback to vote_counts ─────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    const [redisYes, redisNo, redisTotal, userVotedFlag] = await Promise.all([
      redis.get<number>(`poll:${pollId}:yes`),
      redis.get<number>(`poll:${pollId}:no`),
      redis.get<number>(`poll:${pollId}:total`),
      redis.get(`user:${userId}:voted:${pollId}`),
    ]);

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

    // ── User's own vote (Redis check + DB fallback) ───────────────────────
    let userVote: number | null = null;
    if (userVotedFlag) {
      // Redis has the flag but not the value — check DB for actual vote value
      const { data: voteRow } = await supabase
        .from("votes")
        .select("value")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .maybeSingle();
      userVote = voteRow?.value ?? null;
    }

    // ── Demographic breakdown from votes table ────────────────────────────
    const { data: voteRows } = await supabase
      .from("votes")
      .select("value, users(age_range, region, political_lean, gender)")
      .eq("poll_id", pollId);

    const breakdown = buildDemographicBreakdown(voteRows ?? []);

    // ── Approved comments (no user_id exposed) ────────────────────────────
    const { data: comments } = await supabase
      .from("comments")
      .select("id, content, created_at")
      .eq("poll_id", pollId)
      .eq("ai_decision", "approved")
      .order("created_at", { ascending: false })
      .limit(50);

    return json({
      poll,
      yes_count: yesCount,
      no_count: noCount,
      total_count: totalCount,
      user_vote: userVote,
      demographic_breakdown: breakdown,
      comments: comments ?? [],
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

function buildDemographicBreakdown(votes: VoteRow[]) {
  const byAge: Record<string, { yes: number; no: number }> = {};
  const byRegion: Record<string, { yes: number; no: number }> = {};
  const byPolitics: Record<string, { yes: number; no: number }> = {};
  const byGender: Record<string, { yes: number; no: number }> = {};

  for (const v of votes) {
    const isYes = v.value === 1;
    const u = v.users;
    if (!u) continue;

    const bump = (group: Record<string, { yes: number; no: number }>, key: string | null) => {
      if (!key) return;
      group[key] ??= { yes: 0, no: 0 };
      isYes ? group[key].yes++ : group[key].no++;
    };

    bump(byAge, u.age_range);
    bump(byRegion, u.region);
    bump(byGender, u.gender);
    if (u.political_lean !== null) {
      const label = politicalLabel(u.political_lean);
      bump(byPolitics, label);
    }
  }

  const toPct = (group: Record<string, { yes: number; no: number }>) =>
    Object.fromEntries(
      Object.entries(group).map(([k, v]) => {
        const total = v.yes + v.no;
        return [k, { yes_pct: total > 0 ? Math.round((v.yes / total) * 100) : 0, total }];
      }),
    );

  return {
    age: toPct(byAge),
    region: toPct(byRegion),
    politics: toPct(byPolitics),
    gender: toPct(byGender),
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
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
