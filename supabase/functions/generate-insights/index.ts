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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

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

    // ── Fetch vote counts for yes_pct ────────────────────────────────────
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

    // ── Claude insights prompt (SPEC §6.2) ────────────────────────────────
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are an insightful but neutral analyst. Given a user's anonymous voting history
on a debate platform, generate a thoughtful profile of their worldview.

Be observational, not judgmental. Avoid labeling people as good or bad.
Find interesting patterns, tensions, and surprises.
Write in second person ("You tend to...").

Respond ONLY with valid JSON:
{
  "summary": "3-4 sentence plain English worldview summary",
  "contrarian_score": 0.0-1.0,
  "top_insight": "the single most interesting pattern you found",
  "tension": "any apparent contradiction in their votes (or null)",
  "demographic_note": "how their votes compare to their declared demographics",
  "category_breakdown": { "politics": 0.0-1.0, "food": 0.0-1.0 }
}`,
      messages: [
        {
          role: "user",
          content: `User demographics:
Age range: ${profile?.age_range ?? "unknown"}
Region: ${profile?.region ?? "unknown"}
Declared political lean: ${profile?.political_lean ?? 0} (-2=very liberal, +2=very conservative)
Gender: ${profile?.gender ?? "unknown"}

Voting history (${votes.length} votes):
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
      contrarian_score: number;
      top_insight: string;
      tension: string | null;
      demographic_note: string;
      category_breakdown: Record<string, number>;
    };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[generate-insights] JSON parse failed:", jsonMatch[0]);
      return json({ generated: false, insights: null, reason: "parse_error" });
    }

    // ── UPSERT into user_insights ─────────────────────────────────────────
    const insightRow = {
      user_id: userId,
      worldview_summary: parsed.summary,
      contrarian_score: parsed.contrarian_score,
      top_categories: parsed.category_breakdown,
      political_actual: profile?.political_lean ?? null,
      insights_data: {
        top_insight: parsed.top_insight,
        tension: parsed.tension,
        demographic_note: parsed.demographic_note,
        category_breakdown: parsed.category_breakdown,
      },
      last_generated_at: new Date().toISOString(),
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

    // ── Insight Ready notification (fire-and-forget) ──────────────────────
    supabase
      .from('users')
      .select('expo_push_token')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data: userRow }) => {
        const token = userRow?.expo_push_token;
        if (!token) return;
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ token, body: 'We noticed something interesting about how you vote', data: { type: 'insight_ready' } }),
        });
      })
      .catch(() => {});

    console.log(`[generate-insights] done in ${Date.now() - start}ms`);
    return json({ generated: true, insights: upserted });
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
