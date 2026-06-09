import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const start = Date.now();

  try {
    // ── Auth (JWT cache) ──────────────────────────────────────────────────
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
    const userId = authResult.userId;

    // ── Parallel: vote history + insights + comment/opinion counts + profile ─
    const [voteResult, insightsResult, commentsResult, opinionVotesResult, profileResult] = await Promise.all([
      supabase
        .from("votes")
        .select(`
          value,
          created_at,
          poll_id,
          polls(
            question,
            category,
            poll_type,
            option_a,
            option_b
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("user_insights")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("ai_decision", "approved"),
      supabase
        .from("opinion_votes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("users")
        .select("age_range, gender, region_detail, political_lean, income_bracket, education_level, created_at")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const voteRows = (voteResult.data ?? []) as Array<{
      value: number;
      created_at: string;
      poll_id: string;
      polls: {
        question: string;
        category: string;
        poll_type: string;
        option_a: string | null;
        option_b: string | null;
      } | null;
    }>;

    const insights = insightsResult.data ?? null;
    const total_comments = commentsResult.count ?? 0;
    const total_opinion_votes = opinionVotesResult.count ?? 0;
    const user_profile = profileResult.data ?? null;
    const pollIds = voteRows.map(v => v.poll_id).filter(Boolean);

    // ── Fetch vote counts for all polls at once ───────────────────────────
    let voteCounts: Record<string, { yes_count: number; no_count: number; total_count: number }> = {};
    if (pollIds.length > 0) {
      const { data: countRows } = await supabase
        .from("vote_counts")
        .select("poll_id, yes_count, no_count, total_count")
        .in("poll_id", pollIds);

      for (const row of countRows ?? []) {
        voteCounts[row.poll_id] = {
          yes_count: row.yes_count,
          no_count: row.no_count,
          total_count: row.total_count,
        };
      }
    }

    // ── Build vote history ────────────────────────────────────────────────
    const vote_history = voteRows
      .filter(v => v.polls)
      .map(v => {
        const poll = v.polls!;
        const counts = voteCounts[v.poll_id] ?? { yes_count: 0, no_count: 0, total_count: 0 };
        return {
          poll_id: v.poll_id,
          question: poll.question,
          category: poll.category,
          poll_type: poll.poll_type,
          option_a: poll.option_a,
          option_b: poll.option_b,
          value: v.value,
          yes_count: counts.yes_count,
          no_count: counts.no_count,
          total_count: counts.total_count,
          voted_at: v.created_at,
        };
      });

    // ── Compute stats ─────────────────────────────────────────────────────
    const total_votes = vote_history.length;

    let contrarianCount = 0;
    let majorityCount = 0;
    let agreeCount = 0;
    const categoryCounts: Record<string, number> = {};
    const activeDates = new Set<string>();

    for (const v of vote_history) {
      const total = v.total_count;
      if (total > 0) {
        const votedWithMajority =
          (v.yes_count > v.no_count && v.value === 1) ||
          (v.no_count > v.yes_count && v.value === -1);
        if (votedWithMajority) majorityCount++;
        else contrarianCount++;
      }
      if (v.value === 1) agreeCount++;
      categoryCounts[v.category] = (categoryCounts[v.category] ?? 0) + 1;
      activeDates.add(v.voted_at.substring(0, 10));
    }

    const contrarian_score = total_votes > 0
      ? Math.round((contrarianCount / total_votes) * 1000) / 10
      : 0;
    const majority_pct = total_votes > 0
      ? Math.round((majorityCount / total_votes) * 100)
      : 0;
    const minority_pct = total_votes > 0
      ? Math.round((contrarianCount / total_votes) * 100)
      : 0;
    const agree_pct = total_votes > 0
      ? Math.round((agreeCount / total_votes) * 100)
      : 0;
    const days_active = activeDates.size;

    let top_category: string | null = null;
    let topCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > topCount) {
        topCount = count;
        top_category = cat;
      }
    }
    const top_category_pct = total_votes > 0 && topCount > 0
      ? Math.round((topCount / total_votes) * 100)
      : 0;

    const actual_lean = insights?.political_actual ?? null;

    console.log(`[personal-board] userId=${userId} total_votes=${total_votes} done in ${Date.now() - start}ms`);

    return json({
      vote_history,
      stats: {
        total_votes,
        total_comments,
        total_opinion_votes,
        contrarian_score,
        top_category,
        top_category_pct,
        actual_lean,
        majority_pct,
        minority_pct,
        agree_pct,
        days_active,
      },
      insights,
      vote_count_at_generation: insights?.vote_count_at_generation ?? 0,
      user_profile,
    });
  } catch (err) {
    console.error("[personal-board]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
