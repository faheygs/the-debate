import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  console.log("[vote-opinion] received request");
  const start = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[vote-opinion] missing auth header");
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authResult = await getAuthenticatedUser(
      authHeader.replace("Bearer ", ""),
      supabase,
    );
    if (!authResult) {
      console.log("[vote-opinion] auth failed");
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = authResult.userId;
    console.log("[vote-opinion] userId:", userId);

    let body: { comment_id?: unknown; value?: unknown };
    try {
      body = await req.json();
    } catch (e) {
      console.error("[vote-opinion] failed to parse request body:", e);
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { comment_id, value } = body;
    console.log("[vote-opinion] body:", JSON.stringify(body));

    if (!comment_id || (value !== 1 && value !== -1)) {
      console.log("[vote-opinion] invalid request — comment_id:", comment_id, "value:", value);
      return json({ error: "Invalid request" }, 400);
    }

    // Check for existing vote
    const { data: existing, error: fetchErr } = await supabase
      .from("opinion_votes")
      .select("id, value")
      .eq("comment_id", comment_id)
      .eq("user_id", userId)
      .maybeSingle();

    console.log("[vote-opinion] existing vote:", JSON.stringify(existing));

    if (fetchErr) {
      console.error("[vote-opinion] fetch existing error:", fetchErr);
      return json({ error: "Failed to read vote" }, 500);
    }

    const action = !existing ? "insert" : existing.value === value ? "delete" : "update";
    console.log("[vote-opinion] action:", action);

    let newUserVote: number | null;

    if (!existing) {
      // No vote — INSERT
      const { error } = await supabase
        .from("opinion_votes")
        .insert({ comment_id, user_id: userId, value });
      if (error) {
        console.error("[vote-opinion] insert error:", error);
        return json({ error: "Failed to record vote" }, 500);
      }
      newUserVote = value as number;
    } else if (existing.value === value) {
      // Same vote — DELETE (toggle off)
      const { error } = await supabase
        .from("opinion_votes")
        .delete()
        .eq("id", existing.id);
      if (error) {
        console.error("[vote-opinion] delete error:", error);
        return json({ error: "Failed to remove vote" }, 500);
      }
      newUserVote = null;
    } else {
      // Different vote — UPDATE
      const { error } = await supabase
        .from("opinion_votes")
        .update({ value })
        .eq("id", existing.id);
      if (error) {
        console.error("[vote-opinion] update error:", error);
        return json({ error: "Failed to update vote" }, 500);
      }
      newUserVote = value as number;
    }

    // Recalculate counts from all votes on this comment
    const { data: allVotes, error: countErr } = await supabase
      .from("opinion_votes")
      .select("value")
      .eq("comment_id", comment_id);

    if (countErr) {
      console.error("[vote-opinion] count error:", countErr);
      return json({ error: "Failed to calculate score" }, 500);
    }

    const votes = allVotes ?? [];
    const upCount = votes.filter((v: { value: number }) => v.value === 1).length;
    const downCount = votes.filter((v: { value: number }) => v.value === -1).length;
    const netScore = upCount - downCount;

    console.log("[vote-opinion] final counts — up:", upCount, "down:", downCount, "net:", netScore);

    const { error: updateErr } = await supabase
      .from("comments")
      .update({ net_score: netScore })
      .eq("id", comment_id);

    if (updateErr) {
      console.error("[vote-opinion] update net_score error:", updateErr);
      return json({ error: "Failed to update score" }, 500);
    }

    console.log(`[vote-opinion] done in ${Date.now() - start}ms`);

    return json({
      success: true,
      net_score: netScore,
      up_count: upCount,
      down_count: downCount,
      user_vote: newUserVote,
    });
  } catch (err: any) {
    console.error("[vote-opinion] FATAL:", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal server error" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
