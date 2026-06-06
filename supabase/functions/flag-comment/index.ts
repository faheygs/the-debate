import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
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

    // ── Parse body ────────────────────────────────────────────────────────
    const { comment_id } = await req.json();
    if (!comment_id || typeof comment_id !== "string") {
      return json({ error: "comment_id required" }, 400);
    }

    // ── Check comment exists and get commenter's user_id ──────────────────
    const { data: comment } = await supabase
      .from("comments")
      .select("id, ai_decision, user_id")
      .eq("id", comment_id)
      .maybeSingle();

    if (!comment) return json({ error: "Comment not found" }, 404);
    if (comment.ai_decision === "blocked") {
      return json({ flagged: true, hidden: true });
    }

    // ── Insert flag (ignore duplicate flags from same user) ───────────────
    const { error: flagError } = await supabase
      .from("comment_flags")
      .insert({ comment_id, flagged_by: userId });

    if (flagError && flagError.code !== "23505") {
      console.error("[flag-comment] Insert failed:", flagError);
      return json({ error: "Failed to flag comment" }, 500);
    }

    // ── Count total flags; auto-hide at 3 ────────────────────────────────
    const { count } = await supabase
      .from("comment_flags")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", comment_id);

    let isNowHidden = false;

    if (count !== null && count >= 3) {
      await supabase
        .from("comments")
        .update({ ai_decision: "blocked" })
        .eq("id", comment_id);

      isNowHidden = true;

      // ── Strike system: check if commenter should be banned ────────────
      const commenterId = comment.user_id;

      const { count: blockedCount } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", commenterId)
        .eq("ai_decision", "blocked");

      if (blockedCount !== null && blockedCount >= 3) {
        await supabase
          .from("users")
          .update({ comment_banned: true })
          .eq("id", commenterId);

        console.log("[flag-comment] User", commenterId, "banned after", blockedCount, "blocked comments");
      }
    }

    return json({ flagged: true, hidden: isNowHidden });
  } catch (err) {
    console.error("[flag-comment]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
