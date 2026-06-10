import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const start = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Support both user JWT (client-triggered) and service role + userId (weekly-check)
    let userId: string;
    const isServiceRole = authHeader.replace("Bearer ", "") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (isServiceRole) {
      const body = await req.json().catch(() => ({}));
      if (!body.userId) return json({ error: "userId required for service role calls" }, 400);
      userId = body.userId;
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (authError || !user) return json({ error: "Unauthorized" }, 401);
      userId = user.id;
    }

    // ── Parallel: vote history, user profile ──────────────────────────────
    const [voteResult, profileResult] = await Promise.all([
      supabase
        .from("votes")
        .select(`
          value,
          poll_id,
          polls(question, category, poll_type, option_a, option_b)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("users")
        .select("age_range, gender, region, political_lean")
        .eq("id", userId)
        .single(),
    ]);

    const voteRows = (voteResult.data ?? []) as Array<{
      value: number;
      poll_id: string;
      polls: {
        question: string;
        category: string;
        poll_type: string;
        option_a: string | null;
        option_b: string | null;
      } | null;
    }>;

    const profile = profileResult.data;

    if (voteRows.length < 5) {
      return json({ generated: false, insights: null, reason: "not_enough_votes" });
    }

    // ── Fetch vote counts for yes_pct ─────────────────────────────────────
    const pollIds = voteRows.map(v => v.poll_id);
    const { data: countRows } = await supabase
      .from("vote_counts")
      .select("poll_id, yes_count, no_count, total_count")
      .in("poll_id", pollIds);

    const countsMap: Record<string, { yes_count: number; total_count: number }> = {};
    for (const row of countRows ?? []) {
      countsMap[row.poll_id] = { yes_count: row.yes_count, total_count: row.total_count };
    }

    const votes = voteRows
      .filter(v => v.polls)
      .map(v => {
        const counts = countsMap[v.poll_id];
        const yes_pct = counts && counts.total_count > 0
          ? Math.round((counts.yes_count / counts.total_count) * 100)
          : 50;
        return {
          category: v.polls!.category,
          question: v.polls!.question,
          value: v.value,
          yes_pct,
        };
      });

    console.log(`[generate-insights] userId=${userId} votes=${votes.length}`);

    // ── Claude insights prompt ────────────────────────────────────────────
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: `You are a sharp, direct analyst. Given anonymous voting data from a debate platform, write a punchy weekly insight about this person's opinion patterns.

Be direct. Be specific. Surprise them. Write in second person ("You...").
No hedging. No filler phrases. Short sentences. Name actual topics they voted on.
Find the most interesting pattern — not the most obvious one.

Return ONLY valid JSON:
{
  "summary": "3-4 sentences. Direct worldview summary. Name real topics. No clichés.",
  "headline": "One sharp sentence — the single most interesting thing about how they vote",
  "observations": ["2-3 short specific observations about their voting patterns, each under 15 words"],
  "tension": "The sharpest contradiction in their votes, as one sentence. null if none.",
  "closer": "One closing line — a question or provocation that makes them think",
  "contrarian_score": 0.0,
  "category_breakdown": {}
}`,
      messages: [
        {
          role: "user",
          content: `Demographics:
Age: ${profile?.age_range ?? "unknown"} | Region: ${profile?.region ?? "unknown"} | Political lean: ${profile?.political_lean ?? 0} (-2=very liberal, +2=very conservative) | Gender: ${profile?.gender ?? "unknown"}

Voting history (${votes.length} votes, most recent first):
${votes.map(v => `- [${v.category}] "${v.question}" → ${v.value === 1 ? "AGREE" : "DISAGREE"} (${v.yes_pct}% agreed globally)`).join("\n")}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[generate-insights] no JSON in Claude response:", raw);
      return json({ generated: false, insights: null, reason: "parse_error" });
    }

    let parsed: {
      summary: string;
      headline: string;
      observations: string[];
      tension: string | null;
      closer: string;
      contrarian_score: number;
      category_breakdown: Record<string, number>;
    };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[generate-insights] JSON parse failed:", jsonMatch[0]);
      return json({ generated: false, insights: null, reason: "parse_error" });
    }

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── UPSERT into user_insights ─────────────────────────────────────────
    const insightRow = {
      user_id: userId,
      worldview_summary: parsed.summary,
      contrarian_score: parsed.contrarian_score,
      top_categories: parsed.category_breakdown,
      political_actual: profile?.political_lean ?? null,
      insights_data: {
        headline: parsed.headline,
        observations: parsed.observations ?? [],
        tension: parsed.tension ?? null,
        closer: parsed.closer,
        category_breakdown: parsed.category_breakdown,
      },
      last_generated_at: now.toISOString(),
      week_start_date: weekStart.toISOString(),
      insight_seen: false,
      vote_count_at_generation: votes.length,
    };

    const { data: upserted, error: upsertError } = await supabase
      .from("user_insights")
      .upsert(insightRow, { onConflict: "user_id" })
      .select("*")
      .single();

    if (upsertError) {
      console.error("[generate-insights] upsert failed:", upsertError);
      return json({ generated: false, insights: null, reason: "db_error" });
    }

    // ── Set insight_badge on user (fire-and-forget) ───────────────────────
    supabase
      .from("users")
      .update({ insight_badge: true })
      .eq("id", userId)
      .then(() => {})
      .catch(() => {});

    // ── Push notification (fire-and-forget) ──────────────────────────────
    supabase
      .from("users")
      .select("expo_push_token")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data: userRow }) => {
        const token = userRow?.expo_push_token;
        if (!token) return;
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            token,
            body: "We noticed something interesting about how you vote",
            data: { type: "insight_ready" },
          }),
        });
      })
      .catch(() => {});

    console.log(`[generate-insights] done in ${Date.now() - start}ms`);
    return json({ generated: true, insight: upserted });
  } catch (err) {
    console.error("[generate-insights]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
