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

    // ── Parallel: vote history + insights ────────────────────────────────
    const [voteResult, insightsResult] = await Promise.all([
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
    const categoryCounts: Record<string, number> = {};

    for (const v of vote_history) {
      const total = v.total_count;
      if (total > 0) {
        const yes_pct = v.yes_count / total;
        const no_pct = v.no_count / total;
        if (v.value === 1 && yes_pct < 0.5) contrarianCount++;
        if (v.value === -1 && no_pct < 0.5) contrarianCount++;
      }
      categoryCounts[v.category] = (categoryCounts[v.category] ?? 0) + 1;
    }

    const contrarian_score = total_votes > 0
      ? Math.round((contrarianCount / total_votes) * 1000) / 10
      : 0;

    let top_category: string | null = null;
    let topCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > topCount) {
        topCount = count;
        top_category = cat;
      }
    }

    const actual_lean = insights?.political_actual ?? null;

    console.log(`[personal-board] userId=${userId} total_votes=${total_votes} done in ${Date.now() - start}ms`);

    return json({
      vote_history,
      stats: {
        total_votes,
        contrarian_score,
        top_category,
        actual_lean,
      },
      insights,
      vote_count_at_generation: insights?.vote_count_at_generation ?? 0,
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
